/**
 * Pure language helpers — no chrome / DOM, so they're unit-testable in Node.
 */

import type { TtsVoice } from '@/core/tts/types';

/** "fr-FR" / "fr_FR" → "fr". Empty string for blank input. */
export function primaryLang(tag: string | undefined): string {
  return (tag ?? '').toLowerCase().split(/[-_]/)[0] ?? '';
}

const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv']);

/** Whether a language tag is right-to-left. */
export function isRtl(lang: string | undefined): boolean {
  return RTL.has(primaryLang(lang));
}

/** Human language name in the UI locale (e.g. "fr" → "French"). */
export function languageName(lang: string, uiLang = 'en'): string {
  const p = primaryLang(lang);
  if (!p) return 'Unknown';
  try {
    return new Intl.DisplayNames([uiLang], { type: 'language' }).of(p) ?? p;
  } catch {
    return p;
  }
}

/**
 * Choose the best voice id for a content language:
 *   saved preference → exact tag → same language family → device default → first.
 * Returns undefined only when there are no voices.
 */
export function pickVoiceForLang(
  voices: TtsVoice[],
  lang: string,
  preferredId?: string,
): string | undefined {
  if (voices.length === 0) return undefined;
  if (preferredId && voices.some((v) => v.id === preferredId))
    return preferredId;

  const target = primaryLang(lang);
  const exact = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
  if (exact) return exact.id;

  const family = voices.find((v) => primaryLang(v.lang) === target);
  if (family) return family.id;

  return (voices.find((v) => v.isDefault) ?? voices[0])!.id;
}

/** True if any voice can speak the given content language. */
export function hasVoiceForLang(voices: TtsVoice[], lang: string): boolean {
  const target = primaryLang(lang);
  return voices.some((v) => primaryLang(v.lang) === target);
}
