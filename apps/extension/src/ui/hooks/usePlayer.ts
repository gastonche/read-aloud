import { useCallback, useEffect, useRef, useState } from 'react';
import type { NormalizedDoc } from '@/core/document/types';
import { WebSpeechEngine } from '@/core/tts/web-speech';
import { BrowserSpeechBackend } from '@/core/tts/browser-backend';
import { ElevenLabsEngine } from '@/core/tts/elevenlabs';
import {
  HttpTtsClient,
  HtmlAudioController,
  RafTicker,
} from '@/core/tts/browser-neural';
import {
  NO_HIGHLIGHT,
  type HighlightState,
  type PlaybackStatus,
  type TtsEngine,
  type TtsVoice,
} from '@/core/tts/types';

export type EngineId = 'web-speech' | 'elevenlabs';

export interface PlayerApi {
  engineId: EngineId;
  status: PlaybackStatus;
  highlight: HighlightState;
  rate: number;
  voices: TtsVoice[];
  voiceId: string | undefined;
  /** True when the active voice can't highlight individual words. */
  sentenceLevelOnly: boolean;
  error: string | null;
  setEngine: (id: EngineId) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  seek: (sentenceId: number) => void;
  changeRate: (rate: number) => void;
  changeVoice: (voiceId: string) => void;
}

function createEngine(id: EngineId): TtsEngine {
  return id === 'elevenlabs'
    ? new ElevenLabsEngine(
        new HttpTtsClient(),
        new HtmlAudioController(),
        new RafTicker(),
      )
    : new WebSpeechEngine(new BrowserSpeechBackend());
}

/**
 * Owns the active engine and bridges its event stream to React state. Switching
 * engines disposes the old one, creates the new one, and reloads the current
 * document. A neural-engine error auto-falls-back to Web Speech so playback
 * keeps working even if the Worker/ElevenLabs is down.
 */
export function usePlayer(doc: NormalizedDoc | null): PlayerApi {
  const engineRef = useRef<TtsEngine | null>(null);
  const [engineId, setEngineId] = useState<EngineId>('web-speech');
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [highlight, setHighlight] = useState<HighlightState>(NO_HIGHLIGHT);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [sentenceLevelOnly, setSentenceLevelOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs so the engine effect can read current rate/voice/doc without
  // re-running on every change of them.
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const docRef = useRef(doc);
  docRef.current = doc;

  const engineIdRef = useRef(engineId);
  engineIdRef.current = engineId;

  // (Re)create the engine when the selected engine changes. NOTE: we do NOT
  // clear `error` here — an auto-fallback switches the engine and must keep its
  // message visible. Errors are cleared on a new doc, a manual engine switch,
  // or a successful play.
  useEffect(() => {
    const engine = createEngine(engineId);
    engineRef.current = engine;
    engine.setListener({
      onStatus: (s) => {
        setStatus(s);
        if (s === 'playing') setError(null); // playback recovered
      },
      onHighlight: setHighlight,
      onWordTimingUnavailable: () => setSentenceLevelOnly(true),
      onError: (e) => {
        // Automatic fallback: if Studio fails, drop to Built-in so the user can
        // still listen — and tell them why (this message survives the switch).
        if (engineIdRef.current === 'elevenlabs') {
          setError(
            'Studio voices need the ReadAloud server running. Switched to Built-in.',
          );
          setEngineId('web-speech');
        } else {
          setError(e.message);
        }
      },
    });
    void engine.listVoices().then((vs) => {
      setVoices(vs);
      const def = vs.find((v) => v.isDefault) ?? vs[0];
      setVoiceId(def?.id);
    });
    if (docRef.current) {
      engine.load(docRef.current, { rate: rateRef.current });
    }
    return () => engine.dispose();
  }, [engineId]);

  // Load the document whenever it changes (rate/voice apply live via setters).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !doc) return;
    setSentenceLevelOnly(false);
    setError(null);
    engine.load(doc, { rate: rateRef.current, voiceId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const play = useCallback(() => engineRef.current?.play(), []);
  const pause = useCallback(() => engineRef.current?.pause(), []);
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
  const prev = useCallback(
    () => seek(Math.max(0, current - 1)),
    [seek, current],
  );

  const changeRate = useCallback((r: number) => {
    setRate(r);
    engineRef.current?.setRate(r);
  }, []);
  const changeVoice = useCallback((id: string) => {
    setVoiceId(id);
    engineRef.current?.setVoice(id);
  }, []);
  const setEngine = useCallback((id: EngineId) => {
    // Manual switch is a fresh start — clear any prior fallback notice.
    setError(null);
    setSentenceLevelOnly(false);
    setEngineId(id);
  }, []);

  return {
    engineId,
    status,
    highlight,
    rate,
    voices,
    voiceId,
    sentenceLevelOnly,
    error,
    setEngine,
    play,
    pause,
    toggle,
    stop,
    next,
    prev,
    seek,
    changeRate,
    changeVoice,
  };
}
