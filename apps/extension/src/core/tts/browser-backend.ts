/**
 * The real {@link SpeechBackend} over window.speechSynthesis.
 *
 * Kept separate from the engine so the engine can be unit-tested with a fake
 * backend (headless Chromium has no voices and won't fire boundary events).
 * Only touches window inside methods, so importing this module is safe anywhere.
 */

import type { SpeechBackend, TtsVoice, UtteranceHandle } from './types';
import { primaryLang } from '@/core/i18n/lang';

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
   * The raw system voice list is huge and noisy. Curate it to a clean,
   * MULTILINGUAL shortlist (the UI groups it by language): prefer on-device
   * voices, dedupe by name, and cap each language to a handful. We deliberately
   * keep ALL languages so non-English content has a matching voice.
   */
  getVoices(): TtsVoice[] {
    const raw = this.synth.getVoices();
    const mapped = raw.map((v) => ({
      id: v.voiceURI,
      label: cleanName(v.name),
      lang: v.lang,
      isDefault: v.default,
      local: v.localService,
      description: friendlyLang(v.lang),
    }));
    // Local first so dedupe keeps the on-device variant of a name.
    mapped.sort((a, b) => Number(b.local) - Number(a.local));

    const seenLabel = new Set<string>();
    const perLang = new Map<string, number>();
    const out: TtsVoice[] = [];
    for (const v of mapped) {
      if (seenLabel.has(v.label)) continue;
      const family = primaryLang(v.lang);
      const count = perLang.get(family) ?? 0;
      if (count >= 5) continue;
      seenLabel.add(v.label);
      perLang.set(family, count + 1);
      out.push({
        id: v.id,
        label: v.label,
        lang: v.lang,
        isDefault: v.isDefault,
        description: v.description,
      });
    }
    return out;
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
