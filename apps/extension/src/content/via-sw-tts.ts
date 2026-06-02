/**
 * Studio TTS client for the on-page bar: fetches /tts through the service
 * worker (WORKER_FETCH) instead of from the page, so the page's CSP and origin
 * are never involved.
 */

import type { TtsResponse } from '@readaloud/shared';
import { sendRuntimeMessage } from '@/messaging/bus';
import { NEURAL_VOICES } from '@/core/tts/browser-neural';
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
    return NEURAL_VOICES;
  }
}
