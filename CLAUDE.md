# Bravura Builders website

Marketing site for Bravura Builders — Yossi's design-build general contracting business in
Alpharetta / metro Atlanta. Built with **Astro 5**, deployed via **Cloudflare Pages** to
**bravurabuilders.com**.

> Redesigned 2026-07 ("Blueprint"). The previous site was a single-page scroll-scrubbed
> image-sequence "Journey"; it has been fully replaced by the multi-page site described below.
> If you find references to `lib/journey`, `Stills`, `HeroLogo`, room frames, or Lenis, they are
> stale — that code is gone.

## What the site is

A six-page marketing site with one job: **generate leads** (free construction estimates + paid
design engagements). Dark, architectural "blueprint" aesthetic — navy, powder blue, warm paper.

```
/              Home — hero, two-door services, featured work, reviews, CTA
/construction  Construction services + 4-step process
/design        In-House Design (paid), renderings, working-model gallery, model→built pairs
/projects      Filterable portfolio grid (photo groups as sliders) + renderings
/about         Founder story (Joseph Kievman) + credentials
/contact       Estimate request form + reach details
```

## Repo layout

```
src/
  layouts/Layout.astro       HTML shell: meta/OG/canonical, Inter (Fontsource) + preloads,
                             skip-link, <Header/>, <main>, <Footer/>, the lightbox dialog,
                             and the one client script.
  components/
    Header.astro             Sticky glass header; fluid nav that reflows at every width;
                             sets aria-current from Astro.url.pathname.
    Footer.astro             Static footer (logo, explore links, contact).
  pages/*.astro              One file per route; each wraps its sections in <Layout>.
  scripts/site.js            ALL front-end behavior, guarded by element checks so it is safe
                             on every page: scroll reveals, scroll-scrubbed stat counters,
                             hero glow parallax, photo-group sliders, project filters, the
                             image lightbox (focus-trapped), and the contact-form submit.
  styles/global.css          The whole design system — CSS-variable tokens + every component
                             style. Single source of truth for color, type, spacing, shape.
public/
  img/projects/*.jpg         25 real completed-project photos (1600px, q78)
  img/renders/*.jpg          15 design renderings + working 3D models
  img/logo.png               Transparent logo lockup
  favicon.svg, og.jpg, robots.txt
tests/                       Playwright smoke + reduced-motion specs
.github/workflows/ci.yml     CI: astro check + eslint + prettier + build + Playwright
```

## Brand tokens (edit in `src/styles/global.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--paper` / `--paper-2` | `#F5F2EA` / `#EDE9DD` | Light section backgrounds |
| `--navy` / `--navy-2` / `--navy-3` | `#16283C` / `#1D3450` / `#0F1D2E` | Dark sections, ink, footer |
| `--blue` | `#BCD5E5` | Powder-blue accent (fills, active nav) |
| `--blue-deep` | `#3E6787` | Accent text on light (AA-safe) |
| `--ink` / `--ink-soft` | `#1A2836` / `#4C5A68` | Body text |
| `--gutter` | `clamp(28px,6vw,84px)` | Page margins (scale with viewport — do not hardcode) |

- Font: **Inter** across the board (headings 800, body 400/600), self-hosted via **Fontsource**
  (imported + preloaded in `Layout.astro`). No Google Fonts CDN. Playfair is no longer used.
- Copy rule: **no em/en dashes anywhere** — use periods, commas, or colons. Stats spelled out
  (e.g. `150,000 ft.²`, not `150K sq ft`).

## Key content facts (keep accurate — these represent a real business)

- Tagline (Yossi-authored, do not change without asking): **"Technical Skill, Brilliant Design,
  Flawless Results."**
- Hero stats: `4 years senior project management, Manhattan Construction` · `120+ units
  renovated` · `150,000 ft.² delivered`. Numbers are real/confirmed.
- Reviews (Home): two real Google reviews (Ariel, Abe) + a "see all on Google" card. **Never
  fabricate reviews** — add only real ones Yossi supplies.
- Contact: phone **470-504-3420** (call + text), email **yossi@bravurabuilders.com**, office
  **11720 Amber Park Dr, Ste 160 PMB 1157, Alpharetta GA 30009**. Do NOT use the personal cell.
- Design is sold as a **paid, standalone** service (kept even if the client doesn't build with
  Bravura) — the pricing distinction (construction estimate = free) must stay clear.

## Contact form backend

The `/contact` form posts to **Web3Forms** (static-friendly, spam-filtered, no server code).
It reads a public access key from `PUBLIC_WEB3FORMS_KEY` (env). Until that's set, the form shows
a "not connected yet" notice instead of submitting (see `submit` handler in `src/scripts/site.js`).
To enable: create a free Web3Forms account for `yossi@bravurabuilders.com`, then set
`PUBLIC_WEB3FORMS_KEY` in the Cloudflare Pages project env (and `.env` locally). A `botcheck`
honeypot field is included.

## Front-end behavior notes

- `site.js` runs on every page (module script, deferred); every block guards on the elements it
  needs, so pages without a gallery/form/stats simply skip those blocks.
- Stat counters **start at 0** and count up tied to scroll position (Yossi's explicit choice);
  under `prefers-reduced-motion` they render final values immediately.
- Reveals, slider arrows, counters, and the lightbox all no-op or show final state under reduced
  motion. Keep that intact.
- The lightbox is a focus-trapped `role="dialog"`; Escape closes and returns focus.

## Dev commands

```bash
cd ~/Consolidated/Website/bravura-site
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview    # serve dist/
npm run check      # astro check (types)
npm run lint       # eslint
npm run format     # prettier --write
npm test           # Playwright (build first)
npm run verify     # build + test
```

## Verification (run before merging to main)

`tests/smoke.spec.ts` (every route boots error-free with the right title/heading + landmarks;
nav reaches all pages; hero stats count up; projects filter + lightbox; contact form fields) and
`tests/reduced-motion.spec.ts` run on chromium desktop + portrait and **webkit** (Safari proxy).
CI runs check/lint/format/build/tests on every push; it verifies only — Cloudflare Pages owns the
deploy.

## Deployment

- **Hosting:** Cloudflare Pages, auto-deploys from **main** of
  `github.com/BravuraBuilders/bravura-site`. Build `npm run build`, output `dist/`.
- **Registrar:** Squarespace (DNS points to Cloudflare).
- Work on a branch; merge to main only after `npm run verify` passes. Any push to main rebuilds +
  deploys within ~60s. No manual step.

## What NOT to invent

- Don't add scope claims, stats, or testimonials that Yossi didn't provide. This is his real
  business. If unsure about wording, ask.
- Keep the accessibility floor: skip link, labeled fields, visible focus, 44px targets, AA
  contrast, reduced-motion support. Verify contrast when changing any color token.
