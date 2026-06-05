import { useCallback, useMemo, useRef, useState } from 'react';
import type { EngineId, PlayerApi } from '@/ui/hooks/usePlayer';
import type { TtsVoice } from '@/core/tts/types';
import { hasVoiceForLang, languageName, primaryLang } from '@/core/i18n/lang';
import { voiceAvatar } from '@/ui/voice-avatar';

const SPEED_MIN = 0.5;
const SPEED_MAX = 3;
const SPEED_STEP = 0.25;

export function PlayerDeck({
  player,
  progress,
}: {
  player: PlayerApi;
  progress?: { current: number; total: number } | undefined;
}) {
  return (
    <div className="border-t border-slate-200/70 bg-gradient-to-b from-white to-slate-50 px-3 pb-3 pt-2.5">
      <Notices player={player} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="justify-self-start">
          <VoicePicker player={player} />
        </div>
        <Transport player={player} progress={progress} />
        <div className="justify-self-end">
          <SpeedControl rate={player.rate} onChange={player.changeRate} />
        </div>
      </div>
    </div>
  );
}

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

function VoiceImage({ voice, size }: { voice: TtsVoice; size: number }) {
  return (
    <img
      src={voiceAvatar(voice.id)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-slate-100"
    />
  );
}

function VoicePicker({ player }: { player: PlayerApi }) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () =>
      player.voices.find((v) => v.id === player.voiceId) ?? player.voices[0],
    [player.voices, player.voiceId],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Voice: ${selected?.label ?? 'none'}`}
        aria-expanded={open}
        className="flex max-w-[150px] items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-left transition hover:border-slate-300"
      >
        {selected ? (
          <VoiceImage voice={selected} size={28} />
        ) : (
          <span className="h-7 w-7 rounded-full bg-slate-200" />
        )}
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold leading-tight text-ink">
            {selected?.label ?? 'No voices'}
          </span>
          <span className="block truncate text-[10px] leading-tight text-ink-soft">
            {player.engineId === 'elevenlabs' ? 'Studio' : 'Built-in'}
          </span>
        </span>
        <Chevron />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <VoiceSheet player={player} onClose={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}

function VoiceSheet({
  player,
  onClose,
}: {
  player: PlayerApi;
  onClose: () => void;
}) {
  const ui = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const studio = player.engineId === 'elevenlabs';
  const target = primaryLang(player.language);

  const renderVoice = (v: TtsVoice) => {
    const active = v.id === player.voiceId;
    return (
      <button
        key={v.id}
        type="button"
        aria-label={`Select ${v.label}`}
        onClick={() => {
          player.changeVoice(v.id);
          onClose();
        }}
        className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition ${
          active ? 'bg-accent-soft' : 'hover:bg-slate-50'
        }`}
      >
        <VoiceImage voice={v} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {v.label}
          </span>
          <span className="block truncate text-[11px] text-ink-soft">
            {v.description ?? v.lang}
          </span>
        </span>
        {active && <Check />}
      </button>
    );
  };

  // Studio is multilingual (one voice reads any language) → show a flat list.
  // Built-in voices are grouped by language, content language first.
  const groups = studio
    ? [{ key: 'studio', label: 'Studio · any language', voices: player.voices }]
    : groupByLanguage(player.voices, target, ui);

  const noMatch =
    !studio &&
    player.language !== '' &&
    !hasVoiceForLang(player.voices, player.language);

  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="p-2">
        <ModeSwitch engineId={player.engineId} onChange={player.setEngine} />
      </div>
      <div className="max-h-64 overflow-y-auto px-2 pb-2">
        {noMatch && (
          <button
            type="button"
            onClick={() => player.setEngine('elevenlabs')}
            className="mb-1 flex w-full items-center gap-2 rounded-xl bg-accent-soft px-2.5 py-2 text-left text-[11px] text-accent"
          >
            <span>✦</span>
            <span>
              No {languageName(player.language, ui)} voice on this device —{' '}
              <span className="font-semibold underline">try Studio</span>
            </span>
          </button>
        )}
        {player.voices.length === 0 && (
          <p className="px-2 py-3 text-center text-[11px] text-ink-soft">
            No voices available.
          </p>
        )}
        {groups.map((g) => (
          <div key={g.key} className="mb-1">
            <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              {g.label}
            </p>
            {g.voices.map(renderVoice)}
          </div>
        ))}
      </div>
    </div>
  );
}

