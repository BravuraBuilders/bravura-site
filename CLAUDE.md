# Bravura Builders website

Marketing landing page for Bravura Builders — Yossi's general contracting business in Alpharetta, GA. Built with **Astro 5**, deployed via **Cloudflare Pages** to **bravurabuilders.com**.

## Repo layout

```
src/
  layouts/Layout.astro          HTML shell, meta/OG tags, Fontsource font imports + preloads
  pages/index.astro             The page: composes the components + boots the engine (~50 lines)
  components/
    Loader.astro                Boot loader (logo + progress bar)
    Nav.astro                   Fixed centered text wordmark
    HeroLogo.astro              Big solid "BRAVURA BUILDERS" intro logo + scroll cue + #softround filter
    Intro.astro                 Sky-gradient panel with procedural SVG clouds (desktop only)
    Journey.astro               The scroll-scrub canvas + captions + progress dots
    Stills.astro                Reduced-motion / fallback still images
    Manifesto.astro             "bravura" definition + pitch
    Contact.astro               Stacked glass CTAs (Call/Text/Email + visible number) + office line
    Footer.astro
  data/rooms.ts                 Room data (copy, frame counts, focusX) + canonical contact info
  lib/journey/                  The scroll-scrub engine (TypeScript)
    config.ts                   EVERY tuning constant, named + documented — edit feel here
    scrub-engine.ts             initJourney(): render loop, canvas fitting, gradients, boot
    frame-store.ts              Bounded lazy load/decode windows for the frame sequences
    captions.ts                 Caption/dot opacity logic
    types.ts, index.ts
  styles/global.css             Brand tokens (CSS vars), base type, wordmark, buttons, Lenis base
public/
  frames/desktop/<room>/frame_NNNN.jpg   Landscape frame sets (exterior, kitchen, bathroom, bedroom)
  og.jpg, robots.txt, favicon.svg
tests/                          Playwright smoke suite (see Verification)
.github/workflows/ci.yml       CI: astro check + eslint + prettier + build + Playwright
```

## How the homepage works (the scroll journey)

The page is a **scroll-scrubbed image-sequence experience** (the Apple-product-page
technique). Four rooms play in order — **Exterior → Kitchen → Bathroom → Bedroom** — each a
wide-angle walkthrough exported to every frame. A single sticky `<canvas>` swaps frames as
you scroll: down flies the camera into the space, up reverses, stopping freezes, and rooms
crossfade into each other. The exterior flies from the lawn to the front door — the "arrival".

- The engine is `src/lib/journey/` (TypeScript modules; Lenis is the only runtime dep).
  `index.astro`'s script is just `initJourney(rooms)`.
- **Frames + fit:** every room uses the `desktop/` (landscape) frames — there are no portrait
  sets. On landscape the frame fills the screen (`cover`, holding `focusX` at centre). On
  **portrait phones** (`html.is-portrait`, set in `resize()`): the intro is hidden and the
  walkthrough IS the top section; the image is cover-cropped into the **bottom half** of the
  screen (`MOBILE_BAND = 0.5`) with the caption in the top half and dots along the bottom.
  The first room's caption is visible from scroll 0. The `.journey-pin` is `100dvh` and the
  canvas fills it, so it tracks the viewport as the mobile URL bar hides/shows — no dark strip.
  The space above the image is a gradient from `--cine-bg` down to the image's top-edge colour,
  sampled live in `render()`. **The exterior is a special case:** it holds a CONSTANT sky colour
  captured at boot and dissolves softly into the image, easing to the live colour + a hard join
  only as the kitchen cross-dissolves in. (`rooms[].top` is documentary only.)
- **Exterior intro (desktop):** room 0 holds the establishing shot (barely drifting, `EST`/
  `EST_DRIFT`) while the hero logo is solid, then plays through to the door; the logo fades out
  by `DOOR` (0.48 of room 0). No digital zoom (it caused lag — removed). Its crossfade starts
  later than the interior rooms (`FADE_EXTERIOR = 0.9` vs `FADE_DEFAULT = 0.82`).
