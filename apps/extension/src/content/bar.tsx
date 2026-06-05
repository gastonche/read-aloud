// Floating page-reader bar: a draggable control deck mounted in a Shadow DOM
// host for style isolation, snapping across 8 persisted anchors. Engines run in
// the page; Studio /tts goes through the SW (ViaSwTtsClient) to dodge page CSP.

import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { NormalizedDoc } from '@/core/document/types';
import type { TtsVoice } from '@/core/tts/types';
import { usePlayer, type EngineId } from '@/ui/hooks/usePlayer';
import { hasVoiceForLang, languageName, primaryLang } from '@/core/i18n/lang';
import { voiceAvatar } from '@/ui/voice-avatar';
import { sendRuntimeMessage } from '@/messaging/bus';
import { ViaSwTtsClient } from './via-sw-tts';
import { buildPageDoc, clearPaint, paint } from './page-reader';
import { BAR_CSS } from './bar-css';

type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

const ANCHOR_STYLE: Record<Anchor, React.CSSProperties> = {
  'top-left': { top: 12, left: 12 },
  'top-center': { top: 12, left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: 12, right: 12 },
  'middle-left': { top: '50%', left: 12, transform: 'translateY(-50%)' },
  'middle-right': { top: '50%', right: 12, transform: 'translateY(-50%)' },
  'bottom-left': { bottom: 12, left: 12 },
  'bottom-center': { bottom: 12, left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: 12, right: 12 },
};
const ANCHOR_KEY = 'readaloud:barAnchor';
const COMMON_LANGS = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ru',
  'ar',
  'he',
  'hi',
  'ja',
  'ko',
  'zh',
];

let host: HTMLElement | null = null;
let root: Root | null = null;

export function mountBar(doc: NormalizedDoc): void {
  if (host) unmountBar();
  host = document.createElement('div');
  host.id = 'readaloud-bar-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = BAR_CSS;
  shadow.appendChild(style);
  const mount = document.createElement('div');
  shadow.appendChild(mount);
  document.documentElement.appendChild(host);
  root = createRoot(mount);
  root.render(
    <StrictMode>
      <Bar initialDoc={doc} onClose={unmountBar} />
    </StrictMode>,
  );
}

export function unmountBar(): void {
  clearPaint();
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}

function nearestAnchor(cx: number, cy: number, w: number, h: number): Anchor {
  const col = cx < w / 3 ? 'left' : cx > (2 * w) / 3 ? 'right' : 'center';
  const row = cy < h / 3 ? 'top' : cy > (2 * h) / 3 ? 'bottom' : 'middle';
  if (row === 'middle') {
    const side = col === 'center' ? (cx < w / 2 ? 'left' : 'right') : col;
    return `middle-${side}` as Anchor;
  }
  return `${row}-${col}` as Anchor;
}

