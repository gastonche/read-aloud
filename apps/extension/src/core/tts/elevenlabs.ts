// Same highlighting contract as WebSpeechEngine, different timing model: it
// plays returned audio and samples `currentTime` against word spans collapsed
// from ElevenLabs' character alignment, rather than reacting to `onboundary`.
// Per-sentence requests keep startup fast; the next sentence is prefetched while
// the current one plays. All network goes through the Worker so the key never
// reaches the client. Depends only on injectable seams for unit-testing.

import {
  collapseAlignmentToWords,
  estimateWordSpans,
  wordIndexAtTime,
  type TtsResponse,
  type WordSpan,
} from '@readaloud/shared';
import type { NormalizedDoc, Sentence } from '@/core/document/types';
import {
  NO_HIGHLIGHT,
  type EngineListener,
  type PlaybackOptions,
  type PlaybackStatus,
  type TtsEngine,
  type TtsVoice,
} from './types';

export interface TtsClient {
  synthesize(
    text: string,
    voiceId: string | undefined,
    signal?: AbortSignal,
  ): Promise<TtsResponse>;
  listVoices(): Promise<TtsVoice[]>;
}

export interface AudioController {
  load(audioBase64: string): void;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  currentTime(): number;
  /** NaN until metadata loads. */
  duration(): number;
  setRate(rate: number): void;
  onEnded(cb: () => void): void;
  onError(cb: (reason: string) => void): void;
  dispose(): void;
}

export interface Ticker {
  start(onTick: () => void): void;
  stop(): void;
}

const noopListener: EngineListener = {
  onStatus: () => {},
  onHighlight: () => {},
  onError: () => {},
};

export class ElevenLabsEngine implements TtsEngine {
  readonly id = 'elevenlabs' as const;
  readonly name = 'Neural voice';

  private listener: EngineListener = noopListener;
  private doc: NormalizedDoc | null = null;
  private rate = 1;
  private voiceId: string | null = null;

  private index = 0;
  private status: PlaybackStatus = 'idle';
  private generation = 0;

  private current: Sentence | null = null;
  private words: WordSpan[] = [];
  private lastWord = -2;
  private abort: AbortController | null = null;
  /** sentenceIndex → prefetched response, to start the next sentence instantly. */
  private prefetch = new Map<number, Promise<TtsResponse>>();

  constructor(
    private readonly client: TtsClient,
    private readonly audio: AudioController,
    private readonly ticker: Ticker,
  ) {
    this.audio.onEnded(() => this.onEnded());
    this.audio.onError((reason) => this.onAudioError(reason));
  }

  setListener(listener: EngineListener): void {
    this.listener = listener;
  }

  listVoices(): Promise<TtsVoice[]> {
    return this.client.listVoices();
  }

  load(doc: NormalizedDoc, options: PlaybackOptions): void {
    this.cancelCurrent();
    this.doc = doc;
    this.rate = options.rate;
    this.voiceId = options.voiceId ?? null;
    this.index = 0;
    this.prefetch.clear();
    this.setStatus('idle');
    this.listener.onHighlight(NO_HIGHLIGHT);
  }

  play(): void {
    if (this.status === 'paused') return this.resume();
    if (!this.doc || this.doc.blocks.length === 0) return;
    if (this.index >= this.doc.blocks.length) this.index = 0;
    void this.playIndex(this.index);
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.audio.pause();
    this.ticker.stop();
    this.setStatus('paused');
  }

