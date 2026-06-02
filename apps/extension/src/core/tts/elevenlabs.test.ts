import { describe, it, expect, beforeEach } from 'vitest';
import { ElevenLabsEngine, type AudioController, type Ticker, type TtsClient } from './elevenlabs';
import type { EngineListener, HighlightState, PlaybackStatus, TtsVoice } from './types';
import type { TtsResponse } from '@readaloud/shared';
import { normalize } from '@/core/document/normalize';

const flush = () => new Promise((r) => setTimeout(r, 0));

/** Build char alignment for `text` at 0.1s/char. */
function alignmentOf(text: string): TtsResponse {
  const characters = [...text];
  return {
    audioBase64: 'AAAA',
    alignment: {
      characters,
      character_start_times_seconds: characters.map((_, i) => +(i * 0.1).toFixed(4)),
      character_end_times_seconds: characters.map((_, i) => +((i + 1) * 0.1).toFixed(4)),
    },
  };
}

class FakeClient implements TtsClient {
  calls: string[] = [];
  fail = false;
  async synthesize(text: string): Promise<TtsResponse> {
    this.calls.push(text);
    if (this.fail) throw new Error('upstream down');
    return alignmentOf(text);
  }
  async listVoices(): Promise<TtsVoice[]> {
    return [{ id: 'v1', label: 'Rachel', lang: 'en-US', isDefault: true }];
  }
}

class FakeAudio implements AudioController {
  t = 0;
  playing = false;
  loaded: string[] = [];
  rate = 1;
  private ended: (() => void) | null = null;
  load(b64: string) {
    this.loaded.push(b64);
  }
  async play() {
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  stop() {
    this.playing = false;
    this.t = 0;
  }
  currentTime() {
    return this.t;
  }
  setRate(r: number) {
    this.rate = r;
  }
  onEnded(cb: () => void) {
    this.ended = cb;
  }
  onError() {}
  dispose() {}
  fireEnded() {
    this.ended?.();
  }
}

class FakeTicker implements Ticker {
  private cb: (() => void) | null = null;
  ticking = false;
  start(onTick: () => void) {
    this.cb = onTick;
    this.ticking = true;
  }
  stop() {
    this.ticking = false;
  }
  frame() {
    this.cb?.();
  }
}

const doc = normalize({ title: 'T', blocks: ['Hello world. Second one here.'] });

let client: FakeClient;
let audio: FakeAudio;
let ticker: FakeTicker;
let engine: ElevenLabsEngine;
let statuses: PlaybackStatus[];
let highlights: HighlightState[];
let errors: Error[];

beforeEach(() => {
  client = new FakeClient();
  audio = new FakeAudio();
  ticker = new FakeTicker();
  engine = new ElevenLabsEngine(client, audio, ticker);
  statuses = [];
  highlights = [];
  errors = [];
  const listener: EngineListener = {
    onStatus: (s) => statuses.push(s),
    onHighlight: (h) => highlights.push(h),
    onError: (e) => errors.push(e),
  };
  engine.setListener(listener);
  engine.load(doc, { rate: 1 });
});

describe('ElevenLabsEngine playback', () => {
  it('requests + plays the first sentence and shows a sentence-level highlight', async () => {
    engine.play();
    await flush();
    expect(client.calls[0]).toBe('Hello world.');
    expect(audio.playing).toBe(true);
    expect(statuses).toContain('playing');
    expect(highlights.at(-1)).toEqual({ sentenceId: 0, wordIndex: -1 });
    expect(ticker.ticking).toBe(true);
  });

  it('drives word highlights from currentTime via alignment', async () => {
    engine.play();
    await flush();
    audio.t = 0.05; // within "Hello" (0.0–0.5)
    ticker.frame();
    expect(highlights.at(-1)).toEqual({ sentenceId: 0, wordIndex: 0 });
    audio.t = 0.7; // within "world." (starts 0.6)
    ticker.frame();
    expect(highlights.at(-1)).toEqual({ sentenceId: 0, wordIndex: 1 });
  });

  it('advances to the next sentence when audio ends, then ends', async () => {
    engine.play();
    await flush();
    audio.fireEnded();
    await flush();
    expect(client.calls.at(-1)).toBe('Second one here.');
    expect(highlights.at(-1)).toEqual({ sentenceId: 1, wordIndex: -1 });
    audio.fireEnded();
    await flush();
    expect(statuses).toContain('ended');
    expect(highlights.at(-1)).toEqual({ sentenceId: -1, wordIndex: -1 });
  });

  it('prefetches the next sentence while the first plays', async () => {
    engine.play();
    await flush();
    // request('Hello world.') + prefetch('Second one here.')
    expect(client.calls).toContain('Second one here.');
  });
});

describe('ElevenLabsEngine transport', () => {
  it('pause stops the ticker; resume restarts it', async () => {
    engine.play();
    await flush();
    engine.pause();
    expect(audio.playing).toBe(false);
    expect(ticker.ticking).toBe(false);
    expect(statuses).toContain('paused');
    engine.resume();
    expect(audio.playing).toBe(true);
    expect(ticker.ticking).toBe(true);
  });

  it('setRate applies playbackRate without restarting (alignment stays valid)', async () => {
    engine.play();
    await flush();
    const callsBefore = client.calls.length;
    engine.setRate(1.5);
    expect(audio.rate).toBe(1.5);
    expect(client.calls.length).toBe(callsBefore); // no re-fetch
  });

  it('seek while playing cancels and plays the target sentence', async () => {
    engine.play();
    await flush();
    engine.seekToSentence(1);
    await flush();
    expect(audio.t).toBe(0); // reset on cancel
    expect(client.calls.at(-1)).toBe('Second one here.');
  });

  it('falls back via onError when the request fails', async () => {
    client.fail = true;
    engine.play();
    await flush();
    expect(errors).toHaveLength(1);
    expect(statuses).toContain('idle'); // stop() after error
  });
});
