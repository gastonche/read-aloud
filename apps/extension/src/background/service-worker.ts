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

import { onRuntimeMessage } from '@/messaging/bus';
import type { RuntimeMessage, Result } from '@/messaging/contract';

async function handleMessage(message: RuntimeMessage): Promise<Result> {
  switch (message.type) {
    case 'OPEN_SIDE_PANEL': {
      // Open synchronously-first to stay within the user gesture.
      await chrome.sidePanel.open({ tabId: message.tabId });
      return { ok: true };
    }

    case 'EXTRACT_PAGE': {
      // Wired in milestone 2 (Readability extraction).
      return { ok: false, error: 'EXTRACT_PAGE not implemented until M2' };
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
