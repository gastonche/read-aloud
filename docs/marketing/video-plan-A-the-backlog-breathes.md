# Promo Video — Plan A: "The Backlog Breathes"

**Direction:** Emotional / aspirational. Sells a *feeling* (relief from overwhelm) before it sells features.
**Best for:** Landing page hero, YouTube, brand awareness, the "this is what life with ReadAloud feels like" story.
**Length:** 30s hero (variants in §8).

---

## 1. The Idea

A pile of unread articles, tabs, and PDFs visually *closes in* on a tired reader — until one word lights up and starts speaking in a warm human voice. The clutter lifts off the screen and dissolves into calm, flowing audio. The reader leans back, closes their eyes, and keeps absorbing — then walks outside, still listening.

**The single most important move:** we make the viewer *feel buried* first, then deliver release. Features arrive as the answer to a tension we've already created — never as a checklist.

**Emotional arc:** Overwhelm → Relief → Effortless control → Aspiration ("this could be my life").

**The through-line:** ReadAloud's signature highlight wash. Every transition in the video is *motivated* by a left-to-right word sweep — it's the visual spine that carries us from chaos to calm.

---

## 2. Marketing Psychology

| Principle | How it's used here |
|---|---|
| **Problem-Agitation-Solution** | Open on the pain (47 tabs, burning eyes) before the product appears. Tension earns attention. |
| **Zeigarnik effect** (unfinished tasks nag us) | The growing pile of *unread* items is the antagonist — everyone feels that open loop. |
| **Peak-End rule** | One engineered "wow" peak (word-perfect highlight sync) + a warm aspirational end (eyes closed, walking outside). People remember the peak and the ending. |
| **Show, don't tell** | The highlight sync is visual by nature — we let motion prove it instead of claiming it. |
| **Loss aversion** | "Your reading list isn't getting shorter" frames the cost of *not* acting. |
| **Risk reversal** | Final card kills every excuse: "No account · Free forever · Add to Chrome." |
| **Emotional social proof** | One authentic testimonial flash (the dyslexia quote) — credibility through feeling, not logo walls. |
| **Cognitive ease** | The calm, editorial visual style *is* the promise: this makes your life lighter. |

---

## 3. Storyboard (30s)

**ACT I — The Weight (0:00–0:07)**
- **0:00–0:02** Black. A soft inhale of sound. Cursor blinks beside one word: *"Later."*
- **0:02–0:05** Tabs multiply fast — 5, 12, 30, 47 — article cards, PDFs, newsletters cascade into a leaning tower. Slightly desaturated, faint screen-glare vignette (eye fatigue).
- **0:05–0:07** The pile tips toward camera. **On-screen line** (Fraunces, italic) fades in: *"There's more worth reading than any pair of eyes can keep up with."*

**ACT II — The Release (0:07–0:14)**
- **0:07–0:09** One word in the clutter **ignites** with the periwinkle highlight wash (`#eef2ff` over indigo) — the reading begins.
- **0:09–0:12** The highlight sweeps word-by-word — the hero moment, carried purely by motion. Behind it, the clutter dissolves into smooth gradient audio ribbons (indigo → violet).
- **0:12–0:14** The chaotic stack collapses into one calm column of text on a clean page. Color and warmth return. **On-screen line:** *"Turns any page into clear, natural speech."*

**ACT III — Effortless Control (0:14–0:23)**
- **0:14–0:17** The floating control bar slides in and snaps to a corner (the draggable dock). Satisfying micro-interactions: speed 1× → 1.75×, sentence skip, click-to-seek.
- **0:17–0:20** Beat-synced montage (~1s each): language chip flips English → 日本語 → عربى (RTL renders correctly); a PDF icon morphs into flowing text; an "AI summary" chip pops and condenses a long article to 3 lines.
- **0:20–0:23** Cut to a person (illustrated silhouette in brand gradient) leaning back, eyes closed, then walking outside with earbuds — the page audio continues over the scene.

**ACT IV — The Turn (0:23–0:30)**
- **0:23–0:25** Testimonial flash in Fraunces: *"The difference between finishing an article and giving up halfway."*
- **0:25–0:28** Logo resolve: **ReadAloud** wordmark draws on; the highlight wash sweeps through the letters once.
- **0:28–0:30** End card: *"Stop reading everything. Start listening to it."* → button **"Add to Chrome — it's free"** + trust line *No account · Free voices forever · Private by design.*

---

## 4. On-Screen Copy (no voiceover)

