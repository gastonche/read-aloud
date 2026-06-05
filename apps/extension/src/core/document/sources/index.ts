import type { DocumentSource } from '@/core/document/types';
import { classifyFile, type SupportedKind } from './classify';
import { PdfSource } from './pdf';
import { TxtSource } from './txt';
import { EpubSource } from './epub';
import { DocxSource } from './docx';

export { PdfSource } from './pdf';
export { TxtSource } from './txt';
export { EpubSource } from './epub';
export { DocxSource } from './docx';
export { PageSource } from './page';
export { classifyFile } from './classify';

export class UnsupportedFileError extends Error {
  constructor(label: string) {
    super(`${label} files aren't supported yet.`);
    this.name = 'UnsupportedFileError';
  }
}

const factories: Record<
  SupportedKind,
  (buffer: ArrayBuffer, name: string) => DocumentSource
> = {
  pdf: (b, n) => new PdfSource(b, n),
  txt: (b, n) => new TxtSource(b, n),
  epub: (b, n) => new EpubSource(b, n),
  docx: (b, n) => new DocxSource(b, n),
};

export function createFileSource(
  name: string,
  mime: string,
  buffer: ArrayBuffer,
): DocumentSource {
  const kind = classifyFile(name, mime);
  if (typeof kind === 'object') throw new UnsupportedFileError(kind.label);
  return factories[kind](buffer, name);
}
