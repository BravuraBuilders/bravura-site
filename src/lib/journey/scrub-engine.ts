// The scroll-scrub engine: a sticky canvas swaps walkthrough frames as you
// scroll. Down flies the camera into the space, up reverses, stopping freezes,
// and rooms crossfade into each other. Mechanically extracted from the inline
// <script> in index.astro — behavior-identical; tuning lives in ./config.
import Lenis from 'lenis';
import { createCaptionUpdaters } from './captions';
import {
  BACKLOAD_BEFORE,
  BOOT_FRAMES,
  BOOT_TIMEOUT_MS,
  DOOR,
  DPR_CAP,
  EST,
  EST_DRIFT,
  EXTERIOR_WEIGHT,
  FADE_DEFAULT,
  FADE_EXTERIOR,
  INDOOR_SPAN,
  INDOOR_START,
  LENIS_OPTIONS,
  LOADER_REMOVE_MS,
  MOBILE_BAND,
  ORIENTATION_DELAY_MS,
  PORTRAIT_OVERLAP,
  RESIZE_DEBOUNCE_MS,
  SKY_BLEND_HEIGHT,
  SKY_FADE_SPAN,
  SKY_SAMPLE_BEFORE,
} from './config';
import { createFrameStore } from './frame-store';
import type { DrawGeometry, RoomData, ViewRoom } from './types';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

type RGB = [number, number, number];

