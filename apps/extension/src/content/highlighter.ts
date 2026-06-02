/**
 * On-page highlighter using the CSS Custom Highlight API.
 *
 * Registers two highlights (sentence + word) and styles them via an *adopted*
 * stylesheet — so it paints over the page's existing text with ZERO DOM
 * mutation (no wrapping spans, no injected nodes, no layout shift). Driven by
 * the same `(sentenceId, wordIndex)` contract the engines emit.
 */

import type { LiveDocument } from './live-extract';

const SENTENCE = 'readaloud-sentence';
const WORD = 'readaloud-word';

const STYLE = `
::highlight(${SENTENCE}) { background-color: rgba(79, 70, 229, 0.14); }
::highlight(${WORD}) {
  background-color: #4f46e5;
  color: #ffffff;
  border-radius: 3px;
}
`;

/** True when the browser supports the Custom Highlight API. */
export function highlightApiSupported(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined'
  );
}

export class LiveHighlighter {
  private live: LiveDocument | null = null;
  private readonly wordHL = new Highlight();
  private readonly sentenceHL = new Highlight();
  private sheet: CSSStyleSheet | null = null;

  constructor() {
    CSS.highlights.set(SENTENCE, this.sentenceHL);
    CSS.highlights.set(WORD, this.wordHL);
    this.sheet = new CSSStyleSheet();
    this.sheet.replaceSync(STYLE);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet];
  }

  setDocument(live: LiveDocument): void {
    this.live = live;
    this.clear();
  }

  /** Paint the active sentence + word (wordIndex < 0 = sentence-level only). */
  highlight(sentenceId: number, wordIndex: number): void {
    this.sentenceHL.clear();
    this.wordHL.clear();
    if (!this.live || sentenceId < 0) return;

    const sr = this.live.sentenceRange(sentenceId);
    if (sr) this.sentenceHL.add(sr);

    if (wordIndex >= 0) {
      const wr = this.live.wordRange(sentenceId, wordIndex);
      if (wr) this.wordHL.add(wr);
    }
  }

  /** Scroll the active sentence into view (the page's own scroll). */
  scrollTo(sentenceId: number): void {
    const sr = this.live?.sentenceRange(sentenceId);
    const el = sr?.startContainer.parentElement;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  clear(): void {
    this.sentenceHL.clear();
    this.wordHL.clear();
  }

  dispose(): void {
    this.clear();
    CSS.highlights.delete(SENTENCE);
    CSS.highlights.delete(WORD);
    if (this.sheet) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
        (s) => s !== this.sheet,
      );
      this.sheet = null;
    }
  }
}
