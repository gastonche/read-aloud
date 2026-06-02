import { useCallback, useEffect, useRef, useState } from 'react';
import type { NormalizedDoc } from '@/core/document/types';
import { WebSpeechEngine } from '@/core/tts/web-speech';
import { BrowserSpeechBackend } from '@/core/tts/browser-backend';
import {
  NO_HIGHLIGHT,
  type HighlightState,
  type PlaybackStatus,
  type TtsEngine,
  type TtsVoice,
} from '@/core/tts/types';

export interface PlayerApi {
  status: PlaybackStatus;
  highlight: HighlightState;
  rate: number;
  voices: TtsVoice[];
  voiceId: string | undefined;
  /** True when the active voice can't highlight individual words. */
  sentenceLevelOnly: boolean;
  error: string | null;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  seek: (sentenceId: number) => void;
  changeRate: (rate: number) => void;
  changeVoice: (voiceId: string) => void;
}

/**
 * Owns the engine instance and bridges its event stream to React state. The
 * engine is created once; the document is (re)loaded whenever it changes.
 */
export function usePlayer(doc: NormalizedDoc | null): PlayerApi {
  const engineRef = useRef<TtsEngine | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [highlight, setHighlight] = useState<HighlightState>(NO_HIGHLIGHT);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [sentenceLevelOnly, setSentenceLevelOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create the engine once and wire its listener to state setters.
  useEffect(() => {
    const engine = new WebSpeechEngine(new BrowserSpeechBackend());
    engineRef.current = engine;
    engine.setListener({
      onStatus: setStatus,
      onHighlight: setHighlight,
      onWordTimingUnavailable: () => setSentenceLevelOnly(true),
      onError: (e) => setError(e.message),
    });
    void engine.listVoices().then((vs) => {
      setVoices(vs);
      const def = vs.find((v) => v.isDefault) ?? vs[0];
      if (def) setVoiceId((prev) => prev ?? def.id);
    });
    return () => engine.dispose();
  }, []);

  // Load the document whenever it changes. Rate/voice are applied live via the
  // engine's setters, so they intentionally aren't dependencies here.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !doc) return;
    setSentenceLevelOnly(false);
    setError(null);
    engine.load(doc, { rate, voiceId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const toggle = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    if (status === 'playing') e.pause();
    else e.play();
  }, [status]);

  const stop = useCallback(() => engineRef.current?.stop(), []);

  const seek = useCallback(
    (sentenceId: number) => engineRef.current?.seekToSentence(sentenceId),
    [],
  );

  const current = highlight.sentenceId < 0 ? 0 : highlight.sentenceId;
  const next = useCallback(() => seek(current + 1), [seek, current]);
  const prev = useCallback(() => seek(Math.max(0, current - 1)), [seek, current]);

  const changeRate = useCallback((r: number) => {
    setRate(r);
    engineRef.current?.setRate(r);
  }, []);

  const changeVoice = useCallback((id: string) => {
    setVoiceId(id);
    engineRef.current?.setVoice(id);
  }, []);

  return {
    status,
    highlight,
    rate,
    voices,
    voiceId,
    sentenceLevelOnly,
    error,
    toggle,
    stop,
    next,
    prev,
    seek,
    changeRate,
    changeVoice,
  };
}
