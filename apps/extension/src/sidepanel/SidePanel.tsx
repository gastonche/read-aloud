import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilePendingSource, PendingSource } from '@/messaging/contract';
import { base64ToArrayBuffer, readAndClearPendingSource } from '@/core/handoff';
import { normalize, wordCount } from '@/core/document/normalize';
import { PageSource } from '@/core/document/sources/page';
import { createFileSource } from '@/core/document/sources';
import type { DocumentSource, NormalizedDoc } from '@/core/document/types';
import { ReaderView } from '@/ui/components/ReaderView';
import { Transport } from '@/ui/components/Transport';
import { usePlayer } from '@/ui/hooks/usePlayer';

type BootState =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'working'; label: string }
  | { phase: 'error'; message: string; retry?: () => void }
  | { phase: 'reader'; doc: NormalizedDoc };

export function SidePanel() {
  const [state, setState] = useState<BootState>({ phase: 'loading' });
  // The pending source is read-and-cleared once; keep it for retry.
  const sourceRef = useRef<PendingSource | null>(null);

  // Run any DocumentSource through the shared pipeline: load → normalize →
  // render, with a labelled spinner, empty-result guard, and retry-on-error.
  const runSource = useCallback(
    async (
      source: DocumentSource,
      label: string,
      emptyMessage: string,
      retry: () => void,
    ) => {
      setState({ phase: 'working', label });
      try {
        const doc = normalize(await source.load());
        if (doc.blocks.length === 0) {
          setState({ phase: 'error', message: emptyMessage, retry });
          return;
        }
        setState({ phase: 'reader', doc });
      } catch (e) {
        setState({
          phase: 'error',
          message: e instanceof Error ? e.message : 'Something went wrong.',
          retry,
        });
      }
    },
    [],
  );

  const loadPage = useCallback(
    (tabId: number) =>
      runSource(
        new PageSource(tabId),
        'Extracting page…',
        'No readable text found on this page.',
        () => void loadPage(tabId),
      ),
    [runSource],
  );

  const loadFile = useCallback(
    (file: FilePendingSource) => {
      const start = () => {
        try {
          const buffer = base64ToArrayBuffer(file.dataBase64);
          const source = createFileSource(file.name, file.mime, buffer);
          void runSource(
            source,
            `Parsing ${file.name}…`,
            'No readable text found in this file.',
            start,
          );
        } catch (e) {
          // Synchronous failures (unsupported type, bad base64) land here.
          setState({
            phase: 'error',
            message: e instanceof Error ? e.message : 'Could not open file.',
            retry: start,
          });
        }
      };
      start();
    },
    [runSource],
  );

  useEffect(() => {
    let cancelled = false;
    readAndClearPendingSource()
      .then((source) => {
        if (cancelled) return;
        sourceRef.current = source;
        if (!source) return setState({ phase: 'empty' });
        if (source.kind === 'page') return void loadPage(source.tabId);
        loadFile(source);
      })
      .catch(() => !cancelled && setState({ phase: 'empty' }));
    return () => {
      cancelled = true;
    };
  }, [loadPage, loadFile]);

  // Player owns playback; created once, (re)loads whenever the doc changes.
  const readerDoc = state.phase === 'reader' ? state.doc : null;
  const player = usePlayer(readerDoc);

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <PanelHeader
        subtitle={
          state.phase === 'reader'
            ? `${wordCount(state.doc)} words`
            : undefined
        }
      />
      <div className="flex-1 overflow-auto px-4 py-4">
        {state.phase === 'loading' && <Spinner label="Booting…" />}
        {state.phase === 'working' && <Spinner label={state.label} />}
        {state.phase === 'empty' && <EmptyState />}
        {state.phase === 'error' && (
          <ErrorState message={state.message} retry={state.retry} />
        )}
        {state.phase === 'reader' && (
          <ReaderView
            doc={state.doc}
            activeSentence={player.highlight.sentenceId}
            activeWord={player.highlight.wordIndex}
            onSeek={player.seek}
          />
        )}
      </div>
      {state.phase === 'reader' && <Transport player={player} />}
    </div>
  );
}

function PanelHeader({ subtitle }: { subtitle?: string | undefined }) {
  return (
    <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-paper">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />
        </svg>
      </div>
      <div className="min-w-0">
        <h1 className="text-sm font-semibold leading-none">ReadAloud</h1>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-ink-soft">{subtitle}</p>
        )}
      </div>
    </header>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 text-ink-soft">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-accent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 text-center">
      <p className="text-sm font-medium">No content yet</p>
      <p className="mt-1 text-xs text-ink-soft">
        Open the ReadAloud popup and choose a page or a file to begin.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: (() => void) | undefined;
}) {
  return (
    <div className="mt-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2 1 21h22L12 2zm0 6 7 12H5l7-12zm-1 3v4h2v-4h-2zm0 6v2h2v-2h-2z" />
        </svg>
      </div>
      <p className="text-sm font-medium">{message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-paper transition hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

