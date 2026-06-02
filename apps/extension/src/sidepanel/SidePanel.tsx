import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilePendingSource, PendingSource } from '@/messaging/contract';
import { base64ToArrayBuffer, readAndClearPendingSource } from '@/core/handoff';
import { normalize } from '@/core/document/normalize';
import { PageSource } from '@/core/document/sources/page';
import { createFileSource } from '@/core/document/sources';
import type {
  DocumentSource,
  NormalizedDoc,
  RawDocument,
} from '@/core/document/types';
import { resolveDocLanguage } from '@/core/i18n/detect';
import { ReaderScreen } from '@/ui/components/ReaderScreen';
import { TopBar } from '@/ui/components/TopBar';

type BootState =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'working'; label: string }
  | { phase: 'error'; message: string; retry?: () => void }
  | { phase: 'reader'; doc: NormalizedDoc; raw: RawDocument };

export function SidePanel() {
  const [state, setState] = useState<BootState>({ phase: 'loading' });
  // The pending source is read-and-cleared once; keep it for retry.
  const sourceRef = useRef<PendingSource | null>(null);

  // Re-segment + re-render the current document in a different language (the
  // top-bar language chip). Re-normalizes from the kept raw text — no re-fetch.
  const setLanguage = useCallback((lang: string) => {
    setState((s) =>
      s.phase === 'reader' ? { ...s, doc: normalize(s.raw, lang) } : s,
    );
  }, []);

  // Run any DocumentSource through the shared pipeline: load → detect language →
  // normalize → render, with a labelled spinner, empty-result guard, and retry.
  const runSource = useCallback(
    async (
      source: DocumentSource,
      label: string,
      emptyMessage: string,
      retry: () => void,
    ) => {
      setState({ phase: 'working', label });
      try {
        const raw = await source.load();
        const lang = await resolveDocLanguage(raw);
        const doc = normalize(raw, lang);
        if (doc.blocks.length === 0) {
          setState({ phase: 'error', message: emptyMessage, retry });
          return;
        }
        setState({ phase: 'reader', doc, raw });
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

  // Reader phase owns its own top bar (with the TL;DR action); other phases
  // get the plain app top bar.
  if (state.phase === 'reader') {
    return (
      <div className="flex h-full flex-col bg-paper text-ink">
        <ReaderScreen doc={state.doc} onSetLanguage={setLanguage} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <TopBar />
      <div className="flex-1 overflow-auto px-4 py-4">
        {state.phase === 'loading' && <Spinner label="Booting…" />}
        {state.phase === 'working' && <Spinner label={state.label} />}
        {state.phase === 'empty' && <EmptyState />}
        {state.phase === 'error' && (
          <ErrorState message={state.message} retry={state.retry} />
        )}
      </div>
    </div>
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
