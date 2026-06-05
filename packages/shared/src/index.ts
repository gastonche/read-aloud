/** Wire-level HTTP contract shared by the extension client and the Worker proxy. */

export interface TtsRequest {
  text: string;
  voiceId?: string;
}

/** Parallel arrays: index i describes characters[i]. From ElevenLabs `with-timestamps`. */
export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface TtsResponse {
  /** base64-encoded mp3. */
  audioBase64: string;
  /** EMPTY for providers without timestamps (e.g. OpenAI); client then estimates timing. */
  alignment: CharacterAlignment;
}

export type VoiceProvider = 'elevenlabs' | 'openai' | 'mock';

export interface NeuralVoice {
  /** Provider-qualified, opaque id, e.g. "openai:nova"; /tts routes on the prefix. */
  id: string;
  label: string;
  lang: string;
  description?: string;
  provider: VoiceProvider;
}

export interface VoicesResponse {
  voices: NeuralVoice[];
}

export interface SummarizeRequest {
  text: string;
  title?: string;
}

export interface SummarizeResponse {
  summary: string;
}

export interface ApiError {
  error: string;
  code?: 'rate_limited' | 'upstream_error' | 'bad_request' | 'internal';
}

export interface WordSpan {
  word: string;
  startSec: number;
  endSec: number;
  index: number;
}

export function collapseAlignmentToWords(
  alignment: CharacterAlignment,
): WordSpan[] {
  const {
    characters,
    character_start_times_seconds,
    character_end_times_seconds,
  } = alignment;

  const spans: WordSpan[] = [];
  let buf = '';
  let start = 0;
  let end = 0;
  let active = false;

  const flush = () => {
    if (!active) return;
    spans.push({
      word: buf,
      startSec: start,
      endSec: end,
      index: spans.length,
    });
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

/** Fallback when a provider returns no alignment (e.g. OpenAI): spread duration across words by length. */
export function estimateWordSpans(
  words: string[],
  durationSec: number,
): WordSpan[] {
  if (words.length === 0 || !(durationSec > 0)) return [];
  const weights = words.map((w) => w.length + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  const spans: WordSpan[] = [];
  let acc = 0;
  words.forEach((word, index) => {
    const start = (acc / total) * durationSec;
    acc += weights[index]!;
    const end = (acc / total) * durationSec;
    spans.push({ word, startSec: start, endSec: end, index });
  });
  return spans;
}

/** Active word index at time `t` (last span started by `t`); -1 before the first word. */
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
