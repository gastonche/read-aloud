// The real extraction (Readability) happens in the content script; this just
// routes the request through the service worker and shapes the result.

import { sendRuntimeMessage } from '@/messaging/bus';
import type { RawDocument, DocumentSource } from '@/core/document/types';

export class EmptyPageError extends Error {
  constructor() {
    super('No readable text found on this page.');
    this.name = 'EmptyPageError';
  }
}

export class PageSource implements DocumentSource {
  readonly kind = 'page';
  constructor(private readonly tabId: number) {}

  async load(): Promise<RawDocument> {
    const res = await sendRuntimeMessage({
      type: 'EXTRACT_PAGE',
      tabId: this.tabId,
    });
    if (!res.ok) throw new Error(res.error);
    if (res.textBlocks.length === 0) throw new EmptyPageError();
    return { title: res.title, blocks: res.textBlocks, lang: res.lang };
  }
}
