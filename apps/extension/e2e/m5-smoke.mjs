// Milestone 5 E2E smoke test — TL;DR against the live local Worker.
//
// Requires the dev Worker running at http://localhost:8787 (mock summarizer):
//   (cd apps/worker && npx wrangler dev --port 8787)
// The e2e runner (npm run e2e) starts/stops it automatically.
//
// Verifies: the panel calls the Worker, renders the returned summary, and
// "Read aloud" switches the reader to the summary doc and plays it (with the
// fake speechSynthesis driving highlighting).

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchExtension, SHOTS } from './launch.mjs';
import { installFakeSpeech } from './fake-speech.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const PANEL = 'src/sidepanel/index.html';

const txtFile = (text) => ({
  kind: 'file',
  name: 'article.txt',
  mime: 'text/plain',
  size: text.length,
  dataBase64: Buffer.from(text, 'utf-8').toString('base64'),
});

const TEXT =
  'Tea is an aromatic beverage made by steeping leaves in hot water. ' +
  'It is the second most consumed drink in the world after water. ' +
  'Tea was first discovered in ancient China and spread across the globe.';

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });

  // Confirm the Worker is up before driving the UI (clearer failure if not).
  const health = await fetch('http://localhost:8787/health').then(
    (r) => r.json(),
    () => null,
  );
  check('local Worker reachable', health?.ok === true, JSON.stringify(health));

  const { context, openPage, seedHandoff } = await launchExtension();
  await context.addInitScript(installFakeSpeech, { fireBoundaries: true });

  const seeder = await openPage(PANEL);
  await seedHandoff(seeder, txtFile(TEXT));
  const panel = await openPage(PANEL);
  await panel.waitForSelector('article.reader', { timeout: 15_000 });

  // TL;DR (in the top bar) → summary card in the body.
  await panel.locator('button:has-text("TL;DR")').click();
  await panel.waitForSelector('text=mock summary', { timeout: 15_000 });
  const card = await panel.locator('text=mock summary').count();
  check('summary returned from the Worker and rendered', card >= 1);
  await panel.screenshot({ path: resolve(SHOTS, 'm5-summary.png'), fullPage: true });

  // Read aloud → reader switches to the summary doc and plays it.
  await panel.locator('button:has-text("Read aloud")').click();
  await panel.waitForSelector('article.reader h1:has-text("TL;DR —")', {
    timeout: 10_000,
  });
  check('reader switched to the summary document', true);
  await panel.waitForSelector('article.reader .bg-accent', { timeout: 10_000 });
  check('summary is highlighted while read aloud', true);

  // Back to the full document.
  await panel.locator('button:has-text("Back to the full document")').click();
  await panel.waitForSelector('article.reader h1:has-text("article")', {
    timeout: 10_000,
  });
  check('back-to-document restores the original reader', true);

  await context.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
