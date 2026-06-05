// Kept free of source imports (pdfjs/mammoth/jszip touch browser globals at
// import time) so routing stays unit-testable in plain Node.

export type SupportedKind = 'pdf' | 'txt' | 'epub' | 'docx';

export interface Unsupported {
  unsupported: true;
  label: string;
}

function extension(name: string): string {
  const m = /\.([^.]+)$/.exec(name.toLowerCase());
  return m ? m[1]! : '';
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