export function initJourney(rooms: RoomData[]): void {
  const ROOMS = rooms;
  const N_ROOMS = ROOMS.length;

  // Per-room scroll weighting: the exterior is ~2× the footage (arrival +
  // living-room pan), so it gets ~2× the scroll length to keep the pace
  // consistent with the interior rooms.
  const ROOM_WEIGHTS = ROOMS.map((_r, i) => (i === 0 ? EXTERIOR_WEIGHT : 1));
  const WSUM = ROOM_WEIGHTS.reduce((a, b) => a + b, 0);
  const WCUM: number[] = [];
  {
    let a = 0;
    for (const w of ROOM_WEIGHTS) {
      WCUM.push(a);
      a += w;
    }
  }
  function progressToCur(p: number): number {
    const x = p * WSUM;
    let room = 0;
    while (room < N_ROOMS - 1 && x >= WCUM[room] + ROOM_WEIGHTS[room]) room++;
    const local = (x - WCUM[room]) / ROOM_WEIGHTS[room];
    return room + Math.max(0, Math.min(1, local));
  }

  const canvas = document.getElementById('frameCanvas') as HTMLCanvasElement | null;
  const journey = document.getElementById('journey');
  const inner = journey ? journey.querySelector<HTMLElement>('.journey-inner') : null;
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const captions = Array.from(document.querySelectorAll<HTMLElement>('.caption'));
  const dots = Array.from(document.querySelectorAll('.progress-dot'));
  const scrollCue = document.getElementById('scrollCue');
  const rail = document.querySelector<HTMLElement>('.progress-rail');

  // Fade the centered logo out once the journey is behind us.
  const nav = document.querySelector<HTMLElement>('.nav');
  function updateNav(): void {
    if (!nav || !journey) return;
    const journeyBottom = journey.offsetTop + journey.offsetHeight;
    nav.classList.toggle('nav--hidden', window.scrollY > journeyBottom - window.innerHeight * 0.5);
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  const prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (prefersReduced || !canvas || !ctx) {
    document.documentElement.classList.add('no-scrub');
    if (loader) loader.remove();
    return;
  }
  document.documentElement.classList.add('has-scrub');

  // ---- frames + fit mode --------------------------------------------------
  // Every room uses the same desktop (landscape) frames. On portrait phones we
  // don't crop the sides — we fit the full frame to the width and letterbox
  // (contain); on landscape we fill the screen (cover).
  let portrait: boolean, view: ViewRoom[];
  const hexToRgb = (h: string): RGB => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const mix = (a: RGB, b: RGB, t: number): RGB =>
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map((v) =>
      Math.round(v),
    ) as RGB;
  function buildView(): void {
    portrait = window.innerHeight > window.innerWidth;
    view = ROOMS.map((r) => ({
      id: r.id,
      count: r.desktop,
      focusX: r.focusX,
      top: hexToRgb(r.top || '#3a4a55'),
    }));
  }
  buildView();
  view = view!;
  portrait = portrait!;

  const store = createFrameStore(view);
  const { imgs, ensure, loadWindow, frameOrNearest, decodeWindow } = store;

  // ---- canvas sizing -----------------------------------------------------
  let vw = 0,
    vh = 0,
    dpr = 1;
  function resize(): void {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    // Let CSS size the canvas to fill the pin (100dvh) so it tracks the viewport as the
    // mobile URL bar hides/shows — no dark strip, no manual pixel sizing to fight it.
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    // portrait: image band is anchored to the bottom; publish its height so the
    // caption can sit directly above it (no floating empty bands).
    const root = document.documentElement;
    if (portrait) {
      root.classList.add('is-portrait');
      root.style.setProperty('--band-h', vh * MOBILE_BAND + 'px');
    } else {
      root.classList.remove('is-portrait');
    }
    needsDraw = true;
  }
  function drawCover(
    img: HTMLImageElement | null,
    fx: number | undefined,
    contain: boolean,
    zoom?: number,
  ): DrawGeometry | undefined {
    if (!img || !canvas || !ctx) return;
    zoom = zoom || 1;
    const cw = canvas.width,
      ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight;
    let dw: number, dh: number, ox: number, oy: number;
    if (contain) {
      // fill the bottom ~half of the screen: cover a bottom band region, cropping
      // the sides moderately (keeps the centre of each shot). Caption sits above.
      const bandH = ch * MOBILE_BAND;
      if (cw / bandH > ir) {
        dw = cw;
        dh = cw / ir;
      } else {
        dh = bandH;
        dw = bandH * ir;
      }
      dw *= zoom;
      dh *= zoom;
      ox = (cw - dw) / 2;
      oy = ch - bandH + (bandH - dh) / 2; // zoom toward the band centre (overflow hidden by the top gradient)
    } else {
      // cover: fill the screen, holding the focus point at centre (clamped)
      const cr = cw / ch;
      if (cr > ir) {
        dw = cw;
        dh = cw / ir;
      } else {
        dh = ch;
        dw = ch * ir;
      }
      dw *= zoom;
      dh *= zoom;
      fx = fx == null ? 0.5 : fx;
      ox = Math.min(0, Math.max(cw - dw, cw * 0.5 - fx * dw));
      oy = Math.min(0, Math.max(ch - dh, (ch - dh) / 2));
    }
    ctx.drawImage(img, ox, oy, dw, dh);
    return { ox, oy, dw, dh };
  }

  // Sample a single pixel WITHOUT reading from the display canvas — reading the GPU-backed
  // display canvas (getImageData) makes Safari fall back to software rendering for the rest
  // of the session, which tanks scroll perf. Instead map the on-screen point back to the
  // source image and read it from a 1×1 offscreen canvas.
  const sampler = document.createElement('canvas');
  sampler.width = sampler.height = 1;
  const sctx = sampler.getContext('2d', { willReadFrequently: true });
  function sampleAt(
    img: HTMLImageElement | null,
    geom: DrawGeometry | undefined,
    cx: number,
    cy: number,
  ): Uint8ClampedArray | null {
    if (!img || !geom || !sctx) return null;
    const sx = Math.max(
      0,
      Math.min(img.naturalWidth - 1, ((cx - geom.ox) / geom.dw) * img.naturalWidth),
    );
    const sy = Math.max(
      0,
      Math.min(img.naturalHeight - 1, ((cy - geom.oy) / geom.dh) * img.naturalHeight),
    );
    sctx.drawImage(img, sx, sy, 1, 1, 0, 0, 1, 1);
    return sctx.getImageData(0, 0, 1, 1).data;
  }

  function scrollProgress(): number {
    if (!inner) return 0;
    const scrollable = inner.offsetHeight - vh;
    if (scrollable <= 0) return 0;
    return Math.min(1, Math.max(0, -inner.getBoundingClientRect().top / scrollable));
  }

  let cur = 0,
    prevCur = 0,
    running = false,
    needsDraw = true,
    lastSig = '';
  let skyTop: RGB | null = null; // captured once: the exterior's opening sky colour, held constant (mobile gradient)

  // ---- desktop intro: a SOLID "BRAVURA BUILDERS" logo (fixed & centred, DOM element) rides
  //      over the sky section and down onto the establishing house shot, then fades out as the
  //      camera pans toward the front door. All fade/hold timing is by exterior `local`.
  const heroLogo = document.getElementById('heroLogo');
  let skySampled = false; // once true, --sky-top matches the first frame's sky (seamless seam)
  let skyArr: RGB | null = null; // [r,g,b] of that sky, for the canvas-top blend

  const { updateCaptions, updateDots } = createCaptionUpdaters(captions, dots, N_ROOMS);

  function render(): void {
    if (!canvas || !ctx) return;
    const maxRoom = N_ROOMS - 1;
    const room = Math.min(maxRoom, Math.max(0, Math.floor(cur)));
    let local = cur - room;
    if (local < 0) local = 0;
    if (local > 1) local = 1;

    const N = view[room].count;
    // The exterior clip runs out of frames just as the door opens, so for that
    // room we hold the establishing shot while the logo is up, then play
    // straight through the original clip to the door — no digital zoom (it caused lag).
    let ff: number;
    const zoom = 1;
    if (room === 0) {
      if (!portrait && local <= EST) {
        ff = (local / EST) * EST_DRIFT * (N - 1);
      } else {
        const s = portrait ? 0 : EST,
          d = portrait ? 0 : EST_DRIFT;
        const p = (local - s) / (1 - s);
        ff = (d + (1 - d) * p) * (N - 1);
      }
    } else {
      ff = local * (N - 1);
    }
    let i = Math.floor(ff),
      f = ff - i;
    if (i >= N - 1) {
      i = N - 1;
      f = 0;
    }

    const FADE = room === 0 ? FADE_EXTERIOR : FADE_DEFAULT; // hold the living room longer before crossfading
    const nextAlpha = local > FADE && room < maxRoom ? (local - FADE) / (1 - FADE) : 0;

    // stream a bounded window around the playhead + the next room's opening for the
    // crossfade; keep a decoded window around the playhead
    const streamDir = cur - prevCur >= 0 ? 1 : -1;
    loadWindow(room, i, streamDir);
    loadWindow(room + 1, 0, 1);
    if (local < BACKLOAD_BEFORE && room > 0) loadWindow(room - 1, view[room - 1].count - 1, -1);
    decodeWindow(room, i, streamDir);
    if (nextAlpha > 0) {
      ensure(room + 1, 0);
      ensure(room + 1, 1);
    }

    // desktop intro logo: solid while the establishing shot holds, then fades out ~by the door.
    // (Applied to DOM here, before the canvas early-return, so it tracks scroll every frame.)
    let logoOp = 0;
    if (!portrait && room === 0) {
      logoOp = local <= EST ? 1 : 1 - (local - EST) / (DOOR - EST);
      logoOp = Math.max(0, Math.min(1, logoOp));
    }
    if (heroLogo) heroLogo.style.opacity = logoOp.toFixed(3);
    if (scrollCue) scrollCue.style.opacity = logoOp.toFixed(3);
    if (nav) nav.style.opacity = !portrait && room === 0 ? (1 - logoOp).toFixed(3) : '';
    if (rail) rail.style.opacity = !portrait && room === 0 ? (1 - logoOp).toFixed(3) : '';

    const sig =
      room + ':' + i + ':' + f.toFixed(3) + ':' + nextAlpha.toFixed(3) + ':' + zoom.toFixed(3);
    if (sig === lastSig && !needsDraw) return;
    const base = frameOrNearest(room, i);
    if (!base) {
      needsDraw = true;
      return;
    } // hold last frame until something loads
    lastSig = sig;
    needsDraw = false;

    const fx = view[room].focusX;
    ctx.globalAlpha = 1;
    const baseGeom = drawCover(base, fx, portrait, zoom);
    if (f > 0.001) {
      const nxt = frameOrNearest(room, i + 1);
      if (nxt) {
        ctx.globalAlpha = f;
        drawCover(nxt, fx, portrait, zoom);
        ctx.globalAlpha = 1;
      }
    }
    if (nextAlpha > 0) {
      const nr = frameOrNearest(room + 1, 0);
      if (nr) {
        ctx.globalAlpha = nextAlpha;
        drawCover(nr, view[room + 1].focusX, portrait);
        ctx.globalAlpha = 1;
      }
    }
    // Sample the establishing frame's top sky pixel once and feed it to the intro gradient's
    // bottom stop (--sky-top), so the seam where the sky panel meets the first frame blends
    // perfectly (sky-on-sky, no visible line).
    if (!portrait && room === 0 && !skySampled && local < SKY_SAMPLE_BEFORE) {
      const sp = sampleAt(base, baseGeom, canvas.width >> 1, 2);
      if (sp && sp[3] > 0) {
        skySampled = true;
        skyArr = [sp[0], sp[1], sp[2]];
        document.documentElement.style.setProperty('--sky-top', `rgb(${sp[0]},${sp[1]},${sp[2]})`);
      }
    }
    // Blend the canvas's very top to the flat sky colour (matching the intro panel's bottom) so
    // the seam is perfect even though the photo's sky varies across the width; fades as we pan up.
    if (!portrait && room === 0 && skyArr) {
      const fade = local <= EST ? 1 : Math.max(0, 1 - (local - EST) / SKY_FADE_SPAN);
      if (fade > 0) {
        const h = Math.round(canvas.height * SKY_BLEND_HEIGHT);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, `rgba(${skyArr[0]},${skyArr[1]},${skyArr[2]},${fade})`);
        g.addColorStop(1, `rgba(${skyArr[0]},${skyArr[1]},${skyArr[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, h);
      }
    }
    // portrait: fill the area above the bottom image band with a gradient from the
    // theme navy down to the image's own top-edge colour — so the space reads as
    // sky/ceiling and shifts to match whichever room is on screen.
    if (portrait) {
      // Fill the area above the band with a gradient from the theme navy down to the
      // image's top-edge colour, overlapping the join 1px to kill any sub-pixel gap.
      const bandTop = Math.round(canvas.height * (1 - MOBILE_BAND));
      const s = sampleAt(
        base,
        baseGeom,
        canvas.width >> 1,
        Math.min(canvas.height - 1, bandTop + 1),
      ) || [0, 0, 0, 0];
      if (room === 0) {
        // The exterior flies from open sky into the house, so its top-edge colour changes
        // wildly (sky → facade → interior) — a live sample would drift the whole room and a
        // flat colour would seam against the dark facade. Instead hold a CONSTANT sky
        // gradient and let it dissolve softly into the image over a short overlap: no colour
        // drift, no hard line. Ease to the live colour + a hard join only as the kitchen
        // cross-dissolves in, so it hands off cleanly to the next room.
        if (skyTop === null && local < 0.1) skyTop = [s[0], s[1], s[2]];
        const held = skyTop || ([s[0], s[1], s[2]] as RGB);
        const live: RGB = [s[0], s[1], s[2]];
        // Hold the sky during the outdoor approach; once we pass the doorway into the living
        // room, ease to the live ceiling colour (like the interior rooms). Also blend on the
        // kitchen cross-dissolve.
        const indoor = Math.max(0, Math.min(1, (local - INDOOR_START) / INDOOR_SPAN));
        let sky = mix(held, live, indoor);
        if (nextAlpha > 0) sky = mix(sky, live, nextAlpha);
        const overlap =
          Math.round(canvas.height * PORTRAIT_OVERLAP * (1 - nextAlpha) * (1 - indoor)) + 1;
        const g = ctx.createLinearGradient(0, 0, 0, bandTop + overlap);
        g.addColorStop(0, '#081a28');
        g.addColorStop(bandTop / (bandTop + overlap), `rgb(${sky[0]},${sky[1]},${sky[2]})`);
        g.addColorStop(1, `rgba(${sky[0]},${sky[1]},${sky[2]},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, bandTop + overlap);
      } else {
        const bot = [s[0], s[1], s[2]]; // interior rooms: live sample, hard join (matches top, seamless)
        const g = ctx.createLinearGradient(0, 0, 0, bandTop + 1);
        g.addColorStop(0, '#081a28');
        g.addColorStop(1, `rgb(${bot[0]},${bot[1]},${bot[2]})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, bandTop + 1);
      }
    }
    // (The last frame stays crisp; the section below fades up into it — see the
    //  .manifesto top gradient in CSS — so the image is never dissolved to a flat colour.)
    updateCaptions(room, local, nextAlpha, logoOp);
    updateDots(cur);
  }

  function tick(): void {
    if (!running) return;
    // Lenis already smooths the scroll position with momentum, so the canvas
    // tracks it directly (no second easing pass, which would add lag).
    prevCur = cur;
    cur = progressToCur(scrollProgress());
    render();
    requestAnimationFrame(tick);
  }

  // ---- boot: load + decode the first frames of room 0, then reveal -------
  async function boot(): Promise<void> {
    loadWindow(0, 0, 1);
    const need = Math.min(view[0].count, BOOT_FRAMES);
    await new Promise<void>((resolve) => {
      let done = false;
      const check = () => {
        if (done) return;
        let ready = 0;
        for (let i = 0; i < need; i++) if (imgs[0][i]) ready++;
        if (loaderFill) loaderFill.style.width = (ready / need) * 100 + '%';
        if (ready >= need) {
          done = true;
          resolve();
        } else requestAnimationFrame(check);
      };
      check();
      setTimeout(() => {
        if (!done) {
          done = true;
          resolve();
        }
      }, BOOT_TIMEOUT_MS); // safety
    });
    await Promise.all(
      imgs[0]
        .slice(0, need)
        .filter((im): im is HTMLImageElement => Boolean(im))
        .map((im) => im.decode().catch(() => {})),
    );
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), LOADER_REMOVE_MS);
    }
    resize();
    // Momentum smooth-scroll: one flick coasts and eases out, so the wheel no
    // longer "brakes" between notches. lerp lower = longer glide.
    const lenis = new Lenis(LENIS_OPTIONS);
    window.__lenis = lenis;
    function lraf(t: number) {
      lenis.raf(t);
      requestAnimationFrame(lraf);
    }
    requestAnimationFrame(lraf);
    running = true;
    requestAnimationFrame(tick);
  }

  function onViewportChange(): void {
    buildView(); // same frames in both orientations; only the fit (cover/contain) changes
    resize(); // sets needsDraw
  }
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onViewportChange, RESIZE_DEBOUNCE_MS);
  });
  window.addEventListener('orientationchange', () =>
    setTimeout(onViewportChange, ORIENTATION_DELAY_MS),
  );

  boot();
}
