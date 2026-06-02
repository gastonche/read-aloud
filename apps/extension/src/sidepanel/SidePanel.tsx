import { useCallback, useEffect, useRef, useState } from 'react';
import type { PendingSource } from '@/messaging/contract';
import { readAndClearPendingSource } from '@/core/handoff';
import { normalize, wordCount } from '@/core/document/normalize';
import { PageSource } from '@/core/document/sources/page';
import type { NormalizedDoc } from '@/core/document/types';
import { ReaderView } from '@/ui/components/ReaderView';

type BootState =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'working'; label: string }
  | { phase: 'error'; message: string; retry?: () => void }
  | { phase: 'reader'; doc: NormalizedDoc }
  | { phase: 'file-pending'; source: Extract<PendingSource, { kind: 'file' }> };

export function SidePanel() {
  const [state, setState] = useState<BootState>({ phase: 'loading' });
  // The pending source is read-and-cleared once; keep it for retry.
  const sourceRef = useRef<PendingSource | null>(null);

  const loadPage = useCallback(async (tabId: number) => {
    setState({ phase: 'working', label: 'Extracting page…' });
    try {
      const raw = await new PageSource(tabId).load();
      const doc = normalize(raw);
      if (doc.blocks.length === 0) {
        setState({
          phase: 'error',
          message: 'No readable text found on this page.',
          retry: () => void loadPage(tabId),
        });
        return;
      }
      setState({ phase: 'reader', doc });
    } catch (e) {
      setState({
        phase: 'error',
        message: e instanceof Error ? e.message : 'Failed to read the page.',
        retry: () => void loadPage(tabId),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    readAndClearPendingSource()
      .then((source) => {
        if (cancelled) return;
        sourceRef.current = source;
        if (!source) return setState({ phase: 'empty' });
        if (source.kind === 'page') return void loadPage(source.tabId);
        // File parsing arrives in milestone 3; acknowledge the handoff for now.
        setState({ phase: 'file-pending', source });
      })
      .catch(() => !cancelled && setState({ phase: 'empty' }));
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

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
        {state.phase === 'reader' && <ReaderView doc={state.doc} />}
        {state.phase === 'file-pending' && (
          <FilePending name={state.source.name} size={state.source.size} />
        )}
      </div>
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

function FilePending({ name, size }: { name: string; size: number }) {
  return (
    <div className="mt-10 text-center">
      <p className="text-sm font-medium">Received “{name}”</p>
      <p className="mt-1 text-xs text-ink-soft">
        {(size / 1024).toFixed(1)} KB · file parsing lands in milestone 3.
      </p>
    </div>
  );
}
