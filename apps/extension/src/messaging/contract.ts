/**
 * The intra-extension message contract: popup ↔ service worker ↔ side panel,
 * plus service worker ↔ content script.
 *
 * The popup owns no long-lived state: it stages a "pending source" into
 * chrome.storage.session and asks the SW to open the panel. The panel learns
 * what to do by PULLING that source on boot rather than receiving an SW→panel
 * push, because the panel document may not exist yet when the SW runs.
 */

import type { NormalizedDoc } from '@/core/document/types';

export const HANDOFF_KEY = 'readaloud:pendingSource';

export interface PagePendingSource {
  kind: 'page';
  tabId: number;
  title?: string;
}

export interface FilePendingSource {
  kind: 'file';
  name: string;
  mime: string;
  size: number;
  /** base64 of the file's ArrayBuffer. */
  dataBase64: string;
}

/** Advanced mode: the on-page bar hands its doc + playback state to the panel. */
export interface ReaderPendingSource {
  kind: 'reader';
  doc: NormalizedDoc;
  sentenceId: number;
  rate: number;
  engineId: 'web-speech' | 'elevenlabs';
  voiceId?: string;
  playing: boolean;
}

export type PendingSource =
  | PagePendingSource
  | FilePendingSource
  | ReaderPendingSource;

/** popup → SW: open the side panel for `tabId` (must run within a user gesture). */
export interface OpenSidePanelMessage {
  type: 'OPEN_SIDE_PANEL';
  tabId: number;
}

export interface ExtractPageMessage {
  type: 'EXTRACT_PAGE';
  tabId: number;
}

export interface StartPageReaderMessage {
  type: 'START_PAGE_READER';
  tabId: number;
}

/**
 * content script → SW: proxy a POST to the Worker. Routing through the SW
 * keeps the page's CSP and the Worker origin out of it entirely.
 */
export interface WorkerFetchMessage {
  type: 'WORKER_FETCH';
  path: '/tts' | '/summarize' | '/voices';
  method?: 'GET' | 'POST';
  body?: unknown;
}

export interface OpenAdvancedMessage {
  type: 'OPEN_ADVANCED';
  handoff: ReaderPendingSource;
}

export type RuntimeMessage =
  | OpenSidePanelMessage
  | ExtractPageMessage
  | StartPageReaderMessage
  | WorkerFetchMessage
  | OpenAdvancedMessage;

export interface ReadabilityExtractMessage {
  type: 'READABILITY_EXTRACT';
}

/** Build a live document (text + per-word DOM Ranges) from the page. */
export interface BuildLiveDocMessage {
  type: 'BUILD_LIVE_DOC';
  lang?: string;
}

/** Paint the active sentence/word (wordIndex < 0 = sentence-level only). */
export interface HighlightMessage {
  type: 'HIGHLIGHT';
  sentenceId: number;
  wordIndex: number;
  scroll?: boolean;
}

export interface ClearHighlightMessage {
  type: 'CLEAR_HIGHLIGHT';
}

export interface ShowBarMessage {
  type: 'SHOW_BAR';
}

export type ContentMessage =
  | ReadabilityExtractMessage
  | BuildLiveDocMessage
  | HighlightMessage
  | ClearHighlightMessage
  | ShowBarMessage;

export interface BuildLiveDocResponse {
  ok: true;
  title: string;
  lang: string;
  sentenceCount: number;
  wordCount: number;
  supported: boolean;
}

export type Ok<T> = { ok: true } & T;
export type Err = { ok: false; error: string };
export type Result<T = Record<never, never>> = Ok<T> | Err;

export interface ExtractionPayload {
  title: string;
  textBlocks: string[];
  lang?: string;
}

export type OpenSidePanelResponse = Result;
export type ExtractPageResponse = Result<ExtractionPayload>;

export type WorkerFetchResponse<T = unknown> = Result<{ data: T }>;

export interface RuntimeResponseMap {
  OPEN_SIDE_PANEL: OpenSidePanelResponse;
  EXTRACT_PAGE: ExtractPageResponse;
  START_PAGE_READER: Result;
  WORKER_FETCH: WorkerFetchResponse;
  OPEN_ADVANCED: Result;
}
