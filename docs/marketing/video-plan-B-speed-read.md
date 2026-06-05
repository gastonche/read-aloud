# Promo Video — Plan B: "Speed Read"

**Direction:** Fast / punchy feature-demo. Sells _capability_ in rapid, satisfying hits.
**Best for:** Paid social (Reels/TikTok/Shorts), pre-roll, retargeting, app-store preview — anywhere you have ~2 seconds to earn the scroll-stop and need click-through.
**Length:** 15s primary (variants in §8).

---

## 1. The Idea

No slow build, no setup. **Frame one is the payoff:** a real article on screen with the highlight wash sweeping word-by-word in perfect sync and a caption snapping in. From there it's a tight, beat-locked montage of "watch it just _do_ this" moments — each capability landing on a music hit — ending on the offer.

This plan trades emotional depth for **density and momentum.** It assumes a skeptical, fast-scrolling viewer and rewards them instantly, then keeps the dopamine coming with quick wins.

**The through-line:** still the highlight wash, but used as a _rhythm device_ — each new feature enters on the sweep, on the beat.

---

## 2. Marketing Psychology

| Principle                      | How it's used here                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **First-frame hook**           | The wow (live word-sync) is frame 1 — no patience required. Critical for paid social where 2s decides everything. |
| **Show, don't tell**           | Every claim is demonstrated on real content; zero "we believe…" filler.                                           |
| **Cognitive fluency / rhythm** | Beat-synced cuts feel satisfying and "right," which the brain transfers onto the product.                         |
| **Curiosity gap micro-loops**  | Each ~1.5s beat opens and closes a tiny loop ("wait, it does PDFs too?") keeping retention high.                  |
| **Specificity = credibility**  | Concrete numbers (30+ languages, 0.5×–3×, 4,000 words → 3 lines) read as proof, not puff.                         |
| **Risk reversal**              | "Free. No account." in the last beat removes the only friction at the moment of intent.                           |
| **Recency / CTA primacy**      | The offer is the final, biggest, most-held frame — the thing they leave with.                                     |

---

## 3. Storyboard (15s)

> Cuts land on the beat. Target ~9–11 distinct beats. Energetic but clean — snappy, not chaotic.

- **0:00–0:02 — HOOK.** Cold open on a real article. A warm human voice is _already_ reading; the highlight wash sweeps word-by-word, dead in sync. On-screen text snaps in: **"It reads any page out loud."**
- **0:02–0:04 — Voices.** Voice-picker pops; two friendly avatars. Caption: **"In human voices you'll love."** (free + premium chips visible, no jargon).
- **0:04–0:05 — Speed.** Speed dial flicks 1× → 2× → 3×; audio pitches up playfully then settles. Caption: **"As fast as you want."**
- **0:05–0:07 — Files.** PDF, EPUB, DOCX icons fly in and morph into flowing highlighted text. Caption: **"PDFs. Ebooks. Docs."**
- **0:07–0:08 — Languages.** Language chip rapid-flips English → 日本語 → عربى (RTL flips correctly). Caption: **"30+ languages."**
- **0:08–0:10 — AI summary.** A long article visually compresses; an "AI summary" chip resolves it to 3 lines, then reads _those_ aloud. Caption: **"Too long? Get the TL;DR."**
- **0:10–0:12 — Control bar.** The floating bar drags and snaps to a corner; Space-to-play, click-to-seek, auto-scroll flash by. Caption: **"Controls that stay out of the way."**
- **0:12–0:13 — Privacy beat.** Quick lock icon. Caption: **"No account. Private by design."**
- **0:13–0:15 — OFFER.** Logo + tagline **"Stop reading everything. Start listening to it."** → big button **"Add to Chrome — it's free"**. Held, biggest frame. A ReadAloud voice reads the tagline aloud over it.

---

## 4. On-Screen Copy (no voiceover)

**No voiceover** — captions do the talking and the music drives the cuts. This is the right call for paid social anyway (most plays are muted), and it avoids a synthetic VO undercutting a product that sells _human voices you'll love_. Burned-in captions, bold and high-contrast, one line per beat:

> "It reads any page out loud." → "In human voices you'll love." → "As fast as you want." →
> "PDFs. Ebooks. Docs." → "30+ languages." → "Too long? Get the TL;DR." →
> "Controls that stay out of the way." → "No account. Private by design." →
> **"Add to Chrome — it's free."**

**Tone of the type:** energetic, confident, friendly — quick but never shouty.

---

## 5. Music (drives the edit)