function Bar({
  initialDoc,
  onClose,
}: {
  initialDoc: NormalizedDoc;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState(initialDoc);
  const ttsClient = useRef(new ViaSwTtsClient()).current;
  const player = usePlayer(doc, { ttsClient });

  const [anchor, setAnchor] = useState<Anchor>('middle-right');
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [pop, setPop] = useState<'voice' | 'speed' | 'lang' | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chrome.storage?.local?.get(ANCHOR_KEY).then((r) => {
      const a = r[ANCHOR_KEY] as Anchor | undefined;
      if (a && a in ANCHOR_STYLE) setAnchor(a);
    });
  }, []);

  useEffect(() => {
    paint(player.highlight.sentenceId, player.highlight.wordIndex, true);
  }, [player.highlight]);

  const popSide: 'left' | 'right' = anchor.includes('left') ? 'right' : 'left';

  const onGripDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setPop(null);
    const rect = barRef.current!.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const move = (ev: PointerEvent) =>
      setDrag({ x: ev.clientX - offX, y: ev.clientY - offY });
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const r = barRef.current!.getBoundingClientRect();
      const a = nearestAnchor(
        ev.clientX - offX + r.width / 2,
        ev.clientY - offY + r.height / 2,
        window.innerWidth,
        window.innerHeight,
      );
      setDrag(null);
      setAnchor(a);
      chrome.storage?.local?.set({ [ANCHOR_KEY]: a });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onPickLanguage = (lang: string) => {
    setPop(null);
    void buildPageDoc(lang).then((live) => setDoc(live.doc));
  };

  const onAdvanced = () => {
    const wasPlaying = player.status === 'playing';
    player.pause();
    void sendRuntimeMessage({
      type: 'OPEN_ADVANCED',
      handoff: {
        kind: 'reader',
        doc,
        sentenceId: player.highlight.sentenceId,
        rate: player.rate,
        engineId: player.engineId,
        ...(player.voiceId ? { voiceId: player.voiceId } : {}),
        playing: wasPlaying,
      },
    }).finally(onClose);
  };

  const playing = player.status === 'playing';
  const total = doc.blocks.length;
  const current = Math.min(Math.max(player.highlight.sentenceId + 1, 0), total);
  const frac = total > 0 ? current / total : 0;

  const barStyle: React.CSSProperties = drag
    ? { left: drag.x, top: drag.y, transform: 'none' }
    : ANCHOR_STYLE[anchor];

  return (
    <div
      className="bar"
      ref={barRef}
      style={barStyle}
      role="toolbar"
      aria-label="ReadAloud"
    >
      <button className="grip" aria-label="Move bar" onPointerDown={onGripDown}>
        <svg viewBox="0 0 24 24">
          <path d="M9 5h2v2H9zm0 6h2v2H9zm0 6h2v2H9zM13 5h2v2h-2zm0 6h2v2h-2zm0 6h2v2h-2z" />
        </svg>
      </button>

      <button
        className="chip"
        aria-label={`Language: ${languageName(doc.lang, 'en')}`}
        onClick={() => setPop(pop === 'lang' ? null : 'lang')}
      >
        {primaryLang(doc.lang).toUpperCase() || '–'}
      </button>

      <PlayButton playing={playing} frac={frac} onClick={player.toggle} />

      <button
        className="icon"
        aria-label="Previous sentence"
        onClick={player.prev}
      >
        <svg viewBox="0 0 24 24">
          <path d="M7 6h2v12H7V6zm3.5 6 8.5 6V6l-8.5 6z" />
        </svg>
      </button>
      <button className="icon" aria-label="Next sentence" onClick={player.next}>
        <svg viewBox="0 0 24 24">
          <path d="M15 6h2v12h-2V6zM5 6v12l8.5-6L5 6z" />
        </svg>
      </button>

      <button
        className="pill"
        aria-label="Reading speed"
        onClick={() => setPop(pop === 'speed' ? null : 'speed')}
      >
        {player.rate}×
      </button>

      <button
        className="voicebtn"
        aria-label="Choose voice"
        onClick={() => setPop(pop === 'voice' ? null : 'voice')}
      >
        <Avatar voice={player.voices.find((v) => v.id === player.voiceId)} />
      </button>

      <span className="count">
        {current}/{total}
      </span>

      <button
        className="icon"
        aria-label="Open advanced reader"
        onClick={onAdvanced}
      >
        <svg viewBox="0 0 24 24">
          <path d="M4 4h7v2H6v5H4V4zm16 16h-7v-2h5v-5h2v7zM4 20v-7h2v5h5v2H4zM20 4v7h-2V6h-5V4h7z" />
        </svg>
      </button>

      <button
        className="icon close"
        aria-label="Close ReadAloud"
        onClick={onClose}
      >
        <svg viewBox="0 0 24 24">
          <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
        </svg>
      </button>

      {pop === 'speed' && (
        <SpeedPopover
          side={popSide}
          rate={player.rate}
          onChange={player.changeRate}
        />
      )}
      {pop === 'voice' && (
        <VoicePopover
          side={popSide}
          player={player}
          onClose={() => setPop(null)}
        />
      )}
      {pop === 'lang' && (
        <LangPopover side={popSide} lang={doc.lang} onPick={onPickLanguage} />
      )}

      {player.error && (
        <div className={`pop pop-${popSide} pop-err`} role="alert">
          {player.error}
        </div>
      )}
      {!player.error && player.sentenceLevelOnly && (
        <div className={`pop pop-${popSide} pop-note`}>
          This voice highlights by sentence — pick another for word-by-word.
        </div>
      )}
    </div>
  );
}

function Avatar({ voice }: { voice: TtsVoice | undefined }) {
  if (!voice) return <span className="avatar-empty" />;
  return (
    <img
      className="avatar"
      src={voiceAvatar(voice.id)}
      alt=""
      width={28}
      height={28}
    />
  );
}

