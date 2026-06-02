/**
 * Live-DOM extractor — builds a NormalizedDoc from the page's REAL text nodes
 * and, crucially, a DOM Range for every sentence and word. Those Ranges let the
 * on-page highlighter (Custom Highlight API) paint highlights with zero DOM
 * mutation; a `(sentenceId, wordIndex)` event maps straight to a Range.
 *
 * It mirrors core/document/normalize (Intl.Segmenter per block), but over live
 * nodes with offset→Range capture, so the displayed doc and the painted ranges
 * stay in lockstep.
 */

import type { NormalizedDoc, Sentence, WordToken } from '@/core/document/types';

export interface LiveDocument {
  doc: NormalizedDoc;
  sentenceRange(sentenceId: number): Range | null;
  wordRange(sentenceId: number, wordIndex: number): Range | null;
}

const BLOCK_SELECTOR =
  'p, li, blockquote, h1, h2, h3, h4, h5, h6, pre, dd, figcaption';

const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

interface TextSeg {
  node: Text;
  start: number; // offset of this node's text within the block's full text
}

/** Walk a block's descendant text nodes, returning segments + concatenated text. */
function collectSegments(block: Element): { segs: TextSeg[]; full: string } {
  const segs: TextSeg[] = [];
  let full = '';
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest('script, style, noscript')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue ?? '';
    segs.push({ node: n as Text, start: full.length });
    full += text;
  }
  return { segs, full };
}

/** Map a [start,end) range in the block's full text to a DOM Range. */
function rangeFor(segs: TextSeg[], start: number, end: number): Range | null {
  const locate = (pos: number): { node: Text; offset: number } | null => {
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]!;
      const len = seg.node.nodeValue?.length ?? 0;
      if (pos <= seg.start + len)
        return { node: seg.node, offset: pos - seg.start };
    }
    const last = segs[segs.length - 1];
    return last
      ? { node: last.node, offset: last.node.nodeValue?.length ?? 0 }
      : null;
  };
  const a = locate(start);
  const b = locate(end);
  if (!a || !b) return null;
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

function visible(el: Element): boolean {
  if (el.closest('nav, header, footer, aside')) return false;
  const he = el as HTMLElement;
  return he.offsetParent !== null || he.getClientRects().length > 0;
}

/** Pick the best content root: an <article>/<main>, else the body. */
export function pickContentRoot(): Element {
  return (
    document.querySelector('article') ??
    document.querySelector('main') ??
    document.body
  );
}

export function extractLiveDocument(
  root: Element = pickContentRoot(),
  lang?: string,
): LiveDocument {
  const sentSeg = hasSegmenter
    ? new Intl.Segmenter(lang || undefined, { granularity: 'sentence' })
    : null;
  const wordSeg = hasSegmenter
    ? new Intl.Segmenter(lang || undefined, { granularity: 'word' })
    : null;

  const sentences: Sentence[] = [];
  const sentenceRanges: (Range | null)[] = [];
  const wordRanges: (Range | null)[][] = [];

  const blocks = [...root.querySelectorAll(BLOCK_SELECTOR)].filter(visible);

  blocks.forEach((block, paragraph) => {
    const { segs, full } = collectSegments(block);
    if (!full.trim()) return;

    // Flatten vertical whitespace to spaces WITHOUT changing length, so offsets
    // still map to the real nodes. Crucial: Unicode rule SB4 breaks sentences
    // at newlines, and pretty-printed HTML is full of them — segmenting the raw
    // text would shatter sentences mid-phrase.
    const flat = full.replace(/\s/g, ' ');

    const sentenceTexts = sentSeg
      ? [...sentSeg.segment(flat)]
      : flat
          .split(/(?<=[.!?。！？])\s+/)
          .map((s, i) => ({ segment: s, index: flat.indexOf(s, i) }));

    for (const part of sentenceTexts) {
      const raw = part.segment;
      const lead = raw.length - raw.trimStart().length;
      const text = raw.trim();
      if (!text) continue;
      const base = part.index + lead;

      const words: WordToken[] = [];
      const ranges: (Range | null)[] = [];
      const tokens = wordSeg
        ? [...wordSeg.segment(text)].filter((t) => t.isWordLike)
        : [...text.matchAll(/[\p{L}\p{N}\p{M}]+/gu)].map((m) => ({
            segment: m[0],
            index: m.index ?? 0,
          }));

      for (const w of tokens) {
        const gStart = base + w.index;
        words.push({
          text: w.segment,
          charStart: w.index,
          charEnd: w.index + w.segment.length,
        });
        ranges.push(rangeFor(segs, gStart, gStart + w.segment.length));
      }
      if (words.length === 0) continue;

      const id = sentences.length;
      sentences.push({ id, text, words, paragraph });
      wordRanges.push(ranges);

      const first = ranges.find(Boolean);
      const last = [...ranges].reverse().find(Boolean);
      if (first && last) {
        const sr = document.createRange();
        sr.setStart(first.startContainer, first.startOffset);
        sr.setEnd(last.endContainer, last.endOffset);
        sentenceRanges.push(sr);
      } else {
        sentenceRanges.push(null);
      }
    }
  });

  const doc: NormalizedDoc = {
    title: (document.title || 'This page').trim(),
    blocks: sentences,
    lang: lang || '',
  };

  return {
    doc,
    sentenceRange: (s) => sentenceRanges[s] ?? null,
    wordRange: (s, w) => wordRanges[s]?.[w] ?? null,
  };
}
