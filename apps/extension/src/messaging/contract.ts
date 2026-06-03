/**
 * The intra-extension message contract: popup ↔ service worker ↔ side panel,
 * plus service worker ↔ content script.
 *
 * Design notes
 * ------------
 * - The popup owns NO long-lived state. It stages a "pending source" into
 *   chrome.storage.session and asks the SW to open the side panel — then closes.
 * - The side panel is opened by the SW *within the user gesture*, but learns
 *   what to do by PULLING the pending source on boot. We deliberately do not
 *   push an SW→panel message, because the panel document may not exist yet when
 *   the SW runs — pulling on boot removes that race entirely.
 * - Every runtime message gets a discriminated `{ ok }` response so callers can
 *   branch exhaustively with no `any`.
 */

// ─────────────────────────── Handoff state ───────────────────────────
// Persisted in chrome.storage.session under HANDOFF_KEY. Read by the panel
// exactly once on boot, then cleared.

import type { NormalizedDoc } from '@/core/document/types';

export const HANDOFF_KEY = 'readaloud:pendingSource';

/** "Read this page": the panel will extract from this tab. */
export interface PagePendingSource {
  kind: 'page';
  tabId: number;
  /** Best-effort page title for instant UI before extraction completes. */
  title?: string;
}

/** "Upload a file": the file bytes ride along base64-encoded. */
export interface FilePendingSource {
  kind: 'file';
  name: string;
  mime: string;
  size: number;
  /** base64 of the file's ArrayBuffer. */
  dataBase64: string;
}

/**
 * "Advanced mode": the on-page bar hands its already-extracted document and
 * playback state to the side panel, which continues from the same sentence.
 */
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

// ───────────────────────── Runtime messages ──────────────────────────

/** popup → SW: open the side panel for `tabId` (must run within a user gesture). */
export interface OpenSidePanelMessage {
  type: 'OPEN_SIDE_PANEL';
  tabId: number;
}

/** sidepanel → SW: run Readability extraction in `tabId`. [milestone 2] */
export interface ExtractPageMessage {
  type: 'EXTRACT_PAGE';
  tabId: number;
}

/** popup → SW: start the on-page reader (floating bar) in `tabId`. [v0.2.0] */
export interface StartPageReaderMessage {
  type: 'START_PAGE_READER';
  tabId: number;
}

/**
 * content script → SW: proxy a POST to the Worker. Content-script fetches are
 * subject to the page's CSP; routing through the SW avoids that and keeps the
 * Worker origin off the page entirely. [v0.2.0]
 */
export interface WorkerFetchMessage {
  type: 'WORKER_FETCH';
  path: '/tts' | '/summarize' | '/voices';
  method?: 'GET' | 'POST';
  body?: unknown;
}

/** content script (bar) → SW: open the side panel and hand off playback. */
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

/** SW → content script: extract readable content from the current document. [M2] */
export interface ReadabilityExtractMessage {
  type: 'READABILITY_EXTRACT';
}

// ── On-page reader (v0.2.0): the content script builds a live doc and paints
//    highlights over the page via the CSS Custom Highlight API. ──

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
  /** Scroll the sentence into view. */
  scroll?: boolean;
}

/** Clear all on-page highlighting. */
export interface ClearHighlightMessage {
  type: 'CLEAR_HIGHLIGHT';
}

/** SW → content script: show the floating reader bar (builds the live doc). */
export interface ShowBarMessage {
  type: 'SHOW_BAR';
}

export type ContentMessage =
  | ReadabilityExtractMessage
  | BuildLiveDocMessage
  | HighlightMessage
  | ClearHighlightMessage
  | ShowBarMessage;

/** Response to BUILD_LIVE_DOC: the normalized doc + a summary for diagnostics. */
export interface BuildLiveDocResponse {
  ok: true;
  title: string;
  lang: string;
  sentenceCount: number;
  wordCount: number;
  supported: boolean;
}

// ──────────────────────────── Responses ──────────────────────────────

export type Ok<T> = { ok: true } & T;
export type Err = { ok: false; error: string };
export type Result<T = Record<never, never>> = Ok<T> | Err;

/** Raw, source-agnostic extraction result returned by the content script. [M2] */
export interface ExtractionPayload {
  title: string;
  /** Readable text already split into paragraph-ish blocks. */
  textBlocks: string[];
  /** Declared page language (<html lang> / Readability), if any. */
  lang?: string;
}

// Concrete response aliases keep call sites self-documenting.
export type OpenSidePanelResponse = Result;
export type ExtractPageResponse = Result<ExtractionPayload>;

/**
 * Map each runtime message `type` to its response shape, so the typed bus can
 * infer the right return type per request with no casting.
 */
/** WORKER_FETCH returns the parsed JSON payload (engine/summary response). */
export type WorkerFetchResponse<T = unknown> = Result<{ data: T }>;

export interface RuntimeResponseMap {
  OPEN_SIDE_PANEL: OpenSidePanelResponse;
  EXTRACT_PAGE: ExtractPageResponse;
  START_PAGE_READER: Result;
  WORKER_FETCH: WorkerFetchResponse;
  OPEN_ADVANCED: Result;
}
