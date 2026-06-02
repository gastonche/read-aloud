/**
 * Pure file-type classification — kept free of any source imports (especially
 * pdfjs/mammoth/jszip, which touch browser globals at import time) so the
 * routing logic is unit-testable in a plain Node environment.
 */

export type SupportedKind = 'pdf' | 'txt' | 'epub' | 'docx';

export interface Unsupported {
  unsupported: true;
  /** Human label for the rejected type, e.g. "RTF". */
  label: string;
}

function extension(name: string): string {
  const m = /\.([^.]+)$/.exec(name.toLowerCase());
  return m ? m[1]! : '';
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Decide how to handle a file from its name + MIME, or report it unsupported. */
export function classifyFile(
  name: string,
  mime: string,
): SupportedKind | Unsupported {
  const ext = extension(name);
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime === 'application/epub+zip' || ext === 'epub') return 'epub';
  if (mime === DOCX_MIME || ext === 'docx') return 'docx';
  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md') return 'txt';
  return { unsupported: true, label: ext ? ext.toUpperCase() : 'These' };
}
