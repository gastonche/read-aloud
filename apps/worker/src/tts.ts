/**
 * Text-to-speech provider abstraction for POST /tts.
 *
 * The real provider calls ElevenLabs' `with-timestamps` endpoint (the API key
 * is a Worker secret and is NEVER exposed to the client). The mock provider
 * returns a silent WAV of the right duration plus deterministic character
 * alignment, so local dev / the E2E suite work without an ElevenLabs key.
 */

import type { CharacterAlignment, TtsResponse } from '@readaloud/shared';
import type { Env } from './env';

export interface TtsInput {
  text: string;
  voiceId?: string | undefined;
}

export interface TtsProvider {
  synthesize(input: TtsInput): Promise<TtsResponse>;
}

const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs "Rachel"

// ───────────────────────────── real provider ─────────────────────────────

export class ElevenLabsProvider implements TtsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly defaultVoiceId: string,
  ) {}

  async synthesize({ text, voiceId }: TtsInput): Promise<TtsResponse> {
    const voice = voiceId || this.defaultVoiceId || DEFAULT_VOICE;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128',
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
    }

    // ElevenLabs returns { audio_base64, alignment: { characters,
    // character_start_times_seconds, character_end_times_seconds } }.
    const data = (await res.json()) as {
      audio_base64?: string;
      alignment?: CharacterAlignment | null;
      normalized_alignment?: CharacterAlignment | null;
    };
    const alignment = data.alignment ??
      data.normalized_alignment ?? {
        characters: [],
        character_start_times_seconds: [],
        character_end_times_seconds: [],
      };
    return { audioBase64: data.audio_base64 ?? '', alignment };
  }
}

// ───────────────────────────── mock provider ─────────────────────────────

export class MockTtsProvider implements TtsProvider {
  /** ~per-character duration for the synthetic timeline. */
  private static readonly SEC_PER_CHAR = 0.06;

  async synthesize({ text }: TtsInput): Promise<TtsResponse> {
    const chars = [...text];
    const character_start_times_seconds: number[] = [];
    const character_end_times_seconds: number[] = [];
    chars.forEach((_, i) => {
      character_start_times_seconds.push(
        +(i * MockTtsProvider.SEC_PER_CHAR).toFixed(4),
      );
      character_end_times_seconds.push(
        +((i + 1) * MockTtsProvider.SEC_PER_CHAR).toFixed(4),
      );
    });
    const durationSec = chars.length * MockTtsProvider.SEC_PER_CHAR;
    return {
      audioBase64: silentWavBase64(durationSec),
      alignment: {
        characters: chars,
        character_start_times_seconds,
        character_end_times_seconds,
      },
    };
  }
}

export function getTtsProvider(env: Env): TtsProvider {
  if (env.ELEVENLABS_API_KEY) {
    return new ElevenLabsProvider(
      env.ELEVENLABS_API_KEY,
      env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE,
    );
  }
  return new MockTtsProvider();
}

// ─────────────────────── silent WAV generator (mock) ───────────────────────
// A valid PCM WAV of `seconds` of silence, base64-encoded — enough for an
// <audio> element to load and advance currentTime through the timeline.

function silentWavBase64(seconds: number): string {
  const sampleRate = 8000;
  const samples = Math.max(1, Math.ceil(seconds * sampleRate));
  const dataSize = samples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits/sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  // samples remain zero (silence)

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