  resume(): void {
    if (this.status !== 'paused') return;
    void this.audio.play();
    this.ticker.start(() => this.tick());
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
      void this.playIndex(target);
    } else {
      this.listener.onHighlight({
        sentenceId: this.doc.blocks[target]!.id,
        wordIndex: -1,
      });
    }
  }

  setRate(rate: number): void {
    this.rate = rate;
    // currentTime stays in media-seconds, so playbackRate keeps alignment valid.
    this.audio.setRate(rate);
  }

  setVoice(voiceId: string): void {
    this.voiceId = voiceId;
    this.prefetch.clear(); // cached audio is voice-specific
    if (this.status === 'playing') {
      const i = this.index;
      this.cancelCurrent();
      this.index = i;
      void this.playIndex(i);
    }
  }

  dispose(): void {
    this.cancelCurrent();
    this.audio.dispose();
    this.listener = noopListener;
  }

  private cancelCurrent(): void {
    this.generation++;
    this.abort?.abort();
    this.abort = null;
    this.ticker.stop();
    this.audio.stop();
    this.current = null;
    this.words = [];
    this.lastWord = -2;
  }

  private request(i: number): Promise<TtsResponse> {
    const cached = this.prefetch.get(i);
    if (cached) return cached;
    const sentence = this.doc!.blocks[i]!;
    const ac = new AbortController();
    if (i === this.index) this.abort = ac;
    const p = this.client.synthesize(
      sentence.text,
      this.voiceId ?? undefined,
      ac.signal,
    );
    this.prefetch.set(i, p);
    return p;
  }

  private async playIndex(i: number): Promise<void> {
    if (!this.doc) return;
    const sentence = this.doc.blocks[i];
    if (!sentence) {
      this.setStatus('ended');
      this.listener.onHighlight(NO_HIGHLIGHT);
      return;
    }
    this.index = i;
    const gen = ++this.generation;

    // Optimistic: show playing + sentence-level highlight while audio loads.
    this.setStatus('playing');
    this.listener.onHighlight({ sentenceId: sentence.id, wordIndex: -1 });

    let res: TtsResponse;
    try {
      res = await this.request(i);
    } catch (e) {
      if (gen !== this.generation) return; // cancelled mid-flight
      this.listener.onError(
        e instanceof Error ? e : new Error('Neural voice request failed'),
      );
      this.stop();
      return;
    }
    if (gen !== this.generation) return;

    this.current = sentence;
    this.words = collapseAlignmentToWords(res.alignment);
    this.lastWord = -2;
    this.audio.load(res.audioBase64);
    this.audio.setRate(this.rate);

    try {
      await this.audio.play();
    } catch (e) {
      if (gen !== this.generation) return;
      this.listener.onError(
        e instanceof Error ? e : new Error('Audio playback was blocked'),
      );
      this.stop();
      return;
    }
    if (gen !== this.generation) return;

    this.ticker.start(() => this.tick());

    // Prefetch the next sentence so it starts instantly on advance.
    if (i + 1 < this.doc.blocks.length)
      void this.request(i + 1).catch(() => {});
  }

  private tick(): void {
    if (!this.current) return;
    // No alignment (e.g. OpenAI)? Estimate word spans from the real audio
    // duration once it's known — keeps word highlighting, provider-agnostic.
    if (this.words.length === 0) {
      const dur = this.audio.duration();
      if (dur > 0 && Number.isFinite(dur)) {
        this.words = estimateWordSpans(
          this.current.words.map((w) => w.text),
          dur,
        );
      }
    }
    const wi = wordIndexAtTime(this.words, this.audio.currentTime());
    if (wi !== this.lastWord) {
      this.lastWord = wi;
      this.listener.onHighlight({ sentenceId: this.current.id, wordIndex: wi });
    }
  }

  private onEnded(): void {
    if (this.status !== 'playing') return;
    this.ticker.stop();
    const next = this.index + 1;
    if (this.doc && next < this.doc.blocks.length) {
      this.prefetch.delete(this.index);
      void this.playIndex(next);
    } else {
      this.setStatus('ended');
      this.listener.onHighlight(NO_HIGHLIGHT);
    }
  }

  private onAudioError(reason: string): void {
    if (this.status !== 'playing') return;
    this.listener.onError(new Error(`Audio error: ${reason}`));
    this.stop();
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
