/**
 * Map a character index (from a speechSynthesis `onboundary` event, which is an
 * offset into the spoken sentence text) to the index of the word that contains
 * it. Pure and binary-searched so long sentences map in O(log n).
 */

import type { WordToken } from '@/core/document/types';

/**
 * Returns the index of the word whose [charStart, charEnd) range contains
 * `charIndex`, or the nearest preceding word if the index falls in a gap
 * (punctuation/space). Clamps to [0, words.length-1]; returns -1 only for an
 * empty word list.
 */
export function wordIndexAtChar(words: WordToken[], charIndex: number): number {
  if (words.length === 0) return -1;
  if (charIndex <= words[0]!.charStart) return 0;

  // Binary search for the last word whose charStart <= charIndex.
  let lo = 0;
  let hi = words.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid]!.charStart <= charIndex) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
