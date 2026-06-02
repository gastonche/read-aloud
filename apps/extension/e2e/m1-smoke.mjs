// Milestone 1 E2E smoke test — drives the real built extension in Chrome.
//
// Verifies:
//   1. The extension loads and its MV3 service worker registers (we get an id).
//   2. The popup renders the two-choice chooser and the upload view.
//   3. The service worker answers OPEN_SIDE_PANEL (and fails gracefully on a
//      bogus tab id — proving the message contract + error envelope work).
//   4. The side panel's boot handoff: empty state with nothing staged; a
//      "Handoff received" receipt with matching decoded bytes once a file
//      source is staged in storage.session.
//
// Screenshots land in e2e/screenshots/ for visual review.

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchExtension, SHOTS } from './launch.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const POPUP = 'src/popup/index.html';
const PANEL = 'src/sidepanel/index.html';

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });
  const { context, extensionId, openPage, seedHandoff } =
    await launchExtension();
  check('extension loaded (service worker id resolved)', !!extensionId, extensionId);

  // ── Popup: chooser ───────────────────────────────────────────────
  const popup = await openPage(POPUP);
  await popup.waitForSelector('text=Read this page');
  check(
    'popup shows both choices',
    (await popup.locator('text=Read this page').count()) === 1 &&
      (await popup.locator('text=Upload a file').count()) === 1,
  );
  await popup.screenshot({ path: resolve(SHOTS, 'm1-popup-choose.png') });

  // ── Popup: upload view ───────────────────────────────────────────
  await popup.locator('text=Upload a file').click();
  await popup.waitForSelector('text=Drag a file here');
  check(
    'upload view shows drop zone',
    (await popup.locator('text=Drag a file here').count()) === 1,
  );
  await popup.screenshot({ path: resolve(SHOTS, 'm1-popup-upload.png') });

  // ── Service worker: message contract + graceful failure ──────────
  const swResp = await popup.evaluate(() =>
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', tabId: -1 }),
  );
  check(
    'SW handles OPEN_SIDE_PANEL and reports failure for a bogus tab',
    swResp && swResp.ok === false && typeof swResp.error === 'string',
    JSON.stringify(swResp),
  );

  // ── Side panel: empty boot state ─────────────────────────────────
  const panelEmpty = await openPage(PANEL);
  await panelEmpty.waitForSelector('text=No content yet');
  check(
    'side panel shows empty state with no handoff',
    (await panelEmpty.locator('text=No content yet').count()) === 1,
  );
  await panelEmpty.screenshot({ path: resolve(SHOTS, 'm1-panel-empty.png') });

  // ── Side panel: file handoff receipt ─────────────────────────────
  const content = 'ReadAloud milestone one handoff payload.';
  const dataBase64 = Buffer.from(content, 'utf-8').toString('base64');
  const fileSource = {
    kind: 'file',
    name: 'sample.txt',
    mime: 'text/plain',
    size: content.length,
    dataBase64,
  };
  const seeder = await openPage(PANEL); // any extension page can write storage
  await seedHandoff(seeder, fileSource);
  const panelFile = await openPage(PANEL);
  await panelFile.waitForSelector('text=Handoff received');
  const bodyText = await panelFile.locator('body').innerText();
  check('side panel renders file receipt', bodyText.includes('sample.txt'));
  check(
    'decoded bytes match staged size (✓ bytes match)',
    bodyText.includes('bytes match'),
  );
  await panelFile.screenshot({ path: resolve(SHOTS, 'm1-panel-file.png') });

  // ── Side panel: page handoff receipt ─────────────────────────────
  await seedHandoff(seeder, { kind: 'page', tabId: 4242, title: 'Example Article' });
  const panelPage = await openPage(PANEL);
  await panelPage.waitForSelector('text=Handoff received');
  const pageText = await panelPage.locator('body').innerText();
  check('side panel renders page receipt', pageText.includes('Example Article'));
  check('page receipt shows tab id', pageText.includes('4242'));
  await panelPage.screenshot({ path: resolve(SHOTS, 'm1-panel-page.png') });

  await context.close();

  console.log(
    `\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`,
  );
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
