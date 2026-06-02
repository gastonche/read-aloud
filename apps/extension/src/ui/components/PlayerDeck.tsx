import { useCallback, useRef } from 'react';
import type { PlayerApi, EngineId } from '@/ui/hooks/usePlayer';
import type { TtsVoice } from '@/core/tts/types';

const SPEED_MIN = 0.5;
const SPEED_MAX = 3;
const SPEED_STEP = 0.25;

/**
 * The player deck — the product surface at the bottom of the reader.
 * A voice-quality switch, a tactile voice rail (avatar + personality), the
 * transport with a progress ring, and a vertical speed slider.
 */
export function PlayerDeck({
  player,
  progress,
}: {
  player: PlayerApi;
  progress?: { current: number; total: number } | undefined;
}) {
  return (
    <div className="border-t border-slate-200/70 bg-gradient-to-b from-white to-slate-50 px-4 pb-4 pt-3">
      <Notices player={player} />
      <ModeSwitch engineId={player.engineId} onChange={player.setEngine} />
      <VoiceRail
        voices={player.voices}
        voiceId={player.voiceId}
        onPick={player.changeVoice}
      />
      <div className="mt-3 flex items-end gap-3">
        <Transport player={player} progress={progress} />
        <SpeedSlider rate={player.rate} onChange={player.changeRate} />
      </div>
    </div>
  );
}

// ─────────────────────────────── notices ───────────────────────────────

function Notices({ player }: { player: PlayerApi }) {
  if (player.error) {
    return (
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
        <span>⚠</span>
        {player.error}
      </div>
    );
  }
  if (player.sentenceLevelOnly) {
    return (
      <div className="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
        This voice highlights by sentence — pick another for word-by-word.
      </div>
    );
  }
  return null;
}

// ──────────────────────────── mode switch ────────────────────────────
// "Built-in" (free, on-device) vs "Studio" (premium neural).

function ModeSwitch({
  engineId,
  onChange,
}: {
  engineId: EngineId;
  onChange: (id: EngineId) => void;
}) {
  const studio = engineId === 'elevenlabs';
  return (
    <div className="relative flex h-9 rounded-full bg-slate-100 p-1 text-xs font-semibold">
      <span
        aria-hidden
        className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300 ${
          studio
            ? 'translate-x-[calc(100%+0.5rem)] bg-gradient-to-r from-indigo-500 to-violet-500'
            : 'translate-x-0 bg-white'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange('web-speech')}
        className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full transition-colors ${
          studio ? 'text-ink-soft' : 'text-ink'
        }`}
      >
        <Glyph kind="chip" />
        Built-in
      </button>
      <button
        type="button"
        onClick={() => onChange('elevenlabs')}
        className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full transition-colors ${
          studio ? 'text-white' : 'text-ink-soft'
        }`}
      >
        <Glyph kind="spark" />
        Studio
      </button>
    </div>
  );
}

// ───────────────────────────── voice rail ─────────────────────────────

function VoiceRail({
  voices,
  voiceId,
  onPick,
}: {
  voices: TtsVoice[];
  voiceId: string | undefined;
  onPick: (id: string) => void;
}) {
  if (voices.length === 0) {
    return (
      <p className="mt-3 text-center text-[11px] text-ink-soft">
        No voices available on this device.
      </p>
    );
  }
  return (
    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {voices.map((v) => (
        <VoiceChip
          key={v.id}
          voice={v}
          selected={v.id === voiceId}
          onPick={() => onPick(v.id)}
        />
      ))}
    </div>
  );
}