- **Smoothness:** adjacent frames are cross-dissolved by the fractional scroll position.
  **Momentum scroll** via `lenis` — tune `LENIS_OPTIONS` in `config.ts` (`lerp` lower = longer
  glide, `wheelMultiplier` higher = more travel per notch). The canvas tracks Lenis directly
  (no second easing pass — it added lag).
- **Memory/streaming:** frames load compressed per room on demand in a bounded window
  (`LOAD_AHEAD/BEHIND`), and only a sliding window around the playhead is kept decoded
  (`DECODE_AHEAD/BEHIND/PRUNE`) — ~900 frames never blow up RAM. First `BOOT_FRAMES` (18)
  exterior frames load+decode behind the loader; the rest stream. Failed frames warn once
  per URL in the console and the engine draws the nearest loaded neighbour.
- `journey-inner` is `1100vh` (Journey.astro style) — weighted: the exterior gets 2× scroll
  length (`EXTERIOR_WEIGHT`), interiors 1× each.
- `prefers-reduced-motion` / no-canvas falls back to `<Stills />` (4 static images).
  **Keep that fallback working whenever you touch the journey.**
- **Total frame payload ≈ 60 MB** (908 frames, mozjpeg q70). See "Regenerate the frames".

## Safari lessons (hard-won — do not relearn these)

- **Never `getImageData` the display canvas.** It flips Safari to software rendering for the
  session and tanks scroll perf. Pixel sampling maps the on-screen point back to the source
  image and reads a 1×1 offscreen canvas (`sampleAt` in scrub-engine.ts).
- **JPEG over WebP/AVIF for the frames.** Safari decodes JPEG faster; the decode windows are
  tuned around JPEG latency. Re-measure decode times before ever switching formats.
- **Baseline, not progressive JPEG** (mozjpeg defaults to progressive — pass `-baseline`).
  Progressive decodes slower in Safari.
- **The exterior set is decimated to every-other frame** (443 → 222) — full-rate caused a
  room-0 glitch on Safari. The cross-dissolve keeps motion fluid.
- **Bounded load windows, not whole-room loads** — kicking 400 requests at once saturates the
  connection so near-playhead frames arrive late (jank).
- DPR is capped at 1.5 (`DPR_CAP`) to balance sharpness vs decode/GPU load.

## Brand

Tokens live in `src/styles/global.css` (`:root`):

| Token | Value | Where it's used |
|---|---|---|
| `--accent` | `#194F6E` (deep teal) | Scroll-cue accents, links |
| `--accent-deep` | `#062032` (very dark navy) | Scroll chevron |
| `--accent-dark` | `#0F3A52` | (Available; rarely used) |
| `--highlight` | `#B8C8E0` (logo blue) | Caption kickers, active dots, eyebrow, loader fill |
| `--cine-bg` | `#081A28` | Page/theme background (the engine reads this token too) |
| `--ink` | `#0D1B22` | Base body color (mostly unused on the dark page) |

- Heading font: **Playfair Display**; body font: **Inter** — both **self-hosted via Fontsource**
  (imported in `Layout.astro`; Inter 700 + Playfair 500 are preloaded). No Google Fonts CDN.

## Canonical contact info on the site

Single source of truth: the `contact` export in `src/data/rooms.ts`.

- Phone (call + text): **470-504-3420**
- Email: **nano@bravurabuilders.com**
- Address: **11720 Amber Park Dr, Alpharetta GA 30009**

The Contact section shows the number/email inside the stacked glass buttons (action label on
top, destination below) plus an office-address line.

## Edit recipes

### Change room copy (captions) or order
Edit `rooms` in `src/data/rooms.ts` — each entry has `id`, `desktop` (frame count), optional
`focusX`, `kicker`, `title`, `body`. Order in the array = order in the journey. `id` must
match the folder name under `public/frames/desktop/`.

