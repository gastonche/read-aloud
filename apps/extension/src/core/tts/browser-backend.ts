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

  /**
   * The raw system voice list is huge and noisy. Curate it down to a clean,
   * product-grade shortlist: prefer the user's language, prefer on-device
   * (local) voices, dedupe by name, default first, cap to a handful.
   */
  getVoices(): TtsVoice[] {
    const raw = this.synth.getVoices();
    const uiLang = (navigator.language || 'en').slice(0, 2).toLowerCase();

    const mapped = raw.map((v) => ({
      id: v.voiceURI,
      label: cleanName(v.name),
      lang: v.lang,
      isDefault: v.default,
      local: v.localService,
      description: friendlyLang(v.lang),
    }));

    let pool = mapped.filter((v) => v.lang.toLowerCase().startsWith(uiLang));
    if (pool.length === 0) pool = mapped;
    const local = pool.filter((v) => v.local);
    if (local.length > 0) pool = local;

    const seen = new Set<string>();
    pool = pool.filter((v) => (seen.has(v.label) ? false : seen.add(v.label)));
    pool.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

    return pool
      .slice(0, 6)
      .map(({ id, label, lang, isDefault, description }) => ({
        id,
        label,
        lang,
        isDefault,
        description,
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

/** Strip vendor noise like "Microsoft David - English (United States)". */
function cleanName(name: string): string {
  return (
    name
      .replace(/^(microsoft|google|apple)\s+/i, '')
      .split(/\s*[-(]/)[0]!
      .trim() || name
  );
}

/** "en-US" → "American English" (best-effort via Intl.DisplayNames). */
function friendlyLang(lang: string): string {
  try {
    const dn = new Intl.DisplayNames([lang || 'en'], { type: 'language' });
    return dn.of(lang) ?? lang;
  } catch {
    return lang;
  }
}
