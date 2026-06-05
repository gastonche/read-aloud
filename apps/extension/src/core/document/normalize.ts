// Intl.Segmenter handles space-less scripts (CJK, Thai) that a \b regex can't.
// ICU's sentence breaker has no abbreviation dictionary, so "Dr. Smith" splits
// after "Dr." (documented in the README).

import type { NormalizedDoc, RawDocument, Sentence, WordToken } from './types';

const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

function tokenizeWords(text: string, lang?: string): WordToken[] {
  if (hasSegmenter) {
    const seg = new Intl.Segmenter(lang || undefined, { granularity: 'word' });
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

function splitSentences(block: string, lang?: string): string[] {
  if (hasSegmenter) {
    const seg = new Intl.Segmenter(lang || undefined, {
      granularity: 'sentence',
    });
    return [...seg.segment(block)].map((s) => s.segment.trim()).filter(Boolean);
  }
  return block
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Drops sentences with no word-like tokens so the reader and TTS never get
// empty units. `lang` (BCP-47) drives locale-aware segmentation.
export function normalize(raw: RawDocument, lang?: string): NormalizedDoc {
  const resolved = lang || raw.lang || '';
  const blocks: Sentence[] = [];
  raw.blocks.forEach((block, paragraph) => {
    for (const text of splitSentences(block, resolved)) {
      const words = tokenizeWords(text, resolved);
      if (words.length === 0) continue;
      blocks.push({ id: blocks.length, text, words, paragraph });
    }
  });
  return { title: raw.title.trim() || 'Untitled', blocks, lang: resolved };
}

export function wordCount(doc: NormalizedDoc): number {
  return doc.blocks.reduce((n, s) => n + s.words.length, 0);
}
