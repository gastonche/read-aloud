/**
 * File / page handoff over chrome.storage.session.
 *
 * Why storage.session (not a runtime message) for files:
 *  - It decouples producer (popup) from consumer (side panel) lifecycles. The
 *    popup can stage and close immediately; the panel reads on its own boot.
 *  - It avoids the SW→panel race (panel may not exist when the SW runs).
 *
 * Size budget:
 *  - storage.session has a ~10 MB quota. base64 inflates bytes by ~33%, so a
 *    raw file must stay well under that. We cap raw input at MAX_FILE_BYTES and
 *    surface a clear, catchable error above it (handled as an upload error in
 *    the popup UI). Larger files are a known limitation documented in the README.
 */

import {
  HANDOFF_KEY,
  type FilePendingSource,
  type PendingSource,
} from '@/messaging/contract';

/** Raw upload ceiling. Leaves headroom under the ~10 MB session quota post-base64. */
export const MAX_FILE_BYTES = 6 * 1024 * 1024; // 6 MB

/** Thrown when an uploaded file exceeds {@link MAX_FILE_BYTES}. */
export class FileTooLargeError extends Error {
  constructor(
    readonly size: number,
    readonly limit: number = MAX_FILE_BYTES,
  ) {
    super(
      `File is ${(size / 1024 / 1024).toFixed(1)} MB, which exceeds the ` +
        `${(limit / 1024 / 1024).toFixed(0)} MB handoff limit.`,
    );
    this.name = 'FileTooLargeError';
  }
}

// ─────────────────────────── base64 codecs ───────────────────────────
// Chunked to avoid blowing the call stack on String.fromCharCode(...spread)
// for multi-megabyte buffers.

const CHUNK = 0x8000; // 32k

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ───────────────────────── stage / read / clear ──────────────────────

/** Read a File into a staged, message-safe FilePendingSource (or throw). */
export async function fileToPendingSource(
  file: File,
): Promise<FilePendingSource> {
  if (file.size > MAX_FILE_BYTES) {
    throw new FileTooLargeError(file.size);
  }
  const buffer = await file.arrayBuffer();
  return {
    kind: 'file',
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    dataBase64: arrayBufferToBase64(buffer),
  };
}

/** Stage the source the side panel should consume on its next boot. */
export async function stagePendingSource(source: PendingSource): Promise<void> {
  await chrome.storage.session.set({ [HANDOFF_KEY]: source });
}

/**
 * Read the pending source exactly once and clear it, so a panel reload doesn't
 * re-trigger a stale handoff. Returns null if nothing is staged.
 */
export async function readAndClearPendingSource(): Promise<PendingSource | null> {
  const record = await chrome.storage.session.get(HANDOFF_KEY);
  const source = record[HANDOFF_KEY] as PendingSource | undefined;
  if (!source) return null;
  await chrome.storage.session.remove(HANDOFF_KEY);
  return source;
}
