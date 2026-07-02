# Bravura Builders website

Marketing landing page for Bravura Builders — Yossi's general contracting business in Alpharetta, GA. Built with **Astro 5**, deployed via **Cloudflare Pages** to **bravurabuilders.com**.

## Repo layout

```
src/
  layouts/Layout.astro      Global styles, font loading, CSS variables (brand colors)
  pages/index.astro         The entire landing page + the scroll-scrub engine (inline <script>/<style>)
public/
  bravura-logo.png          Logo (transparent PNG, light silver-blue — reads on dark bg)
  favicon.svg
  frames/                   Scroll-scrub image sequences (the cinematic hero)
    desktop/<room>/frame_0001.jpg …   landscape sets (exterior, kitchen, bathroom, bedroom)
    mobile/<room>/frame_0001.jpg …    portrait sets  (kitchen, bathroom, bedroom)
                                      exterior is landscape-only; reused on mobile
  work/                     Legacy project photos (no longer referenced by the page)
astro.config.mjs
package.json
```

## How the homepage works (the scroll journey)

The page is a **scroll-scrubbed image-sequence experience** (the Apple-product-page
technique). Four rooms play in order — **Exterior → Kitchen → Bathroom → Bedroom** — each a
wide-angle walkthrough exported to every frame (~192–241 JPEGs). A single sticky `<canvas>`
swaps frames as you scroll: down flies the camera into the space, up reverses, stopping
freezes, and rooms crossfade into each other. The exterior flies from the pool through the
glass doors into the house — the "arrival".

- The whole engine is the inline `<script>` in `src/pages/index.astro` (no libraries).
- **Frames + fit:** every room uses the `desktop/` (landscape) frames. On landscape it fills
  the screen (`cover`). On **portrait phones** (`html.is-portrait`, set in `resize()`): the
  intro is hidden and the walkthrough IS the top section (first scroll scrubs immediately);
  the image is cover-cropped into the **bottom half** of the screen (`MOBILE_BAND = 0.5`,
  moderate side crop, centre kept) with the caption in the top half and dots along the
  bottom. The first room's caption is visible from scroll 0. The `.journey-pin` is `100dvh`
  and the canvas fills it (`width/height:100%`, no manual px), so it tracks the viewport as the
  mobile URL bar hides/shows — no dark strip. The space above the image is a gradient from the
  theme navy down to the image's top-edge colour, sampled live in `render()` (join overlapped
  1px), so interior rooms read as the ceiling continuing up, seamlessly. **The exterior is a
  special case:** its top-edge colour changes wildly as the camera flies from sky into the
  house, so instead it holds a CONSTANT sky colour (`skyTop`, captured once at the start) and
  dissolves that gradient softly into the image over a short transparent overlap — no colour
  drift, no hard seam — easing to the live colour + a hard join only as the kitchen
  cross-dissolves in. (`rooms[].top` is unused.)
- **Seams:** the top no longer needs a sky-blend seam — the canvas fills from the top and the
  exterior establishing shot (its own sky) opens the page under the wordmark knockout (the old
  `.scrim` top sky-fade was removed). The bottom: the last frame stays crisp (no overlay) and
  the `.closing` wrapper (manifesto + contact) is a gradient starting at the **bedroom floor
  colour** (`#63503b`, top) fading down to `--cine-bg` at the page bottom — so the section
  blends into the bottom of the last frame. The canvas bottom scrim was removed so the
  bedroom's floor stays true (captions rely on their text-shadow).
- **Exterior extension:** the exterior clip runs out of frames as the door opens, so in
  `render()` room 0 decelerates into the door (ease-out) then holds the last frame and
  applies a digital `zoom` (→1.22) to extend the living-room reveal; its crossfade starts
  later (`FADE = 0.9`). `drawCover(img, fx, contain, zoom)` takes the zoom factor. Per-room counts live in
  `rooms[]` (`desktop`). The `mobile/` portrait sets are **unused** (safe to delete, ~56 MB).
  Exterior frames have a baked-in cool colour grade (PIL) to match the interiors.
