import { describe, it, expect } from 'vitest';
import { collapseAlignmentToWords, type CharacterAlignment } from './index';

/**
 * Build a CharacterAlignment from a string where each character lasts 0.1s.
 * Lets us write readable expectations against real timing arrays.
 */
function alignmentOf(text: string, step = 0.1): CharacterAlignment {
  const characters = [...text];
  const character_start_times_seconds = characters.map((_, i) => +(i * step).toFixed(4));
  const character_end_times_seconds = characters.map((_, i) =>
    +((i + 1) * step).toFixed(4),
  );
  return { characters, character_start_times_seconds, character_end_times_seconds };
}

describe('collapseAlignmentToWords', () => {
  it('groups characters between whitespace into words', () => {
    const words = collapseAlignmentToWords(alignmentOf('hi bye'));
    expect(words.map((w) => w.word)).toEqual(['hi', 'bye']);
  });

  it("uses the first char's start and the last char's end for each word", () => {
    const words = collapseAlignmentToWords(alignmentOf('hi bye'));
    // "hi" = chars 0,1 → start 0.0, end 0.2
    expect(words[0]).toMatchObject({ word: 'hi', startSec: 0, index: 0 });
    expect(words[0]!.endSec).toBeCloseTo(0.2, 5);
    // "bye" = chars 3,4,5 → start 0.3, end 0.6
    expect(words[1]!.startSec).toBeCloseTo(0.3, 5);
    expect(words[1]!.endSec).toBeCloseTo(0.6, 5);
    expect(words[1]!.index).toBe(1);
  });

  it('collapses runs of whitespace and ignores leading/trailing spaces', () => {
    const words = collapseAlignmentToWords(alignmentOf('  a   b  '));
    expect(words.map((w) => w.word)).toEqual(['a', 'b']);
  });

  it('handles newlines and tabs as separators', () => {
    const words = collapseAlignmentToWords(alignmentOf('a\nb\tc'));
    expect(words.map((w) => w.word)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list for whitespace-only or empty input', () => {
    expect(collapseAlignmentToWords(alignmentOf(''))).toEqual([]);
    expect(collapseAlignmentToWords(alignmentOf('   '))).toEqual([]);
  });

  it('produces contiguous indices usable as highlight keys', () => {
    const words = collapseAlignmentToWords(alignmentOf('one two three four'));
    expect(words.map((w) => w.index)).toEqual([0, 1, 2, 3]);
  });
});
