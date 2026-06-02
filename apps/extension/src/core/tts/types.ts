/**
 * The TTS abstraction — the centerpiece.
 *
 * The UI is engine-agnostic beyond the engine selector: it loads a document,
 * calls transport methods, and renders whatever {@link HighlightState} the
 * engine emits. Two engines fulfil the SAME highlighting contract through
 * DIFFERENT timing mechanisms:
 *   - WebSpeechEngine   → speechSynthesis `onboundary` events (event-driven)
 *   - ElevenLabsEngine  → audio currentTime vs. word alignment (timestamp-driven)
 *
 * Both reduce to a stream of (sentenceId, wordIndex) updates plus a status.
 */

import type { NormalizedDoc } from '@/core/document/types';

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended';

/** The shared highlighting contract. -1 means "nothing active". */
export interface HighlightState {
  sentenceId: number;
  wordIndex: number;
}

export const NO_HIGHLIGHT: HighlightState = { sentenceId: -1, wordIndex: -1 };

export interface TtsVoice {
  id: string;
  label: string;
  lang: string;
  isDefault: boolean;
}

export interface PlaybackOptions {
  /** 0.5–3.0. */
  rate: number;
  /** Engine-specific voice id; undefined = engine default. */
  voiceId?: string | undefined;
}

/** Events an engine emits to its single listener (a React hook, in practice). */
export interface EngineListener {
  onStatus(status: PlaybackStatus): void;
  onHighlight(state: HighlightState): void;
  /** Per-word highlighting unavailable for this voice; UI may show a hint. */
  onWordTimingUnavailable?(): void;
  onError(error: Error): void;
}

/** The interface both engines implement. */
export interface TtsEngine {
  readonly id: 'web-speech' | 'elevenlabs';
  readonly name: string;

  setListener(listener: EngineListener): void;
  listVoices(): Promise<TtsVoice[]>;

  /** Load (or replace) the document and playback options. Resets to sentence 0. */
  load(doc: NormalizedDoc, options: PlaybackOptions): void;

  play(): void;
  pause(): void;
  resume(): void;
  stop(): void;

  /** Jump to a sentence (skip ±1, click-to-seek). Continues playing if playing. */
  seekToSentence(sentenceId: number): void;

  setRate(rate: number): void;
  setVoice(voiceId: string): void;

  dispose(): void;
}

// ─────────── Backend seam (lets us unit-test the engine in Node) ───────────

export interface BoundaryEvent {
  name: string;
  charIndex: number;
}

/**
 * A single utterance the engine configures (text + handlers) before handing to
 * the backend's speak(). Deliberately a plain bag so a fake backend can drive
 * the handlers synthetically in tests.
 */
export interface UtteranceHandle {
  text: string;
  rate: number;
  voiceId: string | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((reason: string) => void) | null;
  onboundary: ((e: BoundaryEvent) => void) | null;
}

/** Minimal speech surface the engine depends on (real or fake). */
export interface SpeechBackend {
  createUtterance(text: string): UtteranceHandle;
  speak(u: UtteranceHandle): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  getVoices(): TtsVoice[];
  /** Resolves once voices are populated (they load async in browsers). */
  whenVoicesReady(): Promise<void>;
}
