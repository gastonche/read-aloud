import { useEffect, useState } from 'react';
import type { PendingSource } from '@/messaging/contract';
import { base64ToArrayBuffer, readAndClearPendingSource } from '@/core/handoff';

type BootState =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'ready'; source: PendingSource; decodedBytes: number | null };

export function SidePanel() {
  const [state, setState] = useState<BootState>({ phase: 'loading' });

  // On boot, PULL the pending source the popup staged. This is the consumer
  // half of the handoff — no SW→panel push, so there's no readiness race.
  useEffect(() => {
    let cancelled = false;
    readAndClearPendingSource()
      .then((source) => {
        if (cancelled) return;
        if (!source) {
          setState({ phase: 'empty' });
          return;
        }
        // For files, decode the base64 to verify the bytes round-tripped.
        let decodedBytes: number | null = null;
        if (source.kind === 'file') {
          decodedBytes = base64ToArrayBuffer(source.dataBase64).byteLength;
        }
        setState({ phase: 'ready', source, decodedBytes });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: 'empty' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <PanelHeader />
      <div className="flex-1 overflow-auto p-4">
        {state.phase === 'loading' && <Loading />}
        {state.phase === 'empty' && <EmptyState />}
        {state.phase === 'ready' && (
          <HandoffReceipt source={state.source} decodedBytes={state.decodedBytes} />
        )}
      </div>
      <footer className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-ink-soft">
        Milestone 1 · plumbing verified
      </footer>
    </div>
  );
}

function PanelHeader() {
  return (
    <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-paper">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />
        </svg>
      </div>
      <h1 className="text-sm font-semibold">ReadAloud</h1>
    </header>
  );
}

function Loading() {
  return <p className="text-sm text-ink-soft">Booting…</p>;
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

/**
 * Milestone-1 proof surface: shows exactly what crossed the handoff so we can
 * confirm both flows end-to-end before building extraction / parsing / TTS.
 */
function HandoffReceipt({
  source,
  decodedBytes,
}: {
  source: PendingSource;
  decodedBytes: number | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Handoff received
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <Row label="Source">{source.kind === 'page' ? 'Web page' : 'File'}</Row>
        {source.kind === 'page' && (
          <>
            <Row label="Tab ID">{source.tabId}</Row>
            <Row label="Title">{source.title ?? '—'}</Row>
          </>
        )}
        {source.kind === 'file' && (
          <>
            <Row label="Name">{source.name}</Row>
            <Row label="MIME">{source.mime || '—'}</Row>
            <Row label="Size">{formatBytes(source.size)}</Row>
            <Row label="Decoded">
              {decodedBytes != null ? formatBytes(decodedBytes) : '—'}
              {decodedBytes === source.size && (
                <span className="ml-1.5 text-xs text-green-600">
                  ✓ bytes match
                </span>
              )}
            </Row>
          </>
        )}
      </dl>
      <p className="mt-3 text-xs text-ink-soft">
        Next milestone wires this source into extraction / parsing and renders
        the reader view.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-medium text-ink-soft">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
