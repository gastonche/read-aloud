/**
 * The real {@link SpeechBackend} over window.speechSynthesis.
 *
 * Kept separate from the engine so the engine can be unit-tested with a fake
 * backend (headless Chromium has no voices and won't fire boundary events).
 * Only touches window inside methods, so importing this module is safe anywhere.
 */

import type { SpeechBackend, TtsVoice, UtteranceHandle } from './types';

export class BrowserSpeechBackend implements SpeechBackend {
  private get synth(): SpeechSynthesis {
    return window.speechSynthesis;
  }

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

  speak(handle: UtteranceHandle): void {
    const u = new SpeechSynthesisUtterance(handle.text);
    u.rate = handle.rate;
    if (handle.voiceId) {
      const voice = this.synth
        .getVoices()
        .find((v) => v.voiceURI === handle.voiceId);
      if (voice) u.voice = voice;
    }
    u.onstart = () => handle.onstart?.();
    u.onend = () => handle.onend?.();
    u.onerror = (e) => handle.onerror?.(e.error);
    u.onboundary = (e) =>
      handle.onboundary?.({ name: e.name, charIndex: e.charIndex });
    this.synth.speak(u);
  }

  cancel(): void {
    this.synth.cancel();
  }

  pause(): void {
    this.synth.pause();
  }

  resume(): void {
    this.synth.resume();
  }

  getVoices(): TtsVoice[] {
    return this.synth.getVoices().map((v) => ({
      id: v.voiceURI,
      label: v.name,
      lang: v.lang,
      isDefault: v.default,
    }));
  }

  whenVoicesReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.synth.getVoices().length > 0) return resolve();
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      this.synth.addEventListener('voiceschanged', done, { once: true });
      // Fallback: some platforms never fire the event but do have voices.
      setTimeout(done, 1000);
    });
  }
}