In Plan B the **music is the spine** — cuts land on the beat, so pick the track _first_ and map beats to it.

- **Vibe:** upbeat, modern, light-electronic or clean pop-corporate with a clear 4-on-the-floor pulse. 110–125 BPM so cuts land crisply. Confident, not aggressive.
- **Shipped track:** _"Blippy Trance"_ by **Kevin MacLeod** (incompetech.com) — upbeat electronic with a steady driving pulse, good for beat-locked cuts. Licensed **CC BY 4.0** (attribution required — see README). Bundled in `apps/promo/public/music/`.
- **Other free / license-clean sources:**
  - **Pixabay Music** — royalty-free, _no attribution required_, free commercial use. Swap to this if you want zero credit obligations. (Download via browser — the site is Cloudflare-gated against curl.)
  - **Incompetech / Kevin MacLeod** — CC BY 4.0, direct download (what's shipped).
  - **Paid** for bespoke energy: Artlist / Epidemic / Musicbed.
- **Note:** the beats are on a clean grid right now (cuts ~every 1.5–2s). For tighter edit-to-music feel, nudge the `B` beat-map frames in `PlanB.tsx` to land on the track's downbeats.

---

## 6. Sound Design

- **Hit-synced edits:** every feature beat lands on a downbeat or snare hit — the satisfaction comes from edit-to-music tightness.
- **Signature SFX (optional):** a soft "chime-swish" on each highlight sweep doubles as a rhythmic accent — keep it frame-perfect. Needs an SFX asset; add as a second `<Audio>`.
- **UI SFX (optional):** crisp, tactile pops/clicks on each chip, dial, and snap — they sell _responsiveness_.
- **Final beat:** music hits a satisfying resolve/stab on the CTA frame.
- **Mix:** with no VO, the music sits forward the whole way; just fade in/out at the ends.
- **Licensing:** free (Pixabay / Incompetech) or licensed (Artlist, Epidemic, Musicbed) — never commercial tracks.

---

## 7. Visual & Motion Language

- **Palette:** indigo `#4f46e5`, bright `#6366f1`, violet `#8b5cf6`, highlight wash `#eef2ff`. Full saturation throughout — this plan is bright and energetic start to finish (no desaturated act).
- **Type:** Inter for the snappy captions (legible at speed, mobile-first); Fraunces reserved for the final tagline only.
- **Motion signature:** the wash as rhythm — features enter on the sweep, on the beat.
- **Easing:** crisp spring snaps (overshoot + settle) for that tactile, responsive feel — the opposite of Plan A's slow organic ease.
- **Caption style:** bold, high-contrast, safe-area-aware, with a subtle pop-in. Designed to be fully readable muted.
- **Density discipline:** fast but never cluttered — one clear idea per beat, lots of contrast, no overlapping motion.

---

## 8. Deliverables

| Cut                   | Length | Aspect      | Use                                        |
| --------------------- | ------ | ----------- | ------------------------------------------ |
| **Primary**           | 15s    | 9:16        | Reels / TikTok / Shorts                    |
| **Square**            | 15s    | 1:1         | Feed placements                            |
| **Wide**              | 15s    | 16:9        | YouTube pre-roll, landing secondary        |
| **6s bumper**         | 6s     | 16:9 / 9:16 | Pre-roll — hook → 3 fastest beats → CTA    |
| **App-store preview** | 15–20s | 9:16        | iOS/Android store listing (when apps ship) |

- **Captions:** always burned-in. This cut is built sound-off first.
- **Hook variants:** produce 2–3 alternate first-2-seconds (different opening article / first caption) to A/B which earns the most scroll-stops.

---

## 9. Production Path (Remotion)

1. Lock the beat map (which feature on which beat) against the chosen music track first — in Plan B, music timing drives the edit.
2. Source the music track (§5) — no VO; captions carry the copy.
3. Build in Remotion: reusable `<HighlightWash>` (real word-timestamp array) + a `<FeatureBeat>` component (caption + UI demo) sequenced to `frame`-mapped beat markers.
4. Render 9:16 master → derive 1:1 / 16:9 / 6s / hook-variant cuts.

---

## 10. Why Plan B vs Plan A

Choose **B** when the goal is performance: paid social, retargeting, app-store listing, or anywhere click-through and scroll-stop rate matter more than brand feeling. It assumes no patience and pays off instantly. If you instead want the landing-page hero or a brand story that makes people _feel_ the relief, see **Plan A (The Backlog Breathes)**.
