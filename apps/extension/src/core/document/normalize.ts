/**
 * The shared normalization stage: RawDocument → NormalizedDoc.
 *
 * Splits each text block into sentences, and each sentence into word tokens
 * carrying char offsets within the sentence. Uses Intl.Segmenter (locale-aware,
 * and crucially handles space-less scripts like CJK that a \b regex can't) with
 * a regex fallback for environments where it's unavailable.
 *
 * Known limitation: ICU's sentence breaker has no abbreviation dictionary, so
 * "Dr. Smith" splits after "Dr." (documented in the README).
 */

import type { NormalizedDoc, RawDocument, Sentence, WordToken } from './types';

const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

/** Tokenize a sentence into word tokens with offsets into `text`. */
function tokenizeWords(text: string): WordToken[] {
  if (hasSegmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'word' });
    const tokens: WordToken[] = [];
    for (const part of seg.segment(text)) {
      if (!part.isWordLike) continue;
      tokens.push({
        text: part.segment,
        charStart: part.index,
        charEnd: part.index + part.segment.length,
      });
    }
    return tokens;
  }
  // Fallback: match runs of letters/numbers/marks, record their offsets.
  const tokens: WordToken[] = [];
  const re = /[\p{L}\p{N}\p{M}]+(?:['’-][\p{L}\p{N}\p{M}]+)*/gu;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    tokens.push({
      text: m[0],
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return tokens;
}

/** Split a block of prose into trimmed sentence strings. */
function splitSentences(block: string): string[] {
  if (hasSegmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    return [...seg.segment(block)].map((s) => s.segment.trim()).filter(Boolean);
  }
  return block
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalize raw text into the shared sentence/word document shape. Sentences
 * with no word-like tokens (pure punctuation/whitespace) are dropped so the
 * reader and TTS never get empty units.
 */
export function normalize(raw: RawDocument): NormalizedDoc {
  const blocks: Sentence[] = [];
  raw.blocks.forEach((block, paragraph) => {
    for (const text of splitSentences(block)) {
      const words = tokenizeWords(text);
      if (words.length === 0) continue;
      blocks.push({ id: blocks.length, text, words, paragraph });
    }
  });
  return { title: raw.title.trim() || 'Untitled', blocks };
}

/** Total word count — handy for time estimates and the reader header. */
export function wordCount(doc: NormalizedDoc): number {
  return doc.blocks.reduce((n, s) => n + s.words.length, 0);
}
