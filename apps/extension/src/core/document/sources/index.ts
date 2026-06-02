/**
 * File-source factory. Routes an uploaded file's bytes to the right
 * DocumentSource using the pure {@link classifyFile} decision. EPUB and DOCX
 * are recognised but not yet implemented (fast-follows) and raise a clear,
 * user-facing error.
 */

import type { DocumentSource } from '@/core/document/types';
import { classifyFile } from './classify';
import { PdfSource } from './pdf';
import { TxtSource } from './txt';

export { PdfSource } from './pdf';
export { TxtSource } from './txt';
export { PageSource } from './page';
export { classifyFile } from './classify';

export class UnsupportedFileError extends Error {
  constructor(label: string) {
    super(`${label} files aren't supported yet.`);
    this.name = 'UnsupportedFileError';
  }
}

/** Build the DocumentSource for an uploaded file, or throw for unsupported types. */
export function createFileSource(
  name: string,
  mime: string,
  buffer: ArrayBuffer,
): DocumentSource {
  const kind = classifyFile(name, mime);
  if (typeof kind === 'object') throw new UnsupportedFileError(kind.label);
  return kind === 'pdf'
    ? new PdfSource(buffer, name)
    : new TxtSource(buffer, name);
}
