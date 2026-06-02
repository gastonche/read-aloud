import { useCallback, useEffect, useRef, useState } from 'react';
import { sendRuntimeMessage } from '@/messaging/bus';
import type { PagePendingSource } from '@/messaging/contract';
import {
  fileToPendingSource,
  FileTooLargeError,
  stagePendingSource,
} from '@/core/handoff';

type Mode = 'choose' | 'upload';

const ACCEPTED = '.pdf,.txt,application/pdf,text/plain';

export function Popup() {
  const [mode, setMode] = useState<Mode>('choose');
  const [tabId, setTabId] = useState<number | null>(null);
  const [pageTitle, setPageTitle] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fetch the active tab on mount so the click handler has the tabId
  // synchronously — keeping the handoff inside the user-activation window.
  useEffect(() => {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab?.id != null) setTabId(tab.id);
        if (tab?.title) setPageTitle(tab.title);
      })
      .catch(() => setTabId(null));
  }, []);

  /** Stage the source, ask the SW to open the panel, then close the popup. */
  const launchPanel = useCallback(
    async (stage: () => Promise<void>) => {
      if (tabId == null) {
        setError('No active tab to attach the side panel to.');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await stage();
        const res = await sendRuntimeMessage({
          type: 'OPEN_SIDE_PANEL',
          tabId,
        });
        if (!res.ok) throw new Error(res.error);
        window.close(); // popup owns no long-lived state
      } catch (e) {
        setBusy(false);
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    },
    [tabId],
  );

  const onReadPage = useCallback(() => {
    const source: PagePendingSource = {
      kind: 'page',
      tabId: tabId ?? -1,
      ...(pageTitle ? { title: pageTitle } : {}),
    };
    void launchPanel(() => stagePendingSource(source));
  }, [launchPanel, tabId, pageTitle]);

  const onFile = useCallback(
    (file: File) => {
      void launchPanel(async () => {
        try {
          const source = await fileToPendingSource(file);
          await stagePendingSource(source);
        } catch (e) {
          if (e instanceof FileTooLargeError) throw e;
          throw new Error(
            `Couldn't read "${file.name}". It may be corrupt or unsupported.`,
          );
        }
      });
    },
    [launchPanel],
  );

  return (
    <div className="w-[360px] bg-paper p-5 text-ink">
      <Header />
      {mode === 'choose' ? (
        <ChooseView
          busy={busy}
          onReadPage={onReadPage}
          onUpload={() => {
            setError(null);
            setMode('upload');
          }}
        />
      ) : (
        <UploadView
          busy={busy}
          onFile={onFile}
          onBack={() => {
            setError(null);
            setMode('choose');
          }}
        />
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-paper">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />
        </svg>
      </div>
      <div>
        <h1 className="text-base font-semibold leading-none">ReadAloud</h1>
        <p className="mt-0.5 text-xs text-ink-soft">Listen to anything.</p>
      </div>
    </div>
  );
}

function ChooseView({
  busy,
  onReadPage,
  onUpload,
}: {
  busy: boolean;
  onReadPage: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="grid gap-3">
      <ChoiceCard
        disabled={busy}
        onClick={onReadPage}
        title="Read this page"
        subtitle="Extract and narrate the current tab"
        icon={
          <path d="M4 4h12v2H4V4zm0 4h12v2H4V8zm0 4h8v2H4v-2zm14-6 4 4-4 4v-3h-4v-2h4V6z" />
        }
      />
      <ChoiceCard
        disabled={busy}
        onClick={onUpload}
        title="Upload a file"
        subtitle="PDF or TXT — EPUB & DOCX soon"
        icon={
          <path d="M12 3 7 8h3v6h4V8h3l-5-5zM5 18h14v2H5v-2z" />
        }
      />
    </div>
  );
}

function ChoiceCard({
  title,
  subtitle,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-paper">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          {icon}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-ink-soft">{subtitle}</span>
      </span>
    </button>
  );
}

function UploadView({
  busy,
  onFile,
  onBack,
}: {
  busy: boolean;
  onFile: (file: File) => void;
  onBack: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 text-xs text-ink-soft hover:text-ink"
      >
        ← Back
      </button>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragging
            ? 'border-accent bg-accent-soft'
            : 'border-slate-300 bg-slate-50'
        } ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="mb-2 h-8 w-8 text-accent"
          fill="currentColor"
        >
          <path d="M12 3 7 8h3v6h4V8h3l-5-5zM5 18h14v2H5v-2z" />
        </svg>
        <p className="text-sm font-medium">
          {busy ? 'Loading…' : 'Drag a file here'}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">PDF or TXT, up to 6 MB</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-paper transition hover:opacity-90 disabled:opacity-50"
        >
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>
    </div>
  );
}
