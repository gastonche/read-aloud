import { describe, it, expect, beforeEach } from 'vitest';
import { WebSpeechEngine } from './web-speech';
import type {
  EngineListener,
  HighlightState,
  PlaybackStatus,
  SpeechBackend,
  TtsVoice,
  UtteranceHandle,
} from './types';
import { normalize } from '@/core/document/normalize';

/** A fake backend that records utterances and lets tests fire their events. */
class FakeBackend implements SpeechBackend {
  spoken: UtteranceHandle[] = [];
  cancels = 0;
  paused = 0;
  resumed = 0;
  voices: TtsVoice[] = [
    { id: 'v1', label: 'Voice One', lang: 'en-US', isDefault: true },
  ];

  createUtterance(text: string): UtteranceHandle {
    return {
      text,
      rate: 1,
      voiceId: null,
      onstart: null,
      onend: null,
      onerror: null,
      onboundary: null,
    };
  }
  speak(u: UtteranceHandle): void {
    this.spoken.push(u);
  }
  cancel(): void {
    this.cancels++;
  }
  pause(): void {
    this.paused++;
  }
  resume(): void {
    this.resumed++;
  }
  getVoices(): TtsVoice[] {
    return this.voices;
  }
  whenVoicesReady(): Promise<void> {
    return Promise.resolve();
  }
  get last(): UtteranceHandle {
    return this.spoken[this.spoken.length - 1]!;
  }
}

const doc = normalize({
  title: 'T',
  blocks: ['Hello world. Second sentence here.'],
});

let backend: FakeBackend;
let engine: WebSpeechEngine;
let statuses: PlaybackStatus[];
let highlights: HighlightState[];
let noTimingCalls: number;
let errors: Error[];

beforeEach(() => {
  backend = new FakeBackend();
  engine = new WebSpeechEngine(backend);
  statuses = [];
  highlights = [];
  noTimingCalls = 0;
  errors = [];
  const listener: EngineListener = {
    onStatus: (s) => statuses.push(s),
    onHighlight: (h) => highlights.push(h),
    onWordTimingUnavailable: () => noTimingCalls++,
    onError: (e) => errors.push(e),
  };
  engine.setListener(listener);
  engine.load(doc, { rate: 1 });
});

describe('WebSpeechEngine playback', () => {
  it('speaks the first sentence on play and highlights it on start', () => {
    engine.play();
    expect(backend.spoken).toHaveLength(1);
    expect(backend.last.text).toBe('Hello world.');
    backend.last.onstart!();
    expect(statuses).toContain('playing');
    expect(highlights.at(-1)).toEqual({ sentenceId: 0, wordIndex: -1 });
  });

  it('maps boundary char indices to word highlights', () => {
    engine.play();
    backend.last.onstart!();
    backend.last.onboundary!({ name: 'word', charIndex: 0 }); // "Hello"
    expect(highlights.at(-1)).toEqual({ sentenceId: 0, wordIndex: 0 });
    backend.last.onboundary!({ name: 'word', charIndex: 6 }); // "world"
    expect(highlights.at(-1)).toEqual({ sentenceId: 0, wordIndex: 1 });
  });

  it('advances to the next sentence on end, then ends', () => {
    engine.play();
    backend.last.onend!(); // finish sentence 0
    expect(backend.spoken).toHaveLength(2);
    expect(backend.last.text).toBe('Second sentence here.');
    backend.last.onend!(); // finish sentence 1 (last)
    expect(statuses).toContain('ended');
    expect(highlights.at(-1)).toEqual({ sentenceId: -1, wordIndex: -1 });
  });

  it('notifies once when a voice never fires word boundaries', () => {
    engine.play();
    backend.last.onend!(); // sentence 0 ended with no boundary
    backend.last.onend!(); // sentence 1 ended with no boundary
    expect(noTimingCalls).toBe(1);
  });

  it('does NOT warn about timing when boundaries do fire', () => {
    engine.play();
    backend.last.onboundary!({ name: 'word', charIndex: 0 });
    backend.last.onend!();
    backend.last.onend!();
    expect(noTimingCalls).toBe(0);
  });

  it('ignores non-word boundaries (stays at sentence-level highlight)', () => {
    engine.play();
    backend.last.onstart!();
    backend.last.onboundary!({ name: 'sentence', charIndex: 0 }); // non-word
    expect(highlights.at(-1)).toEqual({ sentenceId: 0, wordIndex: -1 });
  });
});

describe('WebSpeechEngine transport', () => {
  it('pause/resume toggles status via the backend', () => {
    engine.play();
    backend.last.onstart!();
    engine.pause();
    expect(backend.paused).toBe(1);
    expect(statuses).toContain('paused');
    engine.resume();
    expect(backend.resumed).toBe(1);
  });

  it('seek while playing cancels and speaks the target; stale events are ignored', () => {
    engine.play();
    backend.last.onstart!();
    const stale = backend.last; // sentence 0's utterance
    engine.seekToSentence(1);
    expect(backend.cancels).toBeGreaterThan(0);
    expect(backend.last.text).toBe('Second sentence here.');
    const spokenAfterSeek = backend.spoken.length;
    // A stale end from the cancelled utterance must NOT advance anything.
    stale.onend!();
    expect(backend.spoken.length).toBe(spokenAfterSeek);
  });

  it('seek while idle moves the highlight without speaking', () => {
    engine.seekToSentence(1);
    expect(backend.spoken).toHaveLength(0);
    expect(highlights.at(-1)).toEqual({ sentenceId: 1, wordIndex: -1 });
  });

  it('changing rate while playing restarts the current sentence at the new rate', () => {
    engine.play();
    backend.last.onstart!();
    engine.setRate(2);
    expect(backend.last.rate).toBe(2);
    expect(backend.last.text).toBe('Hello world.'); // same sentence
  });

  it('surfaces a real synthesis error but ignores cancellation errors', () => {
    engine.play();
    backend.last.onerror!('interrupted');
    expect(errors).toHaveLength(0);
    backend.last.onerror!('synthesis-failed');
    expect(errors).toHaveLength(1);
  });
});
