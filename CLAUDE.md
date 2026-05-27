# Bravura Builders website

Marketing landing page for Bravura Builders — Yossi's general contracting business in Alpharetta, GA. Built with **Astro 5**, deployed via **Cloudflare Pages** to **bravurabuilders.com**.

## Repo layout

```
src/
  layouts/Layout.astro      Global styles, font loading, CSS variables (brand colors)
  pages/index.astro         The entire landing page (single page site, all sections in here)
public/
  bravura-logo.png          Logo (transparent PNG, white background already removed)
  favicon.svg
  work/                     Project photos — drop replacements/additions here
    kitchen.jpg
    bath.jpg
    laundry.jpg
    new-construction.jpg
astro.config.mjs
package.json
```

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

1. **Nav** — centered logo only, no other elements
2. **Hero** — eyebrow "· Metro Atlanta ·", h1 (`| New Construction | Remodels | Renovations |` on line 1, `Built with Bravura.` on line 2, both center-aligned), lead paragraph, "Reach Out for a Free Quote" highlight pill, three CTAs (Call · Text · Email us)
3. **About** — dictionary-style entry for the word "bravura" + pitch tagline + supporting paragraphs
4. **Services** — 5 cards: Renovations & Remodels, New Construction, Owner's Representation, Consulting, Design & Rendering (featured, with "Billed independently" tag)
5. **Selected work** — 4 photo tiles (kitchen, bath, laundry, new construction); labels live in the `projects` array in the page frontmatter
6. **Contact** — dark teal section, stacked CTAs (Call/Text/Email us with destinations underneath each), contact card with address

## Edit recipes

### Swap a project photo
Drop the new JPEG into `public/work/` with the **exact same filename** (e.g. `kitchen.jpg`). Then:
```bash
git add public/work && git commit -m "new kitchen photo" && git push
```
Cloudflare Pages auto-deploys within ~60 seconds.

### Add a new project tile
1. Save the new photo to `public/work/<name>.jpg` (1600px wide JPEG recommended)
2. In `src/pages/index.astro`, find the `const projects = [...]` array near the top and add an entry:
   ```js
   { label: 'Addition', location: 'Atlanta, GA', image: '/work/addition.jpg' },
   ```
3. Commit + push.

### Change services copy
The `const services = [...]` array near the top of `src/pages/index.astro` controls every services card. Edit `title` and `body` strings there.

### Change contact info
Edit the `phone`, `phoneHref`, `email`, `emailHref`, `smsHref`, and `address` constants at the top of `index.astro`.

### Add per-project photo carousels (deferred feature)
We discussed this — the structure is ready (each `projects[]` entry has a single `image` field). To convert to carousels: change `image: '/work/x.jpg'` to `images: ['/work/x-1.jpg', '/work/x-2.jpg', ...]`, then update the rendering loop and add a small JS slider. ~1 hour of work. Ask Claude to implement when you have the photos.

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

- Logo at the top centered, no wordmark text next to it (the logo already contains "Bravura Builders LLC")
- Logo container is sized via `object-fit: cover` to crop empty PNG margins (currently 342×144 desktop)
- Translucent nav bar (rgba 0.55 + backdrop blur)
- Two-line hero headline ALWAYS visible (the `<br>` and leading-pipe span are no longer mobile-only)
- Mobile hero CTAs are 30% smaller; the highlight pill scales too
- "Free quote" callout uses the highlight pill, NOT marker pen swipe, NOT underline — those were rejected
- Vertical separator bars in the headline: cap-height tall, accent color, 1.5px wide, very tight margins (0.12em)
- Buttons share the same blue family: light blue (highlight) default → deeper blue on hover in the hero; white default → light blue on hover in the contact section
- Header buttons (hero) just say "Call · Text · Email us" — no phone numbers shown since the buttons are already wired with tel:/sms:/mailto:
- Contact section buttons are stacked: action label on top, destination below

## What NOT to invent

- Don't add scope copy or claims that weren't there. This is a marketing page but it represents Yossi's business — keep claims honest. If unsure about wording, ask.
- Don't reintroduce the old top announcement bar that was removed.
- Don't bring back the multifamily build tile.
- Photos are currently stock (Unsplash + Pexels, all free for commercial use, no attribution required). The "Selected work" labels treat them as representative project styles — Yossi will swap in real project photos as jobs finish.
