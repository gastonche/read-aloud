/**
 * @readaloud/shared
 *
 * The wire-level HTTP contract between the extension client and the
 * Cloudflare Worker proxy. Both sides import these types so the request /
 * response shapes can never silently drift apart.
 *
 * Intentionally framework-free: no chrome, no DOM, no Hono. Pure types plus a
 * couple of tiny pure helpers that both client and server can rely on.
 */

// ───────────────────────────── POST /tts ─────────────────────────────

export interface TtsRequest {
  /** Plain text to synthesize. The Worker forwards this to ElevenLabs. */
  text: string;
  /** ElevenLabs voice id. The Worker has a sensible default if omitted. */
  voiceId?: string;
}

/**
 * Character-level timing as returned by ElevenLabs `with-timestamps`.
 * The three arrays are parallel: index i describes `characters[i]`.
 * The extension collapses these into word-level spans for highlighting.
 */
export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface TtsResponse {
  /** base64-encoded audio (mp3) for an <audio> element / data URL. */
  audioBase64: string;
  /** Character-level alignment used to drive word highlighting. */
  alignment: CharacterAlignment;
}

// ────────────────────────── POST /summarize ──────────────────────────

export interface SummarizeRequest {
  /** Extracted document/page text to condense. */
  text: string;
  /** Optional title for prompt context. */
  title?: string;
}

export interface SummarizeResponse {
  /** A concise TL;DR of the supplied text. */
  summary: string;
}

// ───────────────────────────── Errors ────────────────────────────────

/** Uniform error envelope returned by the Worker on any failure. */
export interface ApiError {
  error: string;
  /** Optional machine-readable code for client-side branching. */
  code?: 'rate_limited' | 'upstream_error' | 'bad_request' | 'internal';
}

// ───────────────────────── Shared pure helpers ───────────────────────

/**
 * A word-level timing span derived from {@link CharacterAlignment}.
 * Produced client-side but defined here so the collapse algorithm has a
 * single canonical output shape.
 */
export interface WordSpan {
  word: string;
  startSec: number;
  endSec: number;
  /** Index into the collapsed word list (== highlight index). */
  index: number;
}

/**
 * Collapse character-level alignment into word-level spans by grouping
 * runs of non-whitespace characters. A word's start time is its first
 * character's start; its end time is its last character's end.
 *
 * Pure and dependency-free so it is trivially unit-testable and usable on
 * either side of the wire.
 */
export function collapseAlignmentToWords(
  alignment: CharacterAlignment,
): WordSpan[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } =
    alignment;

  const spans: WordSpan[] = [];
  let buf = '';
  let start = 0;
  let end = 0;
  let active = false;

  const flush = () => {
    if (!active) return;
    spans.push({ word: buf, startSec: start, endSec: end, index: spans.length });
    buf = '';
    active = false;
  };

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i] ?? '';
    const isSpace = /\s/.test(ch);
    if (isSpace) {
      flush();
      continue;
    }
    if (!active) {
      active = true;
      start = character_start_times_seconds[i] ?? 0;
    }
    buf += ch;
    end = character_end_times_seconds[i] ?? start;
  }
  flush();

  return spans;
}

/**
 * Map an audio playback time (seconds) to the index of the active word span,
 * for timestamp-driven highlighting. Returns the last span that has started by
 * time `t`; -1 before the first word starts (so the UI can show a sentence-level
 * highlight during any lead-in). Binary-searched, so it's cheap to call every
 * animation frame.
 */
export function wordIndexAtTime(spans: WordSpan[], t: number): number {
  if (spans.length === 0 || t < spans[0]!.startSec) return -1;
  let lo = 0;
  let hi = spans.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (spans[mid]!.startSec <= t) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
