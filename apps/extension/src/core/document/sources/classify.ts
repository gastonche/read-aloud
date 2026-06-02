/**
 * Pure file-type classification — kept free of any source imports (especially
 * pdfjs, which touches browser globals at import time) so the routing logic is
 * unit-testable in a plain Node environment.
 */

export type SupportedKind = 'pdf' | 'txt';

export interface Unsupported {
  unsupported: true;
  /** Human label for the rejected type, e.g. "EPUB". */
  label: string;
}

function extension(name: string): string {
  const m = /\.([^.]+)$/.exec(name.toLowerCase());
  return m ? m[1]! : '';
}

/** Decide how to handle a file from its name + MIME, or report it unsupported. */
export function classifyFile(
  name: string,
  mime: string,
): SupportedKind | Unsupported {
  const ext = extension(name);
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md') return 'txt';
  if (ext === 'epub') return { unsupported: true, label: 'EPUB' };
  if (ext === 'docx') return { unsupported: true, label: 'DOCX' };
  return { unsupported: true, label: ext ? ext.toUpperCase() : 'These' };
}
