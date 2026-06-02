/**
 * Floating page-reader bar (content script, v0.2.0 M2 — minimal).
 *
 * Mounts a React app inside a Shadow DOM host (style isolation) and drives
 * playback with the shared usePlayer hook — engines run in the page world, and
 * the on-page highlighter (page-reader singleton) is driven from the highlight
 * stream. M3 adds drag-to-snap and the rich voice/speed/language controls.
 */

import { StrictMode, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { NormalizedDoc } from '@/core/document/types';
import { usePlayer } from '@/ui/hooks/usePlayer';
import { clearPaint, paint } from './page-reader';

const HOST_ID = 'readaloud-bar-host';

const BAR_CSS = `
:host { all: initial; }
.bar {
  position: fixed; right: 12px; top: 50%; transform: translateY(-50%);
  z-index: 2147483647;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 12px 8px; border-radius: 9999px;
  background: #ffffff; box-shadow: 0 8px 30px rgba(15,23,42,.18);
  border: 1px solid #e2e8f0;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.play {
  width: 44px; height: 44px; border-radius: 9999px; border: none; cursor: pointer;
  background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff;
  display: flex; align-items: center; justify-content: center;
  transition: transform .1s ease;
}
.play:active { transform: scale(.94); }
.play svg { width: 22px; height: 22px; fill: currentColor; }
.progress { font-size: 10px; color: #64748b; font-variant-numeric: tabular-nums; writing-mode: vertical-rl; }
.icon-btn {
  width: 28px; height: 28px; border-radius: 9999px; border: none; cursor: pointer;
  background: transparent; color: #64748b; display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover { background: #f1f5f9; color: #0f172a; }
.icon-btn svg { width: 16px; height: 16px; fill: currentColor; }
`;

let host: HTMLElement | null = null;
let root: Root | null = null;

export function mountBar(doc: NormalizedDoc): void {
  if (host) {
    unmountBar();
  }
  host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = BAR_CSS;
  shadow.appendChild(style);
  const mount = document.createElement('div');
  shadow.appendChild(mount);
  document.documentElement.appendChild(host);

  root = createRoot(mount);
  root.render(
    <StrictMode>
      <Bar doc={doc} onClose={unmountBar} />
    </StrictMode>,
  );
}

export function unmountBar(): void {
  clearPaint();
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}

function Bar({ doc, onClose }: { doc: NormalizedDoc; onClose: () => void }) {
  const player = usePlayer(doc);

  // Drive the on-page highlighter from the playback highlight stream.
  useEffect(() => {
    paint(player.highlight.sentenceId, player.highlight.wordIndex, true);
  }, [player.highlight]);

  const playing = player.status === 'playing';
  const current = Math.min(
    Math.max(player.highlight.sentenceId + 1, 0),
    doc.blocks.length,
  );

  return (
    <div className="bar" role="toolbar" aria-label="ReadAloud">
      <button
        type="button"
        className="play"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={player.toggle}
      >
        <svg viewBox="0 0 24 24">
          {playing ? (
            <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" />
          ) : (
            <path d="M8 5v14l11-7L8 5z" />
          )}
        </svg>
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="Next sentence"
        onClick={player.next}
      >
        <svg viewBox="0 0 24 24">
          <path d="M15 6h2v12h-2V6zM5 6v12l8.5-6L5 6z" />
        </svg>
      </button>
      <span className="progress">
        {current}/{doc.blocks.length}
      </span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Close ReadAloud"
        onClick={onClose}
      >
        <svg viewBox="0 0 24 24">
          <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
        </svg>
      </button>
    </div>
  );
}
