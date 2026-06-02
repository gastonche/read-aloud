import { describe, it, expect } from 'vitest';
import { TxtSource } from './txt';
import { classifyFile } from './classify';
import { stripExtension } from './util';

// NOTE: PdfSource / createFileSource pull in pdfjs-dist, which touches browser
// globals (DOMMatrix) at import time and can't load under Node. The routing
// logic lives in the pure `classifyFile` (tested here); PDF parsing itself is
// covered by the M3 E2E test in a real browser.

const buf = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe('stripExtension', () => {
  it('drops the extension and any directory prefix', () => {
    expect(stripExtension('report.pdf')).toBe('report');
    expect(stripExtension('/a/b/notes.final.txt')).toBe('notes.final');
    expect(stripExtension('noext')).toBe('noext');
  });
});

describe('TxtSource', () => {
  it('splits on blank lines into paragraph blocks', async () => {
    const raw = await new TxtSource(
      buf('First paragraph here.\n\nSecond paragraph here.'),
      'doc.txt',
    ).load();
    expect(raw.title).toBe('doc');
    expect(raw.blocks).toEqual([
      'First paragraph here.',
      'Second paragraph here.',
    ]);
  });

  it('joins soft-wrapped lines within a paragraph and collapses whitespace', async () => {
    const raw = await new TxtSource(
      buf('A line that is\nsoft wrapped.\n\nNext.'),
      'x.txt',
    ).load();
    expect(raw.blocks[0]).toBe('A line that is soft wrapped.');
  });
});

describe('classifyFile', () => {
  it('routes PDFs by MIME and by extension', () => {
    expect(classifyFile('a.pdf', 'application/pdf')).toBe('pdf');
    expect(classifyFile('a.pdf', 'application/octet-stream')).toBe('pdf');
  });

  it('routes text/* and .txt/.md to txt', () => {
    expect(classifyFile('a.txt', 'text/plain')).toBe('txt');
    expect(classifyFile('a.md', '')).toBe('txt');
  });

  it('routes EPUB by MIME and extension', () => {
    expect(classifyFile('b.epub', 'application/epub+zip')).toBe('epub');
    expect(classifyFile('b.epub', '')).toBe('epub');
  });

  it('routes DOCX by MIME and extension', () => {
    expect(
      classifyFile(
        'b.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx');
    expect(classifyFile('b.docx', '')).toBe('docx');
  });

  it('reports unknown extensions as unsupported with a label', () => {
    expect(classifyFile('b.rtf', '')).toEqual({
      unsupported: true,
      label: 'RTF',
    });
    expect(classifyFile('b.xyz', '')).toMatchObject({ unsupported: true });
  });
});