- **Smoothness:** adjacent frames are cross-dissolved by the fractional scroll position
  (continuous glide, not frame-stepping). **Momentum scroll** via `lenis` (npm dep) — one
  flick coasts and eases out (kills mouse-wheel "braking"); tune in the `new Lenis({...})`
  call (`lerp` lower = longer glide, `wheelMultiplier` higher = more travel per notch).
  The canvas tracks Lenis's scroll directly (no second easing pass).
- **Framing:** a room can set `focusX` (0–1 image fraction held at screen centre) in
  `rooms[]` — used so the exterior's roof peak lines up under the scroll arrow (`0.485`).
- **Memory/streaming:** frames load compressed per room on demand; only a sliding window
  around the playhead is kept decoded (`decodeWindow`), so ~1,500 high-res frames never
  blow up RAM. First ~18 exterior frames load+decode behind the loader; the rest stream.
- `journey-inner` is `880vh` (≈220vh of scroll per room). Sticky `journey-pin` holds canvas.
- `prefers-reduced-motion` / no-canvas falls back to `<section class="stills">` (4 static
  desktop images). Keep that fallback working.
- **Total frame payload ≈ 129 MB** (73 MB desktop + 56 MB mobile). Heavy — a full
  scroll-through downloads its set. To trim, re-extract fewer frames / lower res (below).

## Brand

| Token | Value | Where it's used |
|---|---|---|
| `--accent` | `#194F6E` (deep teal) | "Built with Bravura", h1 italic, vertical separator bars |
| `--accent-deep` | `#062032` (very dark navy) | Button text, "Reach Out for a Free Quote" text |
| `--accent-dark` | `#0F3A52` | (Available; rarely used now) |
| `--highlight` | `#B8C8E0` (logo blue) | Button default bg, highlight pill, hover states |
| `--ink` | `#0D1B22` | Body / default heading color |
| `--bg` | `#FAF8F5` | Page background |

- Heading font: **Playfair Display** (Google Fonts)
- Body font: **Inter** (Google Fonts)

## Canonical contact info on the site

- Phone (call + text): **470-504-3420**
- Email: **nano@bravurabuilders.com**
- Address: **11720 Amber Park Dr, Alpharetta GA 30009** (no Ste/PMB — those were removed)

## Page sections (top → bottom of `index.astro`)

1. **Loader** — centered logo + progress bar; covers the page until the first exterior frames load
2. **Nav** — fixed centered **text wordmark** ("Bravura" in Playfair + spaced "BUILDERS"; `.wordmark`), soft dark halo behind it; fades out past the journey. (The old `bravura-logo.png` is no longer used.)
3. **Intro** (desktop) — there is no separate intro section anymore. The journey canvas fills the screen from the top; room 0 opens on the exterior establishing shot with a big centred **solid-white "BRAVURA BUILDERS" wordmark** — a fixed DOM element (`.hero-logo` / `#heroLogo`, two `<span>`s clipped to Inter), not composited on the canvas. It holds solid through the establishing shot (`EST` ≈ 0.07 of room 0) then fades its opacity to 0 by the front door (`DOOR` ≈ 0.48); the same `logoOp` fades the "Scroll to walk through" cue in step and fades the nav wordmark + progress rail *in* as it clears. A subtle SVG filter (`#softround`: tiny `feGaussianBlur` + `feColorMatrix` alpha threshold) rounds the sharp Inter corners a hair while keeping strokes crisp. Desktop-only (`!portrait`); hidden on portrait phones. (Earlier iterations used a canvas knockout, then a translucent "liquid glass" gradient fill — both replaced by the current solid white.)
4. **Journey** — the scroll-scrub canvas: Exterior → Kitchen → Bath → Bedroom, each with a caption (kicker / title / body) and a 4-dot progress rail
5. **Stills** — reduced-motion / no-JS fallback (hidden when the scrub is active)
6. **Manifesto** — the "bravura" definition + the written-scope / single-point-of-contact pitch
7. **Contact** — dark, centered, minimal; three **liquid-glass** CTA buttons (`.glass-btn`: Call/Text/Email us, wired to tel:/sms:/mailto: but no numbers/emails shown) + a subtle office-address line

