import { describe, it, expect } from 'vitest';
import {
  collapseAlignmentToWords,
  wordIndexAtTime,
  estimateWordSpans,
  type CharacterAlignment,
} from './index';

/** Build a CharacterAlignment where each character lasts `step` seconds. */
function alignmentOf(text: string, step = 0.1): CharacterAlignment {
  const characters = [...text];
  const character_start_times_seconds = characters.map(
    (_, i) => +(i * step).toFixed(4),
  );
  const character_end_times_seconds = characters.map(
    (_, i) => +((i + 1) * step).toFixed(4),
  );
  return {
    characters,
    character_start_times_seconds,
    character_end_times_seconds,
  };
}

describe('collapseAlignmentToWords', () => {
  it('groups characters between whitespace into words', () => {
    const words = collapseAlignmentToWords(alignmentOf('hi bye'));
    expect(words.map((w) => w.word)).toEqual(['hi', 'bye']);
  });

  it("uses the first char's start and the last char's end for each word", () => {
    const words = collapseAlignmentToWords(alignmentOf('hi bye'));
    expect(words[0]).toMatchObject({ word: 'hi', startSec: 0, index: 0 });
    expect(words[0]!.endSec).toBeCloseTo(0.2, 5);
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

describe('wordIndexAtTime', () => {
  const spans = collapseAlignmentToWords(alignmentOf('hi bye'));

  it('returns -1 before the first word starts', () => {
    expect(wordIndexAtTime(spans, 0)).toBe(0); // first word starts at 0
    expect(
      wordIndexAtTime([{ word: 'x', startSec: 0.5, endSec: 1, index: 0 }], 0.2),
    ).toBe(-1);
  });

  it('returns the active word for a time inside it', () => {
    expect(wordIndexAtTime(spans, 0.1)).toBe(0);
    expect(wordIndexAtTime(spans, 0.4)).toBe(1);
  });

  it('holds the last started word during gaps and past the end', () => {
    expect(wordIndexAtTime(spans, 0.25)).toBe(0); // gap between words
    expect(wordIndexAtTime(spans, 99)).toBe(1); // past the end
  });

  it('returns -1 for an empty span list', () => {
    expect(wordIndexAtTime([], 1)).toBe(-1);
  });
});

describe('estimateWordSpans', () => {
  it('distributes duration across words and covers [0, duration]', () => {
    const spans = estimateWordSpans(['hi', 'world'], 10);
    expect(spans).toHaveLength(2);
    expect(spans[0]!.startSec).toBe(0);
    expect(spans.at(-1)!.endSec).toBeCloseTo(10, 5);
    // contiguous: each end == next start
    expect(spans[0]!.endSec).toBeCloseTo(spans[1]!.startSec, 5);
    // longer word gets more time
    const w0 = spans[0]!.endSec - spans[0]!.startSec;
    const w1 = spans[1]!.endSec - spans[1]!.startSec;
    expect(w1).toBeGreaterThan(w0);
    expect(spans.map((s) => s.index)).toEqual([0, 1]);
  });

  it('returns empty for no words or non-positive duration', () => {
    expect(estimateWordSpans([], 5)).toEqual([]);
    expect(estimateWordSpans(['a'], 0)).toEqual([]);
  });

  it('drives wordIndexAtTime so OpenAI-style audio still highlights', () => {
    const spans = estimateWordSpans(['one', 'two', 'three'], 9);
    expect(wordIndexAtTime(spans, 0.1)).toBe(0);
    expect(wordIndexAtTime(spans, 8.9)).toBe(2);
  });
});
