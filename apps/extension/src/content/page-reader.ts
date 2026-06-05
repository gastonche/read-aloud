// Page-reader singleton (content script): owns the one live document + on-page
// highlighter, shared by the floating bar and the message handlers.

import { detectLanguage } from '@/core/i18n/detect';
import { primaryLang } from '@/core/i18n/lang';
import {
  extractLiveDocument,
  pickContentRoot,
  type LiveDocument,
} from './live-extract';
import { highlightApiSupported, LiveHighlighter } from './highlighter';

let live: LiveDocument | null = null;
let highlighter: LiveHighlighter | null = null;

export async function buildPageDoc(
  langOverride?: string,
): Promise<LiveDocument> {
  const root = pickContentRoot();
  let lang = langOverride;
  if (!lang) {
    const sample = (root as HTMLElement).innerText?.slice(0, 2000) ?? '';
    lang =
      (await detectLanguage(sample)) ||
      primaryLang(document.documentElement.getAttribute('lang') ?? '') ||
      undefined;
  }
  live = extractLiveDocument(root, lang);
  if (!highlighter && highlightApiSupported())
    highlighter = new LiveHighlighter();
  highlighter?.setDocument(live);
  return live;
}

export function getLiveDocument(): LiveDocument | null {
  return live;
}

export function paint(
  sentenceId: number,
  wordIndex: number,
  scroll = false,
): void {
  highlighter?.highlight(sentenceId, wordIndex);
  if (scroll && sentenceId >= 0) highlighter?.scrollTo(sentenceId);
}

export function clearPaint(): void {
  highlighter?.clear();
}
