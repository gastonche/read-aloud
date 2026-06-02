// v0.2.0 M2 E2E — the on-page reader flow: START_PAGE_READER → floating bar
// mounts on the page → its controls drive on-page highlighting.
//
// Headless Chromium has no voices and we can't inject a fake into the content
// script's isolated world, so we exercise the bar→player→highlight→paint loop
// via the "Next sentence" control (seek emits a highlight without speaking).

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

const activeSentenceText = (page) =>
  page.evaluate(() => {
    const hl = CSS.highlights.get('readaloud-sentence');
    const r = hl ? [...hl][0] : null;
    return r ? r.toString() : null;
  });

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });
  const html = readFileSync(resolve(__dirname, 'fixtures', 'article.html'), 'utf-8');
  const server = createServer((_q, r) => {
    r.writeHead(200, { 'content-type': 'text/html' });
    r.end(html);
  });
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  const url = `http://localhost:${port}/`;

  const { context, openPage } = await launchExtension();
  const article = await context.newPage();
  await article.goto(url, { waitUntil: 'load' });

  // Article content length before the bar exists (the bar mounts on <html>,
  // outside <article>, and highlighting never mutates the DOM).
  const articleBefore = await article.evaluate(
    () => document.querySelector('article').innerHTML.length,
  );

  // Simulate the popup's "Read this page": message the SW to start the reader.
  const helper = await openPage('src/popup/index.html');
  const tabId = await helper.evaluate(async (u) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url?.startsWith(u))?.id ?? null;
  }, url);
  const started = await helper.evaluate(
    (id) => chrome.runtime.sendMessage({ type: 'START_PAGE_READER', tabId: id }),
    tabId,
  );
  check('SW started the page reader', started?.ok === true, JSON.stringify(started));

  // The floating bar mounts in a shadow host on the page (Play control visible).
  await article.waitForSelector('button[aria-label="Play"]', { timeout: 10_000 });
  check(
    'floating bar shows a Play control',
    (await article.locator('button[aria-label="Play"]').count()) === 1,
  );
  check(
    'bar host is attached to the page',
    (await article.locator('#readaloud-bar-host').count()) === 1,
  );

  // Let usePlayer finish loading (voices settle), then drive highlighting via
  // the Next control (no speech needed).
  await article.waitForTimeout(1300);
  await article.locator('button[aria-label="Next sentence"]').click();
  await article.waitForTimeout(150);
  const s1 = await activeSentenceText(article);
  check('Next paints an on-page sentence highlight', !!s1 && s1.length > 0, s1?.slice(0, 40));

  await article.locator('button[aria-label="Next sentence"]').click();
  await article.waitForTimeout(150);
  const s2 = await activeSentenceText(article);
  check('Next advances the highlight to a new sentence', !!s2 && s2 !== s1, s2?.slice(0, 40));

  // Voice popover → switch to Studio → neural voices listed.
  await article.locator('button[aria-label="Choose voice"]').click();
  await article.locator('button:has-text("Studio")').click();
  await article.waitForSelector('button[aria-label="Select Rachel"]', { timeout: 5_000 });
  check(
    'voice popover lists Studio voices',
    (await article.locator('button[aria-label="Select Rachel"]').count()) >= 1,
  );
  await article.locator('button[aria-label="Select Rachel"]').click(); // selects + closes

  // Speed popover opens.
  await article.locator('button[aria-label="Reading speed"]').click();
  check(
    'speed popover shows the vertical slider',
    (await article.locator('[role="slider"][aria-label="Reading speed"]').count()) === 1,
  );
  await article.locator('button[aria-label="Reading speed"]').click(); // close

  await article.screenshot({ path: resolve(SHOTS, 'page-bar.png') });

  // Drag the bar to the top-left corner; the anchor snaps and persists.
  const grip = await article.locator('button[aria-label="Move bar"]').boundingBox();
  await article.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await article.mouse.down();
  await article.mouse.move(90, 90, { steps: 10 });
  await article.mouse.up();
  await article.waitForTimeout(200);
  const stored = await helper.evaluate(() =>
    chrome.storage.local.get('readaloud:barAnchor'),
  );
  check(
    'drag snaps to a corner and persists the anchor',
    stored['readaloud:barAnchor'] === 'top-left',
    JSON.stringify(stored),
  );
  await article.screenshot({ path: resolve(SHOTS, 'page-bar-dragged.png') });

  const articleAfter = await article.evaluate(
    () => document.querySelector('article').innerHTML.length,
  );
  check('article DOM is unchanged (zero mutation)', articleBefore === articleAfter, `${articleBefore} vs ${articleAfter}`);

  // Close removes the bar and clears highlights.
  await article.locator('button[aria-label="Close ReadAloud"]').click();
  await article.waitForTimeout(150);
  check('Close removes the bar', (await article.locator('#readaloud-bar-host').count()) === 0);
  const cleared = await article.evaluate(
    () => [...(CSS.highlights.get('readaloud-sentence') ?? [])].length,
  );
  check('Close clears on-page highlighting', cleared === 0);

  await context.close();
  server.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
