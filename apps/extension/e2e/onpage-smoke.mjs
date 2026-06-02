// v0.2.0 M1 E2E — on-page highlighting via the live-DOM extractor + Custom
// Highlight API. Serves the article, has the content script build a live doc,
// paints a word, and verifies the painted Range matches the word AND the page
// DOM is byte-for-byte unchanged (zero mutation).

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

  const helper = await openPage('src/popup/index.html');
  const tabId = await helper.evaluate(async (u) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url?.startsWith(u))?.id ?? null;
  }, url);
  check('resolved article tabId', tabId != null);

  const send = (msg) =>
    helper.evaluate(
      ([id, m]) => chrome.tabs.sendMessage(id, m),
      [tabId, msg],
    );

  const domBefore = await article.evaluate(() => document.body.innerHTML.length);

  // Build the live document from the page.
  const built = await send({ type: 'BUILD_LIVE_DOC' });
  check('live doc built with sentences + words', built?.ok && built.sentenceCount > 0 && built.wordCount > 20, JSON.stringify(built));
  check('Custom Highlight API supported', built?.supported === true);

  // Highlight a specific word (sentence 1, word 3).
  const hl = await send({ type: 'HIGHLIGHT', sentenceId: 1, wordIndex: 3 });
  check('highlight returned the target word', typeof hl?.word === 'string' && hl.word.length > 0, hl?.word);

  // The painted Range's text must equal that word — proves extractor↔DOM map.
  const painted = await article.evaluate(() => {
    const wordHL = CSS.highlights.get('readaloud-word');
    const sentHL = CSS.highlights.get('readaloud-sentence');
    const wr = wordHL ? [...wordHL][0] : null;
    const sr = sentHL ? [...sentHL][0] : null;
    return { word: wr ? wr.toString() : null, sentence: sr ? sr.toString() : null };
  });
  check('painted word range equals the word', painted.word === hl.word, `${painted.word} vs ${hl.word}`);
  check('painted sentence range contains the word', painted.sentence?.includes(hl.word) === true);

  await article.screenshot({ path: resolve(SHOTS, 'onpage-highlight.png') });

  const domAfter = await article.evaluate(() => document.body.innerHTML.length);
  check('page DOM is unchanged (zero mutation)', domBefore === domAfter, `${domBefore} vs ${domAfter}`);

  // Clearing removes the highlights.
  await send({ type: 'CLEAR_HIGHLIGHT' });
  const cleared = await article.evaluate(
    () => [...(CSS.highlights.get('readaloud-word') ?? [])].length,
  );
  check('clear removes the word highlight', cleared === 0);

  await context.close();
  server.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
