import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedDoc } from '@/core/document/types';
import { normalize, wordCount } from '@/core/document/normalize';
import { docToText, summarize } from '@/core/summary/client';
import { usePlayer, type PlayerOptions } from '@/ui/hooks/usePlayer';
import { languageName, primaryLang } from '@/core/i18n/lang';
import { ReaderView } from './ReaderView';
import { PlayerDeck } from './PlayerDeck';
import { TopBar } from './TopBar';

type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; text: string };

/**
 * The reader screen: a top bar with the TL;DR action, the reader, and the
 * player deck. The summary is normalized into a NormalizedDoc and fed through
 * the SAME player + reader, so "read summary aloud" gets word highlighting for
 * free — a direct payoff of the source-agnostic design.
 */
export function ReaderScreen({
  doc,
  onSetLanguage,
  initial,
}: {
  doc: NormalizedDoc;
  onSetLanguage: (lang: string) => void;
  initial?: PlayerOptions['initial'];
}) {
  const [summary, setSummary] = useState<SummaryState>({ status: 'idle' });
  const [view, setView] = useState<'doc' | 'summary'>('doc');

  const summaryDoc = useMemo(
    () =>
      summary.status === 'ready'
        ? normalize(
            { title: `TL;DR — ${doc.title}`, blocks: [summary.text] },
            doc.lang, // the summary shares the document's language
          )
        : null,
    [summary, doc.title, doc.lang],
  );
  const activeDoc = view === 'summary' && summaryDoc ? summaryDoc : doc;
  const player = usePlayer(activeDoc, initial ? { initial } : undefined);

  // "Read aloud" on the summary starts playback once the player has loaded the
  // summary doc (runs after usePlayer's own load effect).
  const autoplayRef = useRef(false);
  useEffect(() => {
    if (view === 'summary' && autoplayRef.current) {
      autoplayRef.current = false;
      player.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeDoc]);

  // Space toggles play/pause (unless focus is in a form control).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      player.toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  const progress = {
    current: player.highlight.sentenceId + 1,
    total: activeDoc.blocks.length,
  };

  const onTldr = useCallback(async () => {
    setSummary({ status: 'loading' });
    try {
      const text = await summarize(docToText(doc), doc.title);
      setSummary({ status: 'ready', text });
    } catch (e) {
      setSummary({
        status: 'error',
        message: e instanceof Error ? e.message : 'Summary failed.',
      });
    }
  }, [doc]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar
        subtitle={`${wordCount(activeDoc)} words`}
        right={
          <div className="flex items-center gap-1.5">
            {activeDoc.lang && (
              <LanguageChip lang={activeDoc.lang} onChange={onSetLanguage} />
            )}
            <TldrButton status={summary.status} onClick={() => void onTldr()} />
          </div>
        }
      />
      <div className="flex-1 overflow-auto px-4 py-4">
        {view === 'summary' && (
          <button
            type="button"
            onClick={() => setView('doc')}
            className="mb-4 flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            ← Back to the full document
          </button>
        )}
        {view === 'doc' && summary.status === 'error' && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {summary.message}
          </p>
        )}
        {view === 'doc' && summary.status === 'ready' && (
          <SummaryCard
            text={summary.text}
            onReadAloud={() => {
              autoplayRef.current = true;
              setView('summary');
            }}
            onDismiss={() => setSummary({ status: 'idle' })}
          />
        )}
        <ReaderView
          doc={activeDoc}
          activeSentence={player.highlight.sentenceId}
          activeWord={player.highlight.wordIndex}
          onSeek={player.seek}
        />
      </div>
      <PlayerDeck player={player} progress={progress} />
    </div>
  );
}

const COMMON_LANGS = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'ru',
  'ar',
  'he',
  'hi',
  'ja',
  'ko',
  'zh',
];

/** Shows the detected language and lets the user correct it (re-segments). */
function LanguageChip({
  lang,
  onChange,
}: {
  lang: string;
  onChange: (lang: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ui = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const current = primaryLang(lang);
  const options = [...new Set([current, ...COMMON_LANGS])].filter(Boolean);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Language: ${languageName(lang, ui)}`}
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-soft transition hover:border-slate-300"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3a15 15 0 0 0-1.3-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8 8 0 0 1 0-4h3.4a16 16 0 0 0 0 4H4.3zm.8 2h3a15 15 0 0 0 1.3 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.3-3.6A15 15 0 0 0 8.1 8zM12 20c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14 14 0 0 1 0-4h4.6a14 14 0 0 1 0 4zm.6 5.6a15 15 0 0 0 1.3-3.6h3a8 8 0 0 1-4.3 3.6zm1.7-5.6a16 16 0 0 0 0-4h3.4a8 8 0 0 1 0 4h-3.4z" />
        </svg>
        {languageName(lang, ui)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 max-h-64 w-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            {options.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  onChange(l);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition ${
                  l === current
                    ? 'bg-accent-soft text-accent'
                    : 'hover:bg-slate-50'
                }`}
              >
                {languageName(l, ui)}
                {l === current && <span className="text-accent">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The summarizer CTA that lives in the top bar. */
function TldrButton({
  status,
  onClick,
}: {
  status: SummaryState['status'];
  onClick: () => void;
}) {
  if (status === 'loading') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        Summarizing…
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-white px-2.5 py-1 text-xs font-semibold text-accent transition hover:bg-accent-soft"
    >
      ✨ TL;DR
    </button>
  );
}

function SummaryCard({
  text,
  onReadAloud,
  onDismiss,
}: {
  text: string;
  onReadAloud: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-accent/20 bg-accent-soft/60 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          TL;DR
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReadAloud}
            className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-paper transition hover:opacity-90"
          >
            ▶ Read aloud
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss summary"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-soft transition hover:bg-white/70"
          >
            ✕
          </button>
        </div>
      </div>
      <p className="text-sm leading-6 text-ink">{text}</p>
    </div>
  );
}
