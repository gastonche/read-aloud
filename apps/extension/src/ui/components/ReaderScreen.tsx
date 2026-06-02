import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedDoc } from '@/core/document/types';
import { normalize } from '@/core/document/normalize';
import { docToText, summarize } from '@/core/summary/client';
import { usePlayer } from '@/ui/hooks/usePlayer';
import { ReaderView } from './ReaderView';
import { Transport } from './Transport';

type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; text: string };

/**
 * The reader screen: TL;DR controls, the reader, and the transport. The summary
 * is normalized into a NormalizedDoc and fed through the SAME player + reader,
 * so "read summary aloud" gets word highlighting for free — a direct payoff of
 * the source-agnostic document/engine design.
 */
export function ReaderScreen({ doc }: { doc: NormalizedDoc }) {
  const [summary, setSummary] = useState<SummaryState>({ status: 'idle' });
  const [view, setView] = useState<'doc' | 'summary'>('doc');

  const summaryDoc = useMemo(
    () =>
      summary.status === 'ready'
        ? normalize({ title: `TL;DR — ${doc.title}`, blocks: [summary.text] })
        : null,
    [summary, doc.title],
  );
  const activeDoc = view === 'summary' && summaryDoc ? summaryDoc : doc;
  const player = usePlayer(activeDoc);

  // When the user chooses "Read aloud" on the summary, start playback once the
  // player has loaded the summary doc (runs after usePlayer's own load effect).
  const autoplayRef = useRef(false);
  useEffect(() => {
    if (view === 'summary' && autoplayRef.current) {
      autoplayRef.current = false;
      player.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeDoc]);

  // Space toggles play/pause (unless the user is in a form control).
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
      <div className="flex-1 overflow-auto px-4 py-4">
        <SummaryBar
          state={summary}
          view={view}
          onTldr={onTldr}
          onReadSummary={() => {
            autoplayRef.current = true;
            setView('summary');
          }}
          onBackToArticle={() => setView('doc')}
        />
        <ReaderView
          doc={activeDoc}
          activeSentence={player.highlight.sentenceId}
          activeWord={player.highlight.wordIndex}
          onSeek={player.seek}
        />
      </div>
      <Transport player={player} progress={progress} />
    </div>
  );
}

function SummaryBar({
  state,
  view,
  onTldr,
  onReadSummary,
  onBackToArticle,
}: {
  state: SummaryState;
  view: 'doc' | 'summary';
  onTldr: () => void;
  onReadSummary: () => void;
  onBackToArticle: () => void;
}) {
  if (view === 'summary') {
    return (
      <button
        type="button"
        onClick={onBackToArticle}
        className="mb-4 flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
      >
        ← Back to the full document
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        Summarizing…
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <div className="mb-4 rounded-xl border border-accent/20 bg-accent-soft/60 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">
            TL;DR
          </span>
          <button
            type="button"
            onClick={onReadSummary}
            className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-paper transition hover:opacity-90"
          >
            ▶ Read aloud
          </button>
        </div>
        <p className="text-sm leading-6 text-ink">{state.text}</p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        type="button"
        onClick={onTldr}
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-white px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft"
      >
        ✨ TL;DR this
      </button>
      {state.status === 'error' && (
        <span className="ml-3 flex-1 truncate text-right text-[11px] text-red-600">
          {state.message}
        </span>
      )}
    </div>
  );
}
