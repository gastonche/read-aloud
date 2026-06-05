// Content-language detection via chrome.i18n.detectLanguage (CLD, built into
// Chrome — offline, no permission).

import type { RawDocument } from '@/core/document/types';
import { primaryLang } from './lang';

export async function detectLanguage(
  text: string,
): Promise<string | undefined> {
  if (typeof chrome === 'undefined' || !chrome.i18n?.detectLanguage) {
    return undefined;
  }
  const sample = text.slice(0, 2000);
  if (!sample.trim()) return undefined;

  const result = await new Promise<chrome.i18n.LanguageDetectionResult>(
    (resolve) => chrome.i18n.detectLanguage(sample, resolve),
  );
  const top = result?.languages?.[0];
  if (top && top.language !== 'und' && top.percentage >= 50) {
    return primaryLang(top.language);
  }
  return undefined;
}

// Prefer a confident detection, then a declared tag (e.g. <html lang>), then UI language.
export async function resolveDocLanguage(raw: RawDocument): Promise<string> {
  const detected = await detectLanguage(raw.blocks.join('\n'));
  if (detected) return detected;
  const declared = primaryLang(raw.lang);
  if (declared) return declared;
  return primaryLang(navigator.language) || 'en';
}