function VoiceChip({
  voice,
  selected,
  onPick,
}: {
  voice: TtsVoice;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`Voice: ${voice.label}`}
      className={`flex w-[116px] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition ${
        selected
          ? 'border-accent bg-accent-soft shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <Avatar name={voice.label} active={selected} />
      <span className="mt-0.5 max-w-full truncate text-xs font-semibold text-ink">
        {voice.label}
      </span>
      <span className="max-w-full truncate text-[10px] leading-tight text-ink-soft">
        {voice.description ?? voice.lang}
      </span>
    </button>
  );
}

/** A deterministic gradient avatar (initial), so voices feel human without
 *  shipping photos. Hue is derived from the name. */
function Avatar({ name, active }: { name: string; active: boolean }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  const h = hash;
  const bg = `linear-gradient(135deg, hsl(${h} 75% 62%), hsl(${(h + 38) % 360} 70% 48%))`;
  return (
    <span
      aria-hidden
      style={{ background: bg }}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold text-white ${
        active ? 'ring-2 ring-accent ring-offset-2' : ''
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ───────────────────────────── transport ─────────────────────────────

function Transport({
  player,
  progress,
}: {
  player: PlayerApi;
  progress?: { current: number; total: number } | undefined;
}) {
  const playing = player.status === 'playing';
  const frac =
    progress && progress.total > 0
      ? Math.min(Math.max(progress.current, 0), progress.total) / progress.total
      : 0;

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex items-center gap-4">
        <GhostButton label="Previous sentence" onClick={player.prev}>
          <path d="M7 6h2v12H7V6zm3.5 6 8.5 6V6l-8.5 6z" />
        </GhostButton>

        <PlayButton playing={playing} frac={frac} onClick={player.toggle} />

        <GhostButton label="Next sentence" onClick={player.next}>
          <path d="M15 6h2v12h-2V6zM5 6v12l8.5-6L5 6z" />
        </GhostButton>
      </div>
      {progress && progress.total > 0 && (
        <p className="mt-2 text-[11px] tabular-nums text-ink-soft">
          {Math.min(progress.current, progress.total)}{' '}
          <span className="opacity-50">/ {progress.total}</span>
          <span className="ml-1.5 opacity-50">· Space ⏯</span>
        </p>
      )}
    </div>
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
  const R = 27;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke="url(#pg)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 200ms linear' }}
        />
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <button
        type="button"
        onClick={onClick}
        aria-label={playing ? 'Pause' : 'Play'}
        className="absolute inset-1.5 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md transition active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
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

function GhostButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100 hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        {children}
      </svg>
    </button>
  );
}

// ──────────────────────────── speed slider ────────────────────────────

function SpeedSlider({
  rate,
  onChange,
}: {
  rate: number;
  onChange: (rate: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = (rate - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);

  const setFromClientY = useCallback(
    (clientY: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = 1 - (clientY - rect.top) / rect.height;
      const raw = SPEED_MIN + p * (SPEED_MAX - SPEED_MIN);
      const snapped = Math.round(raw / SPEED_STEP) * SPEED_STEP;
      onChange(Math.min(SPEED_MAX, Math.max(SPEED_MIN, snapped)));
    },
    [onChange],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientY(e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    setFromClientY(e.clientY);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(SPEED_MAX, rate + SPEED_STEP));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(SPEED_MIN, rate - SPEED_STEP));
    }
  };

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1">
      <span className="text-xs font-bold tabular-nums text-accent">
        {formatRate(rate)}
      </span>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Reading speed"
        aria-valuemin={SPEED_MIN}
        aria-valuemax={SPEED_MAX}
        aria-valuenow={rate}
        aria-valuetext={`${formatRate(rate)} speed`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative h-20 w-7 cursor-pointer touch-none rounded-full bg-slate-200"
      >
        <div
          className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-indigo-500 to-violet-400"
          style={{ height: `${pct * 100}%` }}
        />
        <div
          className="absolute inset-x-0 flex justify-center"
          style={{ bottom: `calc(${pct * 100}% - 7px)` }}
        >
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-accent shadow" />
        </div>
      </div>
      <span className="text-[10px] text-ink-soft">Speed</span>
    </div>
  );
}

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? `${rate}×` : `${rate}×`;
}

// ───────────────────────────── small glyphs ─────────────────────────────

function Glyph({ kind }: { kind: 'chip' | 'spark' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      {kind === 'chip' ? (
        <path d="M9 3v2H7a2 2 0 0 0-2 2v2H3v2h2v2H3v2h2v2a2 2 0 0 0 2 2h2v2h2v-2h2v2h2v-2h2a2 2 0 0 0 2-2v-2h2v-2h-2v-2h2V9h-2V7a2 2 0 0 0-2-2h-2V3h-2v2h-2V3H9zm0 6h6v6H9V9z" />
      ) : (
        <path d="M12 2l1.8 4.6L18 8l-4.2 1.4L12 14l-1.8-4.6L6 8l4.2-1.4L12 2zm6 10l1 2.6L21 16l-2 .7L18 19l-1-2.3L15 16l2-.7L18 12zM6 13l.9 2.3L9 16l-2.1.8L6 19l-.9-2.2L3 16l2.1-.7L6 13z" />
      )}
    </svg>
  );
}
