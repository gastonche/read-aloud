/**
 * Service worker — the message router and the only place that calls
 * chrome.sidePanel.open().
 *
 * Gesture preservation (the subtle MV3 bit):
 *   sidePanel.open() must be called in response to a user gesture. When the
 *   popup forwards the click via runtime.sendMessage, Chrome treats the SW's
 *   synchronous handling of that message as still inside the gesture — provided
 *   we call open() before awaiting anything else. So we open FIRST, then do any
 *   bookkeeping.
 */

import { onRuntimeMessage, sendTabMessage } from '@/messaging/bus';
import type {
  RuntimeMessage,
  Result,
  ExtractPageResponse,
} from '@/messaging/contract';

/** The built content-script path, read from the manifest (CRXJS hashes it). */
function contentScriptFiles(): string[] {
  const scripts = chrome.runtime.getManifest().content_scripts ?? [];
  return scripts.flatMap((s) => s.js ?? []);
}

/** Ask the page's content script to extract, injecting it first if absent. */
async function extractPage(tabId: number): Promise<ExtractPageResponse> {
  const ask = () =>
    sendTabMessage<ExtractPageResponse>(tabId, { type: 'READABILITY_EXTRACT' });
  try {
    return await ask();
  } catch {
    // No receiver yet (tab predates install, or just navigated). Inject the
    // content script on demand, then retry once.
    try {
      const files = contentScriptFiles();
      if (files.length === 0) throw new Error('no content script registered');
      await chrome.scripting.executeScript({ target: { tabId }, files });
      return await ask();
    } catch {
      return {
        ok: false,
        error:
          "Can't read this page. Chrome blocks extensions on some pages " +
          '(the Web Store, chrome:// pages, PDFs). Try a regular web page.',
      };
    }
  }
}

async function handleMessage(message: RuntimeMessage): Promise<Result> {
  switch (message.type) {
    case 'OPEN_SIDE_PANEL': {
      // Open synchronously-first to stay within the user gesture.
      await chrome.sidePanel.open({ tabId: message.tabId });
      return { ok: true };
    }

    case 'EXTRACT_PAGE': {
      return extractPage(message.tabId);
    }

    default: {
      // Exhaustiveness guard: this line fails to compile if a case is missed.
      const _exhaustive: never = message;
      return { ok: false, error: `Unhandled message: ${String(_exhaustive)}` };
    }
  }
}

onRuntimeMessage((message) => handleMessage(message));

// Clicking the toolbar icon shows the popup (default_popup). We keep the side
// panel strictly opened-on-demand so it never auto-opens on unrelated tabs.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => {
      /* setPanelBehavior is best-effort; ignore on unsupported builds. */
    });
});
