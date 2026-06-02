import { describe, it, expect } from 'vitest';
import {
  primaryLang,
  isRtl,
  languageName,
  pickVoiceForLang,
  hasVoiceForLang,
} from './lang';
import type { TtsVoice } from '@/core/tts/types';

const v = (id: string, lang: string, isDefault = false): TtsVoice => ({
  id,
  label: id,
  lang,
  isDefault,
});

describe('primaryLang', () => {
  it('extracts the base language from a tag', () => {
    expect(primaryLang('fr-FR')).toBe('fr');
    expect(primaryLang('zh_Hans_CN')).toBe('zh');
    expect(primaryLang('EN-us')).toBe('en');
    expect(primaryLang(undefined)).toBe('');
  });
});

describe('isRtl', () => {
  it('flags RTL languages', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('he-IL')).toBe(true);
    expect(isRtl('fa')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(isRtl('ja')).toBe(false);
  });
});

describe('languageName', () => {
  it('renders a human language name', () => {
    expect(languageName('fr', 'en')).toMatch(/french/i);
    expect(languageName('ja', 'en')).toMatch(/japanese/i);
  });
});

describe('pickVoiceForLang', () => {
  const voices = [
    v('en1', 'en-US', true),
    v('en2', 'en-GB'),
    v('fr1', 'fr-FR'),
    v('frca', 'fr-CA'),
  ];

  it('prefers an exact tag match', () => {
    expect(pickVoiceForLang(voices, 'fr-CA')).toBe('frca');
  });

  it('falls back to the same language family', () => {
    expect(pickVoiceForLang(voices, 'fr')).toBe('fr1');
    expect(pickVoiceForLang(voices, 'fr-BE')).toBe('fr1');
  });

  it('honours a saved preference when present', () => {
    expect(pickVoiceForLang(voices, 'fr', 'frca')).toBe('frca');
  });

  it('ignores a stale saved preference not in the list', () => {
    expect(pickVoiceForLang(voices, 'fr', 'gone')).toBe('fr1');
  });

  it('falls back to the default voice for an unknown language', () => {
    expect(pickVoiceForLang(voices, 'ja')).toBe('en1');
  });

  it('returns undefined when there are no voices', () => {
    expect(pickVoiceForLang([], 'en')).toBeUndefined();
  });
});

describe('hasVoiceForLang', () => {
  const voices = [v('en1', 'en-US'), v('fr1', 'fr-FR')];
  it('detects whether a language family is covered', () => {
    expect(hasVoiceForLang(voices, 'fr-CA')).toBe(true);
    expect(hasVoiceForLang(voices, 'de')).toBe(false);
  });
});
