// mammoth resolves to its browser build in the extension (via the package's
// `browser` field), so this runs in the side panel without Node APIs.

import { extractRawText } from 'mammoth';
import type { DocumentSource, RawDocument } from '@/core/document/types';
import { stripExtension } from './util';

export class DocxParseError extends Error {
  constructor(cause?: unknown) {
    super('Could not read this DOCX. It may be corrupt or password-protected.');
    this.name = 'DocxParseError';
    if (cause instanceof Error) this.cause = cause;
  }
}

export class DocxSource implements DocumentSource {
  readonly kind = 'docx';
  constructor(
    private readonly buffer: ArrayBuffer,
    private readonly filename: string,
  ) {}

  async load(): Promise<RawDocument> {
    try {
      const { value } = await extractRawText({ arrayBuffer: this.buffer });
      const blocks = value
        .split(/\n+/)
        .map((b) => b.replace(/[ \t]+/g, ' ').trim())
        .filter((b) => b.length > 0);
      return { title: stripExtension(this.filename), blocks };
    } catch (e) {
      throw new DocxParseError(e);
    }
  }
}
