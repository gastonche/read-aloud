# @readaloud/promo

The ReadAloud promotional motion-graphics videos, built with [Remotion](https://remotion.dev). Two compositions:

- **`PlanA`** — _"The Backlog Breathes"_, 30s 1920×1080, emotional/aspirational (landing hero, YouTube). Four acts: **The Weight** (overwhelm) → **The Release** (word-sync highlight) → **Effortless Control** (feature montage) → **The Turn** (testimonial, logo, CTA). Plan: [`docs/marketing/video-plan-A-the-backlog-breathes.md`](../../docs/marketing/video-plan-A-the-backlog-breathes.md).
- **`PlanB`** — _"Speed Read"_, 15s 1080×1920 (9:16), fast feature-demo for Reels/TikTok/Shorts. Nine beat-locked scenes, burned-in captions, built sound-off. Plan: [`docs/marketing/video-plan-B-speed-read.md`](../../docs/marketing/video-plan-B-speed-read.md).

Both have **no voiceover** — motion + on-screen text + a music bed.

## Commands

```bash
npm run studio --workspace @readaloud/promo      # live preview + scrub (both)
npm run render --workspace @readaloud/promo       # PlanA -> out/plan-a.mp4
npm run render:b --workspace @readaloud/promo     # PlanB -> out/plan-b.mp4
npm run typecheck --workspace @readaloud/promo
```

## Structure

```
src/
  Root.tsx          composition registration (PlanA, PlanB)
  PlanA.tsx         30s 16:9 — assembles the 4 acts + music
  PlanB.tsx         15s 9:16 — nine beat-locked scenes + music (self-contained)
  timeline.ts       Plan A timing + shared ARTICLE_WORDS
  theme.ts          brand colors, fonts, easing
  fonts.ts          Fraunces (display) + Inter (body) via @remotion/google-fonts
  acts/             Plan A: Act1Weight, Act2Release, Act3Control, Act4Turn
  components/       HighlightWash (signature word sweep), AudioRibbons, ControlDeck,
                    Wordmark, PersonSilhouette, Caption (Plan B captions)
public/music/       background music tracks (one per plan)
```

All timing lives in `timeline.ts`. There is **no voiceover** — the story is carried by
motion + on-screen text + music.

## Audio

**Music only, no VO.** A synthetic voiceover undercut a product that sells _human
voices you'll love_, so the film leans on motion, typeset lines, and a music bed.

### ⚠️ Attribution required

Both bundled tracks are by **Kevin MacLeod (incompetech.com)**, licensed under
**[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)** — free for commercial
use **but attribution is required.** Wherever you publish, include the matching credit
(e.g. in the YouTube/IG description or end credits):

> Plan A — Music: "Inspired" by Kevin MacLeod (incompetech.com) — CC BY 4.0
> Plan B — Music: "Blippy Trance" by Kevin MacLeod (incompetech.com) — CC BY 4.0
> https://creativecommons.org/licenses/by/4.0/

### Swapping the track (e.g. to an attribution-free one)

Want zero credit obligation? Grab a track from **Pixabay Music** (royalty-free, no
attribution required, free commercial use — download via a browser; the site is
Cloudflare-gated against `curl`). Then:

1. Drop the file in `public/music/`.
2. Pass it as the `musicSrc` prop, or change the default in `src/Root.tsx` / `PlanA.tsx`.
3. Tweak the fade timing constants (`FADE_IN`, `FADE_OUT_START`, `MUSIC_VOL`) in
   `PlanA.tsx` if the new track needs it.

### SFX (not shipped)

A soft "chime-swish" frame-synced to each highlight-word sweep would make a nice sonic
signature. It needs an SFX asset; add it as a second `<Audio>` in `PlanA.tsx`.

## Variants

Only the 16:9 hero is built. The plan (§8) also specifies 9:16 / 1:1 social cuts, a 12s
silent autoplay loop, and a 3s GIF of the highlight. Add them as new `<Composition>`
entries in `Root.tsx` reusing the same act components.
