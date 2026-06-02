/**
 * Browser implementations of the ElevenLabsEngine seams: HTTP client to the
 * Worker, an <audio>-backed controller, and a requestAnimationFrame ticker.
 * Kept out of the engine so the engine stays unit-testable with fakes.
 */

import type { ApiError, TtsResponse } from '@readaloud/shared';
import { WORKER_BASE_URL } from '@/config';
import type { AudioController, Ticker, TtsClient } from './elevenlabs';
import type { TtsVoice } from './types';

/** A curated set of ElevenLabs voices (the Worker resolves the id). */
const NEURAL_VOICES: TtsVoice[] = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    label: 'Rachel',
    lang: 'en-US',
    isDefault: true,
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld',
    label: 'Domi',
    lang: 'en-US',
    isDefault: false,
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    label: 'Bella',
    lang: 'en-US',
    isDefault: false,
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    label: 'Antoni',
    lang: 'en-US',
    isDefault: false,
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    label: 'Josh',
    lang: 'en-US',
    isDefault: false,
  },
];

export class HttpTtsClient implements TtsClient {
  async synthesize(
    text: string,
    voiceId: string | undefined,
    signal?: AbortSignal,
  ): Promise<TtsResponse> {
    const res = await fetch(`${WORKER_BASE_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      let message = `Neural voice failed (HTTP ${res.status}).`;
      try {
        const body = (await res.json()) as ApiError;
        if (body?.error) message = body.error;
      } catch {
        /* keep default */
      }
      throw new Error(message);
    }
    return (await res.json()) as TtsResponse;
  }

  async listVoices(): Promise<TtsVoice[]> {
    return NEURAL_VOICES;
  }
}

export class HtmlAudioController implements AudioController {
  private audio = new Audio();

  load(audioBase64: string): void {
    this.audio.src = `data:audio/mpeg;base64,${audioBase64}`;
  }
  play(): Promise<void> {
    return this.audio.play();
  }
  pause(): void {
    this.audio.pause();
  }
  stop(): void {
    this.audio.pause();
    try {
      this.audio.currentTime = 0;
    } catch {
      /* not always settable before metadata loads */
    }
  }
  currentTime(): number {
    return this.audio.currentTime;
  }
  setRate(rate: number): void {
    this.audio.playbackRate = rate;
  }
  onEnded(cb: () => void): void {
    this.audio.addEventListener('ended', cb);
  }
  onError(cb: (reason: string) => void): void {
    this.audio.addEventListener('error', () =>
      cb(this.audio.error?.message ?? 'media error'),
    );
  }
  dispose(): void {
    this.audio.pause();
    this.audio.src = '';
  }
}

export class RafTicker implements Ticker {
  private raf = 0;
  start(onTick: () => void): void {
    this.stop();
    const loop = () => {
      onTick();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
