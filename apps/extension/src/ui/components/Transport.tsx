import type { PlayerApi } from '@/ui/hooks/usePlayer';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/**
 * Playback transport: engine selector (System / Neural), play/pause + skip,
 * voice picker, and speed. Engine-agnostic — it only talks to {@link PlayerApi}.
 */
export function Transport({ player }: { player: PlayerApi }) {
  const playing = player.status === 'playing';

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-3">
      {player.sentenceLevelOnly && (
        <p className="mb-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
          This voice highlights by sentence (no word timing). Try another voice
          for word-level highlighting.
        </p>
      )}
      {player.error && (
        <p className="mb-2 rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          {player.error}
        </p>
      )}

      <EngineToggle
        engineId={player.engineId}
        onChange={player.setEngine}
      />

      <div className="mb-3 mt-3 flex items-center justify-center gap-5">
        <IconButton label="Previous sentence" onClick={player.prev}>
          <path d="M6 5h2v14H6V5zm3.5 7 8.5 6V6l-8.5 6z" />
        </IconButton>
        <button
          type="button"
          onClick={player.toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-paper shadow-sm transition hover:opacity-90 active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            {playing ? (
              <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" />
            ) : (
              <path d="M8 5v14l11-7L8 5z" />
            )}
          </svg>
        </button>
        <IconButton label="Next sentence" onClick={player.next}>
          <path d="M16 5h2v14h-2V5zM6 6v12l8.5-6L6 6z" />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <select
          aria-label="Voice"
          value={player.voiceId ?? ''}
          onChange={(e) => player.changeVoice(e.target.value)}
          disabled={player.voices.length === 0}
          className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
        >
          {player.voices.length === 0 && <option>No system voices</option>}
          {player.voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} ({v.lang})
            </option>
          ))}
        </select>
        <select
          aria-label="Speed"
          value={player.rate}
          onChange={(e) => player.changeRate(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IconButton({
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

/** System (free, on-device) vs Neural (premium, via the Worker). */
function EngineToggle({
  engineId,
  onChange,
}: {
  engineId: 'web-speech' | 'elevenlabs';
  onChange: (id: 'web-speech' | 'elevenlabs') => void;
}) {
  const tab = (id: 'web-speech' | 'elevenlabs', label: string) => {
    const active = engineId === id;
    return (
      <button
        type="button"
        onClick={() => onChange(id)}
        aria-pressed={active}
        className={`flex-1 rounded-md py-1 text-center transition ${
          active
            ? 'bg-white text-ink shadow-sm'
            : 'text-ink-soft hover:text-ink'
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
      {tab('web-speech', 'System')}
      {tab('elevenlabs', 'Neural')}
    </div>
  );
}