function PlayButton({
  playing,
  frac,
  onClick,
}: {
  playing: boolean;
  frac: number;
  onClick: () => void;
}) {
  const R = 20;
  const C = 2 * Math.PI * R;
  return (
    <div className="playwrap">
      <svg className="ring" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={R} className="ring-bg" />
        <circle
          cx="23"
          cy="23"
          r={R}
          className="ring-fg"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
        />
      </svg>
      <button
        className="play"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={onClick}
      >
        <svg viewBox="0 0 24 24">
          {playing ? (
            <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" />
          ) : (
            <path d="M8 5v14l11-7L8 5z" />
          )}
        </svg>
      </button>
    </div>
  );
}

function SpeedPopover({
  side,
  rate,
  onChange,
}: {
  side: 'left' | 'right';
  rate: number;
  onChange: (r: number) => void;
}) {
  const MIN = 0.5,
    MAX = 3,
    STEP = 0.25;
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = (rate - MIN) / (MAX - MIN);
  const setFromY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = 1 - (clientY - r.top) / r.height;
    const v = Math.round((MIN + p * (MAX - MIN)) / STEP) * STEP;
    onChange(Math.min(MAX, Math.max(MIN, v)));
  };
  return (
    <div className={`pop pop-${side}`}>
      <div className="pop-val">{rate}×</div>
      <div
        ref={trackRef}
        className="slider"
        role="slider"
        aria-label="Reading speed"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={rate}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setFromY(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons) setFromY(e.clientY);
        }}
      >
        <div className="fill" style={{ height: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function VoicePopover({
  side,
  player,
  onClose,
}: {
  side: 'left' | 'right';
  player: ReturnType<typeof usePlayer>;
  onClose: () => void;
}) {
  const studio = player.engineId === 'elevenlabs';
  const target = primaryLang(player.language);
  const voices = useMemo(() => {
    if (studio) return player.voices;
    // Built-in: content language first, then the rest.
    return [...player.voices].sort(
      (a, b) =>
        Number(primaryLang(b.lang) === target) -
        Number(primaryLang(a.lang) === target),
    );
  }, [player.voices, studio, target]);
  const noMatch =
    !studio &&
    player.language !== '' &&
    !hasVoiceForLang(player.voices, player.language);

  const tab = (id: EngineId, label: string) => (
    <button
      className={`seg-btn ${(id === 'elevenlabs') === studio ? 'on' : ''}`}
      onClick={() => player.setEngine(id)}
    >
      {label}
    </button>
  );

  return (
    <div className={`pop pop-${side} pop-voice`}>
      <div className="seg">
        {tab('web-speech', 'Built-in')}
        {tab('elevenlabs', '✦ Studio')}
      </div>
      {noMatch && (
        <button
          className="nudge"
          onClick={() => player.setEngine('elevenlabs')}
        >
          No {languageName(player.language, 'en')} voice here — try Studio
        </button>
      )}
      <div className="voice-list">
        {voices.map((v) => (
          <button
            key={v.id}
            className={`voice-row ${v.id === player.voiceId ? 'on' : ''}`}
            aria-label={`Select ${v.label}`}
            onClick={() => {
              player.changeVoice(v.id);
              onClose();
            }}
          >
            <img
              className="avatar"
              src={voiceAvatar(v.id)}
              alt=""
              width={32}
              height={32}
            />
            <span className="voice-meta">
              <span className="voice-name">{v.label}</span>
              <span className="voice-desc">{v.description ?? v.lang}</span>
            </span>
            {v.id === player.voiceId && <span className="tick">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function LangPopover({
  side,
  lang,
  onPick,
}: {
  side: 'left' | 'right';
  lang: string;
  onPick: (l: string) => void;
}) {
  const current = primaryLang(lang);
  const langs = [...new Set([current, ...COMMON_LANGS])].filter(Boolean);
  return (
    <div className={`pop pop-${side} pop-lang`}>
      {langs.map((l) => (
        <button
          key={l}
          className={`lang-item ${l === current ? 'on' : ''}`}
          onClick={() => onPick(l)}
        >
          {languageName(l, 'en')}
          {l === current && <span className="tick">✓</span>}
        </button>
      ))}
    </div>
  );
}
