/**
 * Plain-text DocumentSource. Decodes the uploaded bytes as UTF-8 and splits on
 * blank lines into paragraph blocks; normalization handles sentences/words.
 */

import type { RawDocument, DocumentSource } from '@/core/document/types';
import { stripExtension } from './util';

export class TxtSource implements DocumentSource {
  readonly kind = 'txt';
  constructor(
    private readonly buffer: ArrayBuffer,
    private readonly filename: string,
  ) {}

  async load(): Promise<RawDocument> {
    const text = new TextDecoder('utf-8').decode(this.buffer);
    const blocks = text
      .split(/\n{2,}/)
      .map((b) => b.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim())
      .filter((b) => b.length > 0);
    return { title: stripExtension(this.filename), blocks };
  }
}
