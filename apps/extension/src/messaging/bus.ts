/**
 * A thin, fully-typed wrapper over chrome.runtime / chrome.tabs messaging.
 *
 * Goals:
 *  - Callers send a typed message and get back the precisely-typed response
 *    (via RuntimeResponseMap) — no `any`, no manual casts.
 *  - chrome.runtime.lastError (the classic silent failure) is surfaced as a
 *    rejected promise so it can't be ignored.
 *  - Async message handlers work correctly: the listener returns `true` to keep
 *    the message channel open until the promise settles.
 */

import type {
  ContentMessage,
  RuntimeMessage,
  RuntimeResponseMap,
} from './contract';

/** Send a runtime message and resolve with its typed response. */
export function sendRuntimeMessage<M extends RuntimeMessage>(
  message: M,
): Promise<RuntimeResponseMap[M['type']]> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? 'runtime.sendMessage failed'));
        return;
      }
      resolve(response as RuntimeResponseMap[M['type']]);
    });
  });
}

/** Send a message to a specific tab's content script. */
export function sendTabMessage<R>(
  tabId: number,
  message: ContentMessage,
): Promise<R> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? 'tabs.sendMessage failed'));
        return;
      }
      resolve(response as R);
    });
  });
}

/**
 * Register a typed async handler for runtime messages. The handler returns a
 * promise; the response is sent when it settles. Returning `true` synchronously
 * is what keeps the sendResponse channel alive in MV3.
 */
export function onRuntimeMessage(
  handler: (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
  ) => Promise<unknown>,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // We only own our own contract; ignore anything that doesn't look like it.
    if (!message || typeof message.type !== 'string') return undefined;
    handler(message as RuntimeMessage, sender).then(
      (result) => sendResponse(result),
      (error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
    );
    return true; // keep the channel open for the async response
  });
}
