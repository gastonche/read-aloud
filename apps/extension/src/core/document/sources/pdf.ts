// pdf.js parses in a Web Worker; we point GlobalWorkerOptions at the worker
// bundled by Vite (`?url` → an extension-origin asset URL). Serving it from the
// extension's own origin satisfies the side panel's `script-src 'self'` CSP, so
// no web_accessible_resources entry is needed.

import * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { RawDocument, DocumentSource } from '@/core/document/types';
import { stripExtension } from './util';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export class PdfParseError extends Error {
  constructor(cause?: unknown) {
    super('Could not read this PDF. It may be corrupt, encrypted, or scanned.');
    this.name = 'PdfParseError';
    if (cause instanceof Error) this.cause = cause;
  }
}

export class PdfSource implements DocumentSource {
  readonly kind = 'pdf';
  constructor(
    private readonly buffer: ArrayBuffer,
    private readonly filename: string,
  ) {}

  async load(): Promise<RawDocument> {
    try {
      // getDocument transfers/detaches the buffer; hand it a copy so the
      // original staged bytes stay reusable (e.g. for retry).
      const data = this.buffer.slice(0);
      const loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;

      const blocks: string[] = [];
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        blocks.push(...pageToBlocks(content.items as TextItem[]));
        page.cleanup();
      }

      const title = await readTitle(doc).catch(() => '');
      await loadingTask.destroy();

      return {
        title: title || stripExtension(this.filename),
        blocks,
      };
    } catch (e) {
      if (e instanceof PdfParseError) throw e;
      throw new PdfParseError(e);
    }
  }
}

function pageToBlocks(items: TextItem[]): string[] {
  let text = '';
  for (const item of items) {
    text += item.str;
    if (item.hasEOL) text += '\n';
  }
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) =>
      p
        .replace(/\s*\n\s*/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length > 0);
  if (paragraphs.length > 0) return paragraphs;
  const whole = text.replace(/\s+/g, ' ').trim();
  return whole ? [whole] : [];
}

async function readTitle(doc: pdfjs.PDFDocumentProxy): Promise<string> {
  const meta = await doc.getMetadata();
  const info = meta.info as { Title?: unknown } | undefined;
  return typeof info?.Title === 'string' ? info.Title.trim() : '';
}
