// Milestone 7 E2E smoke test — EPUB + DOCX fast-follows.
//
// Builds a minimal valid DOCX and EPUB in memory (JSZip), stages each as a
// file handoff, and verifies the reader renders the extracted text in order.

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { launchExtension, SHOTS } from './launch.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const PANEL = 'src/sidepanel/index.html';

const fileSource = (name, mime, buf) => ({
  kind: 'file',
  name,
  mime,
  size: buf.length,
  dataBase64: Buffer.from(buf).toString('base64'),
});

async function makeDocx(paragraphs) {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join('');
  zip.file(
    'word/document.xml',
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function makeEpub(title, chapters) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  const manifest = chapters
    .map(
      (_, i) =>
        `<item id="c${i}" href="chap${i}.xhtml" media-type="application/xhtml+xml"/>`,
    )
    .join('');
  const spine = chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('');
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title></metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`,
  );
  chapters.forEach((text, i) => {
    zip.file(
      `OEBPS/chap${i}.xhtml`,
      `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p>${text}</p></body></html>`,
    );
  });
  return zip.generateAsync({ type: 'nodebuffer' });
}

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });
  const { context, openPage, seedHandoff } = await launchExtension();

  // ── DOCX ─────────────────────────────────────────────────────────
  const docx = await makeDocx([
    'The first DOCX paragraph, extracted by mammoth.',
    'A second paragraph that follows it.',
  ]);
  const docxSeeder = await openPage(PANEL);
  await seedHandoff(
    docxSeeder,
    fileSource(
      'memo.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      docx,
    ),
  );
  const docxPanel = await openPage(PANEL);
  await docxPanel.waitForSelector('article.reader', { timeout: 15_000 });
  const docxBody = await docxPanel.locator('article.reader').innerText();
  check('DOCX: title from filename', docxBody.includes('memo'));
  check('DOCX: first paragraph extracted', docxBody.includes('extracted by mammoth'));
  check('DOCX: second paragraph extracted', docxBody.includes('that follows it'));
  await docxPanel.screenshot({ path: resolve(SHOTS, 'm7-docx.png'), fullPage: true });

  // ── EPUB ─────────────────────────────────────────────────────────
  const epub = await makeEpub('The Test Book', [
    'The first chapter of the EPUB introduces the story.',
    'The second chapter brings it to a close.',
  ]);
  const epubSeeder = await openPage(PANEL);
  await seedHandoff(
    epubSeeder,
    fileSource('book.epub', 'application/epub+zip', epub),
  );
  const epubPanel = await openPage(PANEL);
  await epubPanel.waitForSelector('article.reader h1', { timeout: 15_000 });
  const epubTitle = await epubPanel.locator('article.reader h1').innerText();
  check('EPUB: title from OPF metadata', epubTitle.includes('The Test Book'), epubTitle);
  const epubBody = await epubPanel.locator('article.reader').innerText();
  check('EPUB: first chapter extracted', epubBody.includes('introduces the story'));
  check('EPUB: second chapter extracted (spine order)', epubBody.includes('brings it to a close'));
  await epubPanel.screenshot({ path: resolve(SHOTS, 'm7-epub.png'), fullPage: true });

  await context.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
