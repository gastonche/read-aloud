// Typed wrapper over chrome.runtime / chrome.tabs messaging. Surfaces
// chrome.runtime.lastError (the classic silent failure) as a rejected promise.

import type {
  ContentMessage,
  RuntimeMessage,
  RuntimeResponseMap,
} from './contract';

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
