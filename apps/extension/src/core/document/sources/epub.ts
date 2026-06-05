// An EPUB is a ZIP of XHTML documents plus an OPF manifest defining reading
// order (the spine). We follow the spine and extract paragraph text directly —
// more reliable for headless extraction than driving epub.js's renderer.
// OPF/container elements are namespaced, so we resolve them by local name in
// any namespace rather than CSS selectors, which are unreliable on namespaced XML.

import JSZip from 'jszip';
import type { DocumentSource, RawDocument } from '@/core/document/types';
import { stripExtension } from './util';

export class EpubParseError extends Error {
  constructor(cause?: unknown) {
    super('Could not read this EPUB. It may be corrupt or DRM-protected.');
    this.name = 'EpubParseError';
    if (cause instanceof Error) this.cause = cause;
  }
}

const BLOCK_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, pre';

export class EpubSource implements DocumentSource {
  readonly kind = 'epub';
  constructor(
    private readonly buffer: ArrayBuffer,
    private readonly filename: string,
  ) {}

  async load(): Promise<RawDocument> {
    try {
      const zip = await JSZip.loadAsync(this.buffer);

      const container = parseXml(await readText(zip, 'META-INF/container.xml'));
      const opfPath = els(container, 'rootfile')[0]?.getAttribute('full-path');
      if (!opfPath) throw new Error('EPUB container has no rootfile');

      const opf = parseXml(await readText(zip, opfPath));
      const baseDir = opfPath.includes('/')
        ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1)
        : '';

      const hrefById = new Map<string, string>();
      for (const item of els(opf, 'item')) {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        if (id && href) hrefById.set(id, href);
      }
      const spine = els(opf, 'itemref')
        .map((ref) => ref.getAttribute('idref'))
        .map((id) => (id ? hrefById.get(id) : undefined))
        .filter((href): href is string => Boolean(href));

      const blocks: string[] = [];
      for (const href of spine) {
        const path = resolvePath(baseDir, href);
        const html = await readText(zip, path).catch(() => '');
        if (html) blocks.push(...blocksFromXhtml(html));
      }

      const title =
        els(opf, 'title')[0]?.textContent?.trim() ||
        stripExtension(this.filename);
      return { title, blocks };
    } catch (e) {
      throw new EpubParseError(e);
    }
  }
}

async function readText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path) ?? zip.file(decodeURIComponent(path));
  if (!file) throw new Error(`EPUB missing entry: ${path}`);
  return file.async('string');
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function els(doc: Document, localName: string): Element[] {
  return [...doc.getElementsByTagNameNS('*', localName)];
}

function blocksFromXhtml(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = [...doc.querySelectorAll(BLOCK_SELECTOR)]
    .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 0);
  if (blocks.length > 0) return blocks;
  const all = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return all ? [all] : [];
}

function resolvePath(base: string, href: string): string {
  const segments = (base + href).split('/');
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '..') out.pop();
    else if (seg !== '.' && seg !== '') out.push(seg);
  }
  return out.join('/');
}
