import { describe, it, expect } from 'vitest';
import { wordIndexAtChar } from './word-lookup';
import type { WordToken } from '@/core/document/types';

// "Hello world foo" → offsets: Hello[0,5) world[6,11) foo[12,15)
const words: WordToken[] = [
  { text: 'Hello', charStart: 0, charEnd: 5 },
  { text: 'world', charStart: 6, charEnd: 11 },
  { text: 'foo', charStart: 12, charEnd: 15 },
];

describe('wordIndexAtChar', () => {
  it('maps a char at a word start to that word', () => {
    expect(wordIndexAtChar(words, 0)).toBe(0);
    expect(wordIndexAtChar(words, 6)).toBe(1);
    expect(wordIndexAtChar(words, 12)).toBe(2);
  });

  it('maps a char inside a word to that word', () => {
    expect(wordIndexAtChar(words, 3)).toBe(0);
    expect(wordIndexAtChar(words, 9)).toBe(1);
  });

  it('maps a gap char to the preceding word', () => {
    expect(wordIndexAtChar(words, 5)).toBe(0); // the space after "Hello"
    expect(wordIndexAtChar(words, 11)).toBe(1); // the space after "world"
  });

  it('clamps before-first to 0 and beyond-last to the last word', () => {
    expect(wordIndexAtChar(words, -3)).toBe(0);
    expect(wordIndexAtChar(words, 999)).toBe(2);
  });

  it('returns -1 for an empty word list', () => {
    expect(wordIndexAtChar([], 5)).toBe(-1);
  });
});
