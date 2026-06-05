import type { TtsVoice } from '@/core/tts/types';

/** "fr-FR" / "fr_FR" → "fr". Empty string for blank input. */
export function primaryLang(tag: string | undefined): string {
  return (tag ?? '').toLowerCase().split(/[-_]/)[0] ?? '';
}

const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv']);

export function isRtl(lang: string | undefined): boolean {
  return RTL.has(primaryLang(lang));
}

export function languageName(lang: string, uiLang = 'en'): string {
  const p = primaryLang(lang);
  if (!p) return 'Unknown';
  try {
    return new Intl.DisplayNames([uiLang], { type: 'language' }).of(p) ?? p;
  } catch {
    return p;
  }
}

// Preference order: saved preference → exact tag → language family → device default → first.
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

export function hasVoiceForLang(voices: TtsVoice[], lang: string): boolean {
  const target = primaryLang(lang);
  return voices.some((v) => primaryLang(v.lang) === target);
}