**There is no voiceover.** The story is carried by motion + music, with a few typeset lines doing the talking. This was a deliberate change — a synthetic VO undercut a product that sells *human voices you'll love*, and clean type + music reads as more premium and works sound-off.

The on-screen lines, in order:

| Beat | Line | Type |
|---|---|---|
| Act I open | *Later.* | Fraunces italic |
| Act I climax | *There's more worth reading than any pair of eyes can keep up with.* | Fraunces italic |
| Act II resolve | *Turns any page into clear, **natural speech.*** | Fraunces |
| Act IV | *"The difference between finishing an article and giving up halfway."* | Fraunces italic (testimonial) |
| Act IV | *Stop reading everything. **Start listening to it.*** | Fraunces |
| End card | Add to Chrome — it's free · *No account · Free voices forever · Private by design* | Inter |

Keep copy sparse and let each line breathe — the silence around the words is part of the calm.

---

## 5. Music (the score does the emotional work)

**Shipped track:** *"Inspired"* by **Kevin MacLeod** (incompetech.com) — a gentle, hopeful solo-piano piece that opens sparse and builds, matching the overwhelm → relief → aspiration arc. Licensed **CC BY 4.0**, so it's free to use commercially **with attribution** (credit line required in the video description / end credits — see README). Downloaded directly and bundled in `apps/promo/public/music/`.

In the Remotion build it plays under the whole 30s with a 1.5s fade-in and a 2.5s fade-out at ~0.82 level (no VO to duck under, so the music can sit forward).

**Swap options (all free / license-clean):**
- **Pixabay Music** — royalty-free, *no attribution required*, free for commercial use. Best if you want zero credit obligations. (Site is Cloudflare-gated; download via a browser, not curl.)
- **Incompetech / Kevin MacLeod** — huge catalog, CC BY 4.0, direct download. What's shipped.
- **Paid beds** for a more bespoke arc: Artlist / Epidemic / Musicbed.

To swap: drop the file in `public/music/`, pass it as the `musicSrc` prop (or change the default in `Root.tsx`). Adjust fade timing in `PlanA.tsx` if needed.

> Optional polish: a soft "chime-swish" SFX *frame-synced* to each highlight-word sweep would make a sonic signature. Not shipped (would need an SFX asset); easy to add as a second `<Audio>` later.

---

## 7. Visual & Motion Language

- **Palette:** indigo `#4f46e5`, bright `#6366f1`, violet `#8b5cf6`, highlight wash `#eef2ff`. Act I cooled/desaturated; Acts II–IV full saturation + warmth.
- **Type:** Fraunces for emotional/editorial statements + tagline; Inter for UI labels.
- **Motion signature:** the wash. Word-by-word sync is the brand's moment — treat it as sacred and keep it frame-accurate.
- **Easing:** soft, organic (`cubic-bezier(.22,1,.36,1)`) everywhere except the controls montage, which uses crisp spring snaps to read as *responsive*.
- **Texture:** editorial paper, 3xl rounded cards, soft shadows; audio rendered as smooth gradient ribbons, never jagged.
- **Restraint:** generous negative space — the calm is the product promise.

---

## 8. Deliverables

| Cut | Length | Aspect | Use |
|---|---|---|---|
| **Hero** | 30s | 16:9 | Landing "See how it works", YouTube |
| **Social** | 15s | 9:16 / 1:1 | Reels/TikTok/Shorts — see note |
| **Silent autoplay** | 12s | 16:9 | Landing hero loop, captions baked in |
| **GIF/Lottie loop** | 3s | — | The word-sync highlight, embeddable |

- **Social cut note:** open *directly* on the highlight wash — no slow build; the first frame must hook.
- **Captions:** always burned-in (sound-off viewing) — thematically perfect since the product is about words on screen.

---

## 9. Production Path (Remotion)

1. Lock concept + final on-screen copy (§4).
2. Choose the music bed (§5) — a CC-BY track ships by default.
3. Build in Remotion: one reusable `<HighlightWash>` component driven by a real word-timestamp array (same data model the product uses), shared across scenes.
4. Render the 16:9 master → derive 9:16 / 1:1 / silent / GIF cuts.

---

## 10. Why Plan A vs Plan B

Choose **A** when the goal is brand love, the landing-page hero, or top-of-funnel awareness where you have a viewer's full 30 seconds and want them to *feel* the relief. If the goal is paid-social click-through where you have ~2 seconds to earn the scroll-stop, see **Plan B (Speed Read)**.