interface VoiceGroup {
  key: string;
  label: string;
  voices: TtsVoice[];
}

/** Group voices by language, with the content language first ("Recommended"). */
function groupByLanguage(
  voices: TtsVoice[],
  target: string,
  ui: string,
): VoiceGroup[] {
  const byLang = new Map<string, TtsVoice[]>();
  for (const v of voices) {
    const fam = primaryLang(v.lang);
    const list = byLang.get(fam) ?? [];
    list.push(v);
    byLang.set(fam, list);
  }
  return [...byLang.entries()]
    .map(([fam, vs]) => ({
      key: fam,
      name: languageName(fam, ui),
      recommended: fam === target,
      voices: vs,
    }))
    .sort(
      (a, b) =>
        Number(b.recommended) - Number(a.recommended) ||
        a.name.localeCompare(b.name),
    )
    .map((g) => ({
      key: g.key,
      label: g.recommended ? `Recommended · ${g.name}` : g.name,
      voices: g.voices,
    }));
}

/** Built-in (free, on-device) vs Studio (premium neural). */
function ModeSwitch({
  engineId,
  onChange,
}: {
  engineId: EngineId;
  onChange: (id: EngineId) => void;
}) {
  const studio = engineId === 'elevenlabs';
  return (
    <div className="relative flex h-8 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
      <span
        aria-hidden
        className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-md shadow-sm transition-transform duration-300 ${
          studio
            ? 'translate-x-[calc(100%+0.5rem)] bg-gradient-to-r from-indigo-500 to-violet-500'
            : 'translate-x-0 bg-white'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange('web-speech')}
        className={`relative z-10 flex flex-1 items-center justify-center gap-1 rounded-md transition-colors ${
          studio ? 'text-ink-soft' : 'text-ink'
        }`}
      >
        Built-in
      </button>
      <button
        type="button"
        onClick={() => onChange('elevenlabs')}
        className={`relative z-10 flex flex-1 items-center justify-center gap-1 rounded-md transition-colors ${
          studio ? 'text-white' : 'text-ink-soft'
        }`}
      >
        ✦ Studio
      </button>
    </div>
  );
}

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
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3">
        <GhostButton label="Previous sentence" onClick={player.prev}>
          <path d="M7 6h2v12H7V6zm3.5 6 8.5 6V6l-8.5 6z" />
        </GhostButton>
        <PlayButton playing={playing} frac={frac} onClick={player.toggle} />
        <GhostButton label="Next sentence" onClick={player.next}>
          <path d="M15 6h2v12h-2V6zM5 6v12l8.5-6L5 6z" />
        </GhostButton>
      </div>
      {progress && progress.total > 0 && (
        <p className="mt-1 text-[10px] tabular-nums text-ink-soft">
          {Math.min(progress.current, progress.total)}
          <span className="opacity-50"> / {progress.total}</span>
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
  const R = 21;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="2.5"
        />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="url(#pg)"
          strokeWidth="2.5"
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
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
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
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-slate-100 hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        {children}
      </svg>
    </button>
  );
}

function SpeedControl({
  rate,
  onChange,
}: {
  rate: number;
  onChange: (rate: number) => void;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="relative flex flex-col items-center">
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="flex flex-col items-center gap-2">
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
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setFromClientY(e.clientY);
                }}
                onPointerMove={(e) => {
                  if (e.buttons !== 0) setFromClientY(e.clientY);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    onChange(Math.min(SPEED_MAX, rate + SPEED_STEP));
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    onChange(Math.max(SPEED_MIN, rate - SPEED_STEP));
                  }
                }}
                className="relative h-28 w-7 cursor-pointer touch-none rounded-full bg-slate-200 shadow-inner"
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
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Reading speed"
        aria-expanded={open}
        className={`flex h-8 min-w-[42px] items-center justify-center gap-0.5 rounded-full border bg-white px-2 text-xs font-bold tabular-nums text-accent transition ${
          open ? 'border-accent' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {formatRate(rate)}
      </button>
    </div>
  );
}

function formatRate(rate: number): string {
  return `${rate}×`;
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-soft"
      fill="currentColor"
    >
      <path d="M7 10l5 5 5-5H7z" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-accent"
      fill="currentColor"
    >
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  );
}
