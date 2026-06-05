// Single source of truth for timing. All values in frames @ 30fps unless noted.
// Audio durations are the real measured lengths of the generated VO clips.
import { FPS } from "./theme";

export const sec = (s: number) => Math.round(s * FPS);

// --- Act boundaries (start frame, inclusive) ---
export const ACTS = {
  I: { from: 0, duration: sec(7.667) }, // 0     -> 230
  II: { from: sec(7.667), duration: sec(9) }, // 230 -> 500
  III: { from: sec(16.667), duration: sec(6.667) }, // 500 -> 700
  IV: { from: sec(23.333), duration: sec(6.667) }, // 700 -> 900
} as const;

export const TOTAL = sec(30); // 900

// The sentence "read" in Act II — the word-by-word highlight sweeps across it.
// (No diegetic audio anymore; the sweep is purely visual, timed in Act2Release.)
export const ARTICLE_WORDS =
  "The best ideas arrive when you stop forcing them and simply let your mind wander".split(
    " ",
  );
