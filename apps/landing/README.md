# @readaloud/landing

The marketing site for ReadAloud — a static [Astro](https://astro.build) + Tailwind v4 page.

It shares the extension's brand tokens (indigo accent `#4f46e5`, the player's
`#6366f1 → #8b5cf6` gradient, and the `#eef2ff` highlight wash) so the site and the
product read as one brand. The signature device is the **highlight that tracks the
spoken word** — recreated with the `.mark` / `.mark-sweep` utilities and reused
throughout, including an animated sweep in the hero.

## Develop

```bash
npm run dev --workspace @readaloud/landing      # http://localhost:4321
npm run build --workspace @readaloud/landing    # → apps/landing/dist
npm run preview --workspace @readaloud/landing   # serve the build
npm run typecheck --workspace @readaloud/landing # astro check
```

From the repo root, `npm run build` / `npm run typecheck` run this app through
Turborepo alongside the extension and worker.

## Structure

```
src/
  layouts/Base.astro      # <head>, SEO/OG meta, no-flash dark+JS init, scroll-reveal
  components/             # one file per section (Hero, Features, Pricing, FAQ, …)
    Icon.astro            # inline Lucide-geometry SVGs (no emoji, currentColor)
  pages/index.astro       # composes the sections
  styles/global.css       # Tailwind import, @theme tokens, motifs, motion
public/                   # favicon.svg, og.png (1200×630) + og.svg source
```

## Conventions & gotchas

- **Dark mode** is class-driven (`.dark` on `<html>`, toggled in the nav, persisted
  to `localStorage`). Don't set `background`/`color` on `body` from an _unlayered_
  CSS rule — unlayered rules beat Tailwind's layered `dark:` utilities and silently
  break dark mode. Body colours live on the element's Tailwind classes instead.
- **Scroll-reveal is a pure enhancement.** `.reveal` only hides content under
  `html.js` (set before paint); without JS, or if the observer misses, everything is
  visible, and a 1.2s safety net reveals anything left. Never gate real content on it.
- `prefers-reduced-motion` disables the sweep, float, equalizer, and reveal motion.
- The OG image is a real PNG (`public/og.png`); `public/og.svg` is the editable source
  (re-render at 1200×630 if you change it).

## Before going live (placeholders to replace)

- **Testimonials** in `components/Testimonials.astro` are illustrative — swap in real,
  attributable quotes (with permission).
- **Pricing** (`$5/mo`) and the **4.9★ / stat-bar** figures are illustrative.
- **"Add to Chrome" / store links** point at the generic Web Store — update to the
  real listing URL once published.
- The **waitlist form** validates and confirms client-side only; wire it to a real
  email endpoint (e.g. a Worker route) before launch.
- Set the production domain in `astro.config.mjs` (`site:`).
