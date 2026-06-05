import { onRuntimeMessage, sendTabMessage } from '@/messaging/bus';
import type {
  RuntimeMessage,
  Result,
  ExtractPageResponse,
  WorkerFetchResponse,
} from '@/messaging/contract';
import { WORKER_BASE_URL } from '@/config';
import { stagePendingSource } from '@/core/handoff';
import type { ReaderPendingSource } from '@/messaging/contract';

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
    // No receiver yet (tab predates install, or just navigated): inject on demand.
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

const RESTRICTED_PAGE_ERROR =
  "Can't read this page. Chrome blocks extensions on some pages " +
  '(the Web Store, chrome:// pages, PDFs). Try a regular web page.';

async function startPageReader(tabId: number): Promise<Result> {
  const show = () => sendTabMessage<Result>(tabId, { type: 'SHOW_BAR' });
  try {
    return await show();
  } catch {
    try {
      const files = contentScriptFiles();
      if (files.length === 0) throw new Error('no content script registered');
      await chrome.scripting.executeScript({ target: { tabId }, files });
      return await show();
    } catch {
      return { ok: false, error: RESTRICTED_PAGE_ERROR };
    }
  }
}

/** Proxy a request to the Worker from the SW (off the page's CSP/origin). */
async function workerFetch(
  path: string,
  body: unknown,
  method: 'GET' | 'POST' = 'POST',
): Promise<WorkerFetchResponse> {
  try {
    const res = await fetch(`${WORKER_BASE_URL}${path}`, {
      method,
      ...(method === 'POST'
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : {}),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        error: err?.error ?? `Worker error (${res.status}).`,
      };
    }
    return { ok: true, data: await res.json() };
  } catch {
    return {
      ok: false,
      error: `Couldn't reach the ReadAloud server at ${WORKER_BASE_URL}.`,
    };
  }
}

async function openAdvanced(
  handoff: ReaderPendingSource,
  sender: chrome.runtime.MessageSender,
): Promise<Result> {
  const tabId = sender.tab?.id;
  if (tabId == null)
    return { ok: false, error: 'No tab to open the panel for.' };
  // sidePanel.open() must run WITHIN the forwarded gesture: kick it off
  // synchronously before any await, then stage the handoff (read by the panel on boot).
  let opening: Promise<void>;
  try {
    opening = chrome.sidePanel.open({ tabId });
  } catch (e) {
    opening = Promise.reject(e);
  }
  await stagePendingSource(handoff);
  await opening.catch(() => {
    /* headless / lost-gesture: handoff is still staged for the panel */
  });
  return { ok: true };
}

async function handleMessage(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
): Promise<Result> {
  switch (message.type) {
    case 'WORKER_FETCH': {
      return workerFetch(message.path, message.body, message.method ?? 'POST');
    }

    case 'OPEN_SIDE_PANEL': {
      // Open first (no prior await) to stay within the user gesture.
      await chrome.sidePanel.open({ tabId: message.tabId });
      return { ok: true };
    }

    case 'OPEN_ADVANCED': {
      return openAdvanced(message.handoff, sender);
    }

    case 'EXTRACT_PAGE': {
      return extractPage(message.tabId);
    }

    case 'START_PAGE_READER': {
      return startPageReader(message.tabId);
    }

    default: {
      // Exhaustiveness guard: this line fails to compile if a case is missed.
      const _exhaustive: never = message;
      return { ok: false, error: `Unhandled message: ${String(_exhaustive)}` };
    }
  }
}

onRuntimeMessage((message, sender) => handleMessage(message, sender));

// Keep the side panel strictly opened-on-demand so it never auto-opens on unrelated tabs.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => {
      /* setPanelBehavior is best-effort; ignore on unsupported builds. */
    });
});
