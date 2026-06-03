/**
 * Multi-provider text-to-speech for POST /tts + the catalog for GET /voices.
 *
 * Providers (ElevenLabs `with-timestamps`, OpenAI `audio/speech`) sit behind one
 * {@link TtsProvider} interface; their API keys are Worker secrets, never seen
 * by the client. /voices advertises only the voices whose provider key is
 * configured; /tts routes by the provider prefix on the (opaque) voice id. The
 * mock provider keeps local dev / the E2E suite working with no keys.
 */

import type {
  CharacterAlignment,
  NeuralVoice,
  TtsResponse,
} from '@readaloud/shared';
import type { Env } from './env';

export interface TtsInput {
  text: string;
  voiceId?: string | undefined;
}

export interface TtsProvider {
  synthesize(input: TtsInput): Promise<TtsResponse>;
}

const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs "Rachel"
const EMPTY_ALIGNMENT: CharacterAlignment = {
  characters: [],
  character_start_times_seconds: [],
  character_end_times_seconds: [],
};

// ─────────────────────────── voice catalog ───────────────────────────
// Add voices here and they appear in the extension — no client change.

const ELEVENLABS_VOICES: NeuralVoice[] = [
  {
    id: 'elevenlabs:21m00Tcm4TlvDq8ikWAM',
    label: 'Rachel',
    lang: 'en-US',
    description: 'Warm & natural',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:AZnzlk1XvdvUeBnXmlld',
    label: 'Domi',
    lang: 'en-US',
    description: 'Bold & confident',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:EXAVITQu4vr4xnSDxMaL',
    label: 'Bella',
    lang: 'en-US',
    description: 'Soft & gentle',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:ErXwobaYiN019PkySvjV',
    label: 'Antoni',
    lang: 'en-US',
    description: 'Crisp & clear',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:TxGEqnHWrfWFTfGW9XjX',
    label: 'Josh',
    lang: 'en-US',
    description: 'Deep & steady',
    provider: 'elevenlabs',
  },
];

const OPENAI_VOICES: NeuralVoice[] = [
  {
    id: 'openai:alloy',
    label: 'Alloy',
    lang: 'en-US',
    description: 'Neutral & balanced',
    provider: 'openai',
  },
  {
    id: 'openai:nova',
    label: 'Nova',
    lang: 'en-US',
    description: 'Bright & lively',
    provider: 'openai',
  },
  {
    id: 'openai:shimmer',
    label: 'Shimmer',
    lang: 'en-US',
    description: 'Warm & expressive',
    provider: 'openai',
  },
  {
    id: 'openai:echo',
    label: 'Echo',
    lang: 'en-US',
    description: 'Calm & clear',
    provider: 'openai',
  },
  {
    id: 'openai:fable',
    label: 'Fable',
    lang: 'en-US',
    description: 'Storytelling',
    provider: 'openai',
  },
  {
    id: 'openai:onyx',
    label: 'Onyx',
    lang: 'en-US',
    description: 'Deep & resonant',
    provider: 'openai',
  },
];

/** Voices to advertise, based on which provider keys are configured. */
export function availableVoices(env: Env): NeuralVoice[] {
  const out: NeuralVoice[] = [];
  if (env.ELEVENLABS_API_KEY) out.push(...ELEVENLABS_VOICES);
  if (env.OPENAI_API_KEY) out.push(...OPENAI_VOICES);
  // No keys (mock/dev): advertise everything so the UI has voices to show.
  if (out.length === 0) out.push(...ELEVENLABS_VOICES, ...OPENAI_VOICES);
  return out;
}

/** Split a qualified voice id ("openai:nova") into provider + bare id. */
function parseVoiceId(id: string | undefined): {
  provider: string;
  bareId: string | undefined;
} {
  if (!id) return { provider: '', bareId: undefined };
  const i = id.indexOf(':');
  if (i < 0) return { provider: '', bareId: id };
  return { provider: id.slice(0, i), bareId: id.slice(i + 1) };
}

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

// ─────────────────────────── OpenAI provider ───────────────────────────
// OpenAI's speech endpoint returns audio only — NO timestamps — so we return an
// empty alignment and the client estimates word timing from the audio duration.

export class OpenAiProvider implements TtsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async synthesize({ text, voiceId }: TtsInput): Promise<TtsResponse> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        voice: voiceId || 'alloy',
        input: text,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 200)}`);
    }
    const audio = await res.arrayBuffer();
    return {
      audioBase64: arrayBufferToBase64(audio),
      alignment: EMPTY_ALIGNMENT,
    };
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

/**
 * Route to the provider for a (qualified) voice id, returning the bare id to
 * pass upstream. Falls back to the mock provider when the matching key is
 * absent (local dev) or the provider is unknown.
 */
export function resolveTts(
  env: Env,
  voiceId: string | undefined,
): { provider: TtsProvider; voiceId: string | undefined } {
  const { provider, bareId } = parseVoiceId(voiceId);
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    return {
      provider: new OpenAiProvider(
        env.OPENAI_API_KEY,
        env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      ),
      voiceId: bareId,
    };
  }
  if (provider === 'elevenlabs' && env.ELEVENLABS_API_KEY) {
    return {
      provider: new ElevenLabsProvider(
        env.ELEVENLABS_API_KEY,
        env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE,
      ),
      voiceId: bareId,
    };
  }
  return { provider: new MockTtsProvider(), voiceId: bareId };
}

/** Chunked base64 of an ArrayBuffer (audio from a binary provider). */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
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
