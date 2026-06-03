// v0.2.0 M4 E2E — advanced mode: the on-page bar hands its document + position
// to the side panel, which continues from the same sentence.

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

  const { context, openPage, sw } = await launchExtension();
  const article = await context.newPage();
  await article.goto(url, { waitUntil: 'load' });

  const helper = await openPage('src/popup/index.html');
  const tabId = await helper.evaluate(async (u) => {
    const t = await chrome.tabs.query({});
    return t.find((x) => x.url?.startsWith(u))?.id ?? null;
  }, url);
  await helper.evaluate(
    (id) => chrome.runtime.sendMessage({ type: 'START_PAGE_READER', tabId: id }),
    tabId,
  );
  await article.waitForSelector('button[aria-label="Play"]', { timeout: 10_000 });
  await article.waitForTimeout(1300);

  // Advance to sentence 2 on the page, then go to advanced mode.
  await article.locator('button[aria-label="Next sentence"]').click();
  await article.waitForTimeout(120);
  await article.locator('button[aria-label="Next sentence"]').click();
  await article.waitForTimeout(120);
  const onPageSentence = await article.evaluate(() => {
    const h = CSS.highlights.get('readaloud-sentence');
    const r = h ? [...h][0] : null;
    return r ? r.toString().replace(/\s+/g, ' ').trim() : null;
  });

  // advanced mode opens the side panel *within the forwarded user gesture*, so
  // the panel auto-opens and consumes the staged handoff. Headless Chromium
  // doesn't surface that side-panel view as a Playwright page, and the consume
  // is racy to observe — so we capture the exact handoff the bar emits with our
  // own SW onMessage listener (fires alongside the real handler), which is
  // deterministic, then re-seed it to drive a panel page we *can* inspect.
  await sw.evaluate(() => {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === 'OPEN_ADVANCED') {
        void chrome.storage.local.set({ __test_handoff: msg.handoff });
      }
      // No return — let the real OPEN_ADVANCED handler own the response.
    });
  });

  await article.locator('button[aria-label="Open advanced reader"]').click();
  await article.waitForTimeout(300);

  // The bar closed; the captured message carries the doc + playback position.
  check('bar closed on advanced', (await article.locator('#readaloud-bar-host').count()) === 0);
  const { __test_handoff: src } = await helper.evaluate(() =>
    chrome.storage.local.get('__test_handoff'),
  );
  check('reader handoff emitted with the doc', src?.kind === 'reader' && src.doc?.blocks?.length > 0, JSON.stringify(src?.kind));
  check('handoff carries the current sentence (2)', src?.sentenceId === 2, String(src?.sentenceId));

  // Let the auto-opened panel finish its boot poll + consume, then re-seed the
  // captured handoff and open a panel page we can read, to prove the side panel
  // renders the doc and continues from the same sentence.
  await article.waitForTimeout(1700);
  await helper.evaluate(
    (h) => chrome.storage.session.set({ 'readaloud:pendingSource': h }),
    src,
  );
  const panel = await openPage(PANEL);
  await panel.waitForSelector('article.reader', { timeout: 15_000 });
  await panel.waitForTimeout(400);
  check(
    'panel renders the handed-off document',
    (await panel.locator('article.reader h1').innerText()).includes('History of Tea'),
  );
  const panelSentence = await panel.evaluate(() => {
    const el = document.querySelector('article.reader .bg-accent-soft');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  check(
    'panel continues from the same sentence as the page',
    !!panelSentence && !!onPageSentence && panelSentence.includes(onPageSentence.slice(0, 15)),
    `${panelSentence?.slice(0, 30)} | ${onPageSentence?.slice(0, 30)}`,
  );
  await panel.screenshot({ path: resolve(SHOTS, 'advanced-handoff.png'), fullPage: true });

  await context.close();
  server.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
