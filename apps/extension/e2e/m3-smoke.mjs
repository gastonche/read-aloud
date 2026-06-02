// Milestone 3 E2E smoke test — the file flow (PDF + TXT), end to end.
//
// Builds a real single-page PDF (valid xref) and a TXT in memory, stages each
// as a {kind:'file'} handoff, boots the side panel, and verifies the reader
// renders the parsed text. Also fails loudly on any pdf.js worker / CSP error
// in the panel console.

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchExtension, SHOTS } from './launch.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const PANEL = 'src/sidepanel/index.html';

/** Build a minimal, valid single-page PDF with the given text lines. */
function makePdf(lines) {
  const esc = (s) => s.replace(/([()\\])/g, '\\$1');
  const content =
    'BT /F1 18 Tf 72 720 Td ' +
    lines
      .map((l, i) => `${i ? '0 -28 Td ' : ''}(${esc(l)}) Tj `)
      .join('') +
    'ET';
  const objs = [
    '<</Type /Catalog /Pages 2 0 R>>',
    '<</Type /Pages /Kids [3 0 R] /Count 1>>',
    '<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>> >> >>',
    `<</Length ${Buffer.byteLength(content, 'latin1')}>>\nstream\n${content}\nendstream`,
    '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<</Size ${objs.length + 1} /Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

const fileSource = (name, mime, buffer) => ({
  kind: 'file',
  name,
  mime,
  size: buffer.length,
  dataBase64: buffer.toString('base64'),
});

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });
  const { context, openPage, seedHandoff } = await launchExtension();

  // ── TXT ──────────────────────────────────────────────────────────
  const txt = Buffer.from(
    'ReadAloud reads text files.\n\nThis is the second paragraph of the document.',
    'utf-8',
  );
  const seeder = await openPage(PANEL);
  await seedHandoff(seeder, fileSource('notes.txt', 'text/plain', txt));
  const txtPanel = await openPage(PANEL);
  await txtPanel.waitForSelector('article.reader', { timeout: 15_000 });
  const txtBody = await txtPanel.locator('article.reader').innerText();
  check('TXT: title from filename', txtBody.includes('notes'), '');
  check('TXT: first paragraph rendered', txtBody.includes('reads text files'));
  check('TXT: second paragraph rendered', txtBody.includes('second paragraph'));
  await txtPanel.screenshot({ path: resolve(SHOTS, 'm3-txt.png'), fullPage: true });

  // ── PDF (watch the console for worker/CSP errors) ────────────────
  const pdfErrors = [];
  const pdfPanel = await openPage(PANEL);
  pdfPanel.on('console', (m) => {
    if (m.type() === 'error') pdfErrors.push(m.text());
  });
  const pdf = makePdf([
    'Hello from a generated PDF.',
    'ReadAloud parses each page.',
    'Highlighting comes next.',
  ]);
  await seedHandoff(pdfPanel, fileSource('report.pdf', 'application/pdf', pdf));
  await pdfPanel.reload();
  pdfPanel.on('console', (m) => {
    if (m.type() === 'error') pdfErrors.push(m.text());
  });
  await pdfPanel.waitForSelector('article.reader', { timeout: 20_000 });
  const pdfBody = await pdfPanel.locator('article.reader').innerText();
  check('PDF: extracted first line', pdfBody.includes('generated PDF'), '');
  check('PDF: extracted second line', pdfBody.includes('parses each page'));
  check('PDF: per-word spans present', (await pdfPanel.locator('[data-word-index]').count()) > 5);
  check(
    'PDF: no worker/CSP errors in panel console',
    pdfErrors.length === 0,
    pdfErrors.join(' | '),
  );
  await pdfPanel.screenshot({ path: resolve(SHOTS, 'm3-pdf.png'), fullPage: true });

  // ── Unsupported type → graceful error ────────────────────────────
  const errPanel = await openPage(PANEL);
  await seedHandoff(
    errPanel,
    fileSource('notes.rtf', 'application/rtf', Buffer.from('x')),
  );
  await errPanel.reload();
  await errPanel.waitForSelector('text=Try again', { timeout: 15_000 });
  const errText = await errPanel.locator('body').innerText();
  check(
    'unsupported type (RTF) shows graceful error',
    errText.includes("aren't supported yet"),
    '',
  );
  await errPanel.screenshot({ path: resolve(SHOTS, 'm3-unsupported.png') });

  await context.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
