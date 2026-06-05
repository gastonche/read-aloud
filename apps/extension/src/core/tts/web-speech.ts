// Speaks ONE sentence per utterance: short utterances dodge Chrome's ~15s cutoff
// bug and let long docs start instantly. Word highlighting comes from `onboundary`;
// voices that don't fire boundaries degrade to sentence-level highlighting.
// A generation token invalidates handlers of any utterance we cancel, so
// cancel()/seek/rate-change never trigger a stale auto-advance; the resulting
// 'interrupted'/'canceled' errors are expected and ignored.

import type { NormalizedDoc } from '@/core/document/types';
import { wordIndexAtChar } from './word-lookup';
import {
  NO_HIGHLIGHT,
  type EngineListener,
  type PlaybackOptions,
  type PlaybackStatus,
  type SpeechBackend,
  type TtsEngine,
  type TtsVoice,
} from './types';

const noopListener: EngineListener = {
  onStatus: () => {},
  onHighlight: () => {},
  onError: () => {},
};

export class WebSpeechEngine implements TtsEngine {
  readonly id = 'web-speech' as const;
  readonly name = 'System voice';

  private listener: EngineListener = noopListener;
  private doc: NormalizedDoc | null = null;
  private rate = 1;
  private voiceId: string | null = null;

  private index = 0;
  private status: PlaybackStatus = 'idle';
  private generation = 0;
  private everSawBoundary = false;
  private warnedNoBoundary = false;

  constructor(private readonly backend: SpeechBackend) {}

  setListener(listener: EngineListener): void {
    this.listener = listener;
  }

  async listVoices(): Promise<TtsVoice[]> {
    await this.backend.whenVoicesReady();
    return this.backend.getVoices();
  }

  load(doc: NormalizedDoc, options: PlaybackOptions): void {
    this.cancelCurrent();
    this.doc = doc;
    this.rate = options.rate;
    this.voiceId = options.voiceId ?? null;
    this.index = 0;
    this.everSawBoundary = false;
    this.warnedNoBoundary = false;
    this.setStatus('idle');
    this.listener.onHighlight(NO_HIGHLIGHT);
  }

  play(): void {
    if (this.status === 'paused') return this.resume();
    if (!this.doc || this.doc.blocks.length === 0) return;
    if (this.index >= this.doc.blocks.length) this.index = 0;
    this.speakIndex(this.index);
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.backend.pause();
    this.setStatus('paused');
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.backend.resume();
    this.setStatus('playing');
  }

  stop(): void {
    this.cancelCurrent();
    this.index = 0;
    this.setStatus('idle');
    this.listener.onHighlight(NO_HIGHLIGHT);
  }

  seekToSentence(sentenceId: number): void {
    if (!this.doc) return;
    const target = clamp(sentenceId, 0, this.doc.blocks.length - 1);
    const wasPlaying = this.status === 'playing';
    this.cancelCurrent();
    this.index = target;
    if (wasPlaying) {
      this.speakIndex(target);
    } else {
      // Move the highlight without speaking; play() will start here.
      const id = this.doc.blocks[target]!.id;
      this.listener.onHighlight({ sentenceId: id, wordIndex: -1 });
    }
  }

  setRate(rate: number): void {
    this.rate = rate;
    if (this.status === 'playing') this.restartCurrent();
  }

  setVoice(voiceId: string): void {
    this.voiceId = voiceId;
    if (this.status === 'playing') this.restartCurrent();
  }

  dispose(): void {
    this.cancelCurrent();
    this.listener = noopListener;
  }

  private restartCurrent(): void {
    this.cancelCurrent();
    this.speakIndex(this.index);
  }

  /** Invalidate any in-flight utterance's handlers and tell the backend to stop. */
  private cancelCurrent(): void {
    this.generation++;
    this.backend.cancel();
  }

  private speakIndex(i: number): void {
    if (!this.doc) return;
    const sentence = this.doc.blocks[i];
    if (!sentence) {
      this.setStatus('ended');
      this.listener.onHighlight(NO_HIGHLIGHT);
      return;
    }
    this.index = i;
    const gen = ++this.generation;
    let sawBoundary = false;

    const u = this.backend.createUtterance(sentence.text);
    u.rate = this.rate;
    u.voiceId = this.voiceId;

    u.onstart = () => {
      if (gen !== this.generation) return;
      this.setStatus('playing');
      // Whole-sentence highlight until the first word boundary arrives.
      this.listener.onHighlight({ sentenceId: sentence.id, wordIndex: -1 });
    };

    u.onboundary = (e) => {
      if (gen !== this.generation) return;
      // Some engines also emit 'sentence' boundaries; only word ones move words.
      if (e.name && e.name !== 'word') return;
      sawBoundary = true;
      this.everSawBoundary = true;
      const wordIndex = wordIndexAtChar(sentence.words, e.charIndex);
      this.listener.onHighlight({ sentenceId: sentence.id, wordIndex });
    };

    u.onend = () => {
      if (gen !== this.generation) return;
      if (!sawBoundary && !this.everSawBoundary && !this.warnedNoBoundary) {
        this.warnedNoBoundary = true;
        this.listener.onWordTimingUnavailable?.();
      }
      const next = i + 1;
      if (this.doc && next < this.doc.blocks.length) {
        this.speakIndex(next);
      } else {
        this.setStatus('ended');
        this.listener.onHighlight(NO_HIGHLIGHT);
      }
    };

    u.onerror = (reason) => {
      if (gen !== this.generation) return;
      if (reason === 'interrupted' || reason === 'canceled') return;
      this.listener.onError(new Error(`Speech synthesis failed: ${reason}`));
      this.stop();
    };

    this.backend.speak(u);
  }

  private setStatus(status: PlaybackStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.listener.onStatus(status);
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
