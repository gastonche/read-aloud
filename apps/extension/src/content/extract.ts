/**
 * Content script — readable-text extraction.
 *
 * Runs in the page, on demand: the side panel asks the service worker to
 * extract, and the SW relays READABILITY_EXTRACT here. We never mutate the page
 * DOM — Readability parses a *clone*, and we only read text out.
 *
 * Strategy:
 *   1. Run Mozilla Readability on a clone of the document.
 *   2. Sanitize the article HTML with DOMPurify, then pull text per block
 *      element so paragraph boundaries survive into the reader view.
 *   3. Fall back to document.body.innerText (split on blank lines) if
 *      Readability finds nothing usable.
 */

import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import type {
  ContentMessage,
  ExtractionPayload,
  Result,
} from '@/messaging/contract';

const BLOCK_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, pre';

/** Pull paragraph-ish text blocks out of sanitized article HTML. */
function blocksFromHtml(html: string): string[] {
  const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  const doc = new DOMParser().parseFromString(safe, 'text/html');
  const blocks = [...doc.querySelectorAll(BLOCK_SELECTOR)]
    .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 0);
  // If the markup had no block elements, fall back to the whole text.
  if (blocks.length === 0) {
    const all = (doc.body.textContent ?? '').trim();
    return all ? [all] : [];
  }
  return blocks;
}

/** Last-resort extraction straight from the rendered page text. */
function fallbackBlocks(): string[] {
  const text = document.body?.innerText ?? '';
  return text
    .split(/\n{2,}/)
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 0);
}

function extract(): ExtractionPayload {
  let title = document.title || '';
  let blocks: string[] = [];
  let lang = document.documentElement.getAttribute('lang') ?? '';

  try {
    // Readability mutates the document it's given — always pass a clone.
    const clone = document.cloneNode(true) as Document;
    const article = new Readability(clone).parse();
    if (article) {
      if (article.title) title = article.title;
      if (article.content) blocks = blocksFromHtml(article.content);
      if (article.lang) lang = article.lang;
    }
  } catch {
    // Swallow — we fall through to the body-text fallback below.
  }

  if (blocks.length === 0) blocks = fallbackBlocks();
  return { title: title.trim(), textBlocks: blocks, lang: lang.trim() };
}

chrome.runtime.onMessage.addListener(
  (message: ContentMessage, _sender, sendResponse) => {
    if (message?.type !== 'READABILITY_EXTRACT') return undefined;
    try {
      const payload = extract();
      const res: Result<ExtractionPayload> = { ok: true, ...payload };
      sendResponse(res);
    } catch (e) {
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : 'Extraction failed.',
      } satisfies Result);
    }
    return true; // synchronous response, but keep the channel tidy
  },
);
