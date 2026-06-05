// Studio TTS client for the on-page bar: fetches through the SW (WORKER_FETCH)
// instead of the page, so the page's CSP and origin are never involved.

import type { TtsResponse, VoicesResponse } from '@readaloud/shared';
import { sendRuntimeMessage } from '@/messaging/bus';
import { NEURAL_VOICES, toTtsVoices } from '@/core/tts/browser-neural';
import type { TtsClient } from '@/core/tts/elevenlabs';
import type { TtsVoice } from '@/core/tts/types';

export class ViaSwTtsClient implements TtsClient {
  async synthesize(
    text: string,
    voiceId: string | undefined,
  ): Promise<TtsResponse> {
    const res = await sendRuntimeMessage({
      type: 'WORKER_FETCH',
      path: '/tts',
      body: { text, voiceId },
    });
    if (!res.ok) throw new Error(res.error);
    return res.data as TtsResponse;
  }

  async listVoices(): Promise<TtsVoice[]> {
    try {
      const res = await sendRuntimeMessage({
        type: 'WORKER_FETCH',
        path: '/voices',
        method: 'GET',
      });
      if (!res.ok) throw new Error(res.error);
      const data = res.data as VoicesResponse;
      return data.voices.length ? toTtsVoices(data.voices) : NEURAL_VOICES;
    } catch {
      return NEURAL_VOICES; // Worker unreachable — offline fallback
    }
  }
}
