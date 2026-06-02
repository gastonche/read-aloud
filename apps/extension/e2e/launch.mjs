// Reusable Playwright launcher for the built ReadAloud extension.
//
// Launches system Chrome with the unpacked dist/ loaded, waits for the MV3
// service worker to register, and returns { context, extensionId, ... } plus
// helpers for opening the extension's own pages (popup / side panel) and for
// seeding the storage.session handoff that the side panel consumes on boot.
//
// Used by the per-milestone smoke scripts so each one stays focused on its
// assertions rather than browser plumbing.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DIST = resolve(__dirname, '..', 'dist');
export const SHOTS = resolve(__dirname, 'screenshots');
const HANDOFF_KEY = 'readaloud:pendingSource';

export async function launchExtension() {
  const userDataDir = mkdtempSync(resolve(tmpdir(), 'readaloud-e2e-'));
  // NOTE: must use Playwright's bundled full Chromium (channel: 'chromium'),
  // NOT system Chrome. Chrome 137+ permanently disabled the --load-extension
  // command-line switch; the open-source chromium build still honours it and
  // its new-headless mode supports MV3 extensions + service workers.
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      '--no-first-run',
    ],
  });

  // The service worker URL embeds the extension id: chrome-extension://<id>/...
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 15_000 });
  const extensionId = new URL(sw.url()).host;

  const pageUrl = (path) => `chrome-extension://${extensionId}/${path}`;

  /** Open one of the extension's own documents as a page. */
  const openPage = async (path) => {
    const page = await context.newPage();
    await page.goto(pageUrl(path));
    return page;
  };

  /** Seed the handoff the side panel reads on boot. */
  const seedHandoff = async (page, source) => {
    await page.evaluate(
      ([key, src]) => chrome.storage.session.set({ [key]: src }),
      [HANDOFF_KEY, source],
    );
  };

  return { context, extensionId, sw, openPage, seedHandoff, pageUrl };
}