### Tune the scroll feel
Everything is in `src/lib/journey/config.ts`, named and commented: room hold/fade points,
caption timing, streaming/decode windows, Lenis momentum, DPR cap. Journey scroll length is
`height: 1100vh` on `.journey-inner` in `Journey.astro`. After tuning, verify on real Safari.

### Change contact info
Edit the `contact` export in `src/data/rooms.ts`. Everything on the page reads from it.

### Regenerate / replace the frames (new footage)
Extract with ffmpeg (landscape 1600w), then compress with mozjpeg (installed via Homebrew):
```bash
ffmpeg -y -i walkthrough.mp4 -vf "scale=1600:-2" -vsync 0 -q:v 4 /tmp/frames/frame_%04d.jpg
for f in /tmp/frames/*.jpg; do
  /opt/homebrew/opt/mozjpeg/bin/djpeg "$f" \
  | /opt/homebrew/opt/mozjpeg/bin/cjpeg -quality 70 -baseline -optimize \
  > "public/frames/desktop/<room>/$(basename "$f")"
done
```
Camera should fly *into* the space (scroll-down advances frames). Set the room's `desktop`
count in `src/data/rooms.ts` to the new total. If a set is too heavy, decimate to every-other
frame (the cross-dissolve keeps it smooth). The exterior's opening frames feed the intro seam
(`--sky-top` sampled live) — verify the intro→frame blend after replacing room 0.

## Dev commands

```bash
cd ~/Consolidated/Website/bravura-site
npm install                # first time only
npm run dev                # local preview at http://localhost:4321
npm run build              # production build → dist/
npm run preview            # serve dist/ locally
npm run check              # astro check (types)
npm run lint               # eslint
npm run format             # prettier --write
npm test                   # Playwright smoke suite (needs a build first)
npm run verify             # build + test
```

## Verification (run before merging to main)

`tests/smoke.spec.ts` + `tests/reduced-motion.spec.ts` run against chromium (desktop +
375×812 portrait) and **webkit** (closest CI proxy for Safari): boot without console errors,
canvas paints, per-room captions/dots at the weighted midpoints, hero-logo fade, portrait
band + first caption, stills fallback. CI (`.github/workflows/ci.yml`) runs check/lint/
format/build/tests on every push — it verifies only; Cloudflare Pages owns the deploy.
For engine changes, ALSO scroll through on real Safari (the perf traps above are
Safari-specific and Playwright WebKit does not catch all of them) — ideally an iPhone for
the `dvh`/URL-bar behavior.

## Deployment

- **Hosting:** Cloudflare Pages (auto-deploys from the main branch of the GitHub repo,
  `github.com/BravuraBuilders/bravura-site`)
- **Registrar:** Squarespace (domain points to Cloudflare via DNS — registrar stays at Squarespace)
- Build command `npm run build`, output dir `dist/`

After ANY `git push` to main, Cloudflare rebuilds + deploys automatically within ~60 seconds.
No manual step. Work on a branch; merge to main only after `npm run verify` passes.

## Design preferences (things Yossi confirmed during the build)

- **Theme is dark + cinematic.** The page is built around the footage, not a light doc page.
  `--cine-bg` is the base everywhere; the closing gradient starts at the bedroom floor colour
  (`#63503b`, in index.astro's `.closing`).
- Nav is a centered text wordmark (no logo image); it fades out past the journey.
- The theme is: **turn the spaces you use every day into beautifully constructed spaces.**
  Copy should stay in that lane.
- Contact buttons are stacked: action label on top, destination (visible number/email) below.

## What NOT to invent

- Don't add scope copy or claims that weren't there. This is a marketing page but it represents
  Yossi's business — keep claims honest. If unsure about wording, ask.
- The room clips are AI-generated stand-ins for the vibe — treat them as representative, not
  photos of specific Bravura jobs. Swap in real walkthrough footage as jobs finish.
- Keep the reduced-motion `<Stills />` fallback intact whenever you touch the journey.
