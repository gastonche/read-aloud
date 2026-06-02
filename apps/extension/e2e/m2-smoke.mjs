// Milestone 2 E2E smoke test — the real page flow, end to end.
//
// Serves a fixture article over HTTP, opens it in a tab (so the declared
// content script injects), seeds a {kind:'page'} handoff pointing at that tab,
// opens the side panel, and verifies the reader view renders the extracted
// article — while Readability strips the nav/ads/footer chrome.

import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtension, SHOTS } from './launch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

let failures = 0;
const check = (name, cond, extra = '') => {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const PANEL = 'src/sidepanel/index.html';
const POPUP = 'src/popup/index.html';

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });

  // 1. Serve the fixture article over HTTP (content scripts match http://).
  const html = readFileSync(
    resolve(__dirname, 'fixtures', 'article.html'),
    'utf-8',
  );
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  const articleUrl = `http://localhost:${port}/`;

  const { context, openPage, seedHandoff } = await launchExtension();

  // 2. Open the article so the declared content script injects.
  const articleTab = await context.newPage();
  await articleTab.goto(articleUrl, { waitUntil: 'load' });

  // 3. Resolve that tab's chrome tabId from an extension page.
  const helper = await openPage(POPUP);
  const tabId = await helper.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url?.startsWith(url))?.id ?? null;
  }, articleUrl);
  check('resolved article tabId', tabId != null, String(tabId));

  // 4. Stage the page handoff and boot the side panel.
  await seedHandoff(helper, {
    kind: 'page',
    tabId,
    title: 'The History of Tea',
  });
  const panel = await openPage(PANEL);
  await panel.waitForSelector('article.reader h1', { timeout: 15_000 });

  const title = await panel.locator('article.reader h1').innerText();
  check('reader shows the article title', title.includes('History of Tea'), title);

  const body = await panel.locator('article.reader').innerText();
  check(
    'reader includes article body text',
    body.includes('most widely consumed drink'),
  );
  check(
    'reader includes second paragraph',
    body.includes('discovered in ancient China'),
  );

  // 5. Readability should have stripped nav / ad / footer chrome.
  check('nav link text stripped', !body.includes('Subscribe now'));
  check('ad text stripped', !body.includes('SPONSORED'));
  check('footer text stripped', !body.includes('All rights reserved'));

  // 6. Per-word spans exist (the highlighting substrate for M4).
  const wordSpans = await panel.locator('[data-word-index]').count();
  check('renders per-word spans for highlighting', wordSpans > 20, String(wordSpans));

  // 7. Word count shown in header.
  const header = await panel.locator('header').innerText();
  check('header shows a word count', /\d+ words/.test(header), header.replace(/\n/g, ' '));

  await panel.screenshot({ path: resolve(SHOTS, 'm2-reader.png'), fullPage: true });

  await context.close();
  server.close();

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