## Edit recipes

### Change room copy (captions) or order
Edit the `const rooms = [...]` array in the `index.astro` frontmatter — each entry has
`id`, `desktop`/`mobile` frame counts, `kicker`, `title`, `body`. Order in the array = order
in the journey. `id` must match the folder name under `public/frames/desktop|mobile/`.

### Regenerate / replace the frames (new footage)
Frames are extracted with `ffmpeg`, **every frame** for max smoothness. Landscape → `desktop/`,
portrait → `mobile/`. Camera should fly *into* the space (scroll-down advances frames).
```bash
# desktop (landscape) 1600w:
ffmpeg -y -i landscape.mp4 -vf "scale=1600:-2" -vsync 0 -q:v 4 public/frames/desktop/<room>/frame_%04d.jpg
# mobile (portrait) 900w:
ffmpeg -y -i portrait.mp4  -vf "scale=900:-2"  -vsync 0 -q:v 4 public/frames/mobile/<room>/frame_%04d.jpg
```
After extracting, set that room's `desktop`/`mobile` counts in `rooms[]` to the new frame
totals (they can differ per orientation). The exterior is landscape-only (`exteriorBoth: true`)
and lives only in `desktop/`. If the first room changes, re-tune the intro→first-frame seam
color (intro `background` bottom stop + `.scrim` top gradient) to that frame's top-edge color.
To shrink the ~129 MB payload: take every 2nd frame (`-vf "select='not(mod(n\,2))',scale=..."`,
`-vsync 0`) and/or lower `scale` — the cross-dissolve keeps it smooth with fewer frames.

### Change contact info
Edit the `phone`, `phoneHref`, `email`, `emailHref`, `smsHref`, and `address` constants at the top of `index.astro`.

### Tune the scroll feel
In the inline `<script>`: `journey-inner`'s `720vh` (in `<style>`) sets how much scroll each
room takes; the `cur += (target - cur) * 0.14` line controls easing/smoothness; `FADE = 0.82`
sets where the crossfade to the next room begins.

## Dev commands

```bash
cd ~/Sites/bravura-site
npm install               # first time only
npm run dev               # local preview at http://localhost:4321
npm run dev -- --host     # also accessible from phone on same WiFi
npm run build             # production build → dist/
```

## Deployment

- **Hosting:** Cloudflare Pages (auto-deploys from the main branch of the GitHub repo)
- **Registrar:** Squarespace (domain points to Cloudflare via DNS — registrar stays at Squarespace)
- **CI:** none beyond Cloudflare's build pipeline; build command is `npm run build`, output dir is `dist/`

After ANY `git push` to main, Cloudflare rebuilds + deploys automatically within ~60 seconds. No manual step.

## Design preferences (things Yossi confirmed during the build)

- **Theme is dark + cinematic.** The page is built around the footage, not a light doc page.
  `--cine-bg` (`#081a28`) is the base; the intro, journey, manifesto, and footer all sit on it. Contact is the deep-teal `--accent`.
- Logo centered at the top, no wordmark text next to it (the logo already contains "Bravura Builders LLC"); it fades out past the journey so it never overlaps copy.
- The theme is: **turn the utility spaces you use every day (kitchen, bath, laundry) into beautifully constructed spaces.** Copy should stay in that lane.
- Room order in the journey is Kitchen → Bath → Laundry; each camera flies *into* the room.
- Contact section buttons are stacked: action label on top, destination below.

## What NOT to invent

- Don't add scope copy or claims that weren't there. This is a marketing page but it represents Yossi's business — keep claims honest. If unsure about wording, ask.
- The three room clips are AI-generated stand-ins for the vibe — treat them as representative, not photos of specific Bravura jobs. Swap in real walkthrough footage as jobs finish (see "Regenerate the frames").
- Keep the reduced-motion `.stills` fallback intact whenever you touch the journey.
