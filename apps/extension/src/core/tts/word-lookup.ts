import type { WordToken } from '@/core/document/types';

// Maps an onboundary charIndex to its word index via binary search. Falls back
// to the nearest preceding word when the index lands in a gap (punctuation/space);
// returns -1 only for an empty word list.
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
