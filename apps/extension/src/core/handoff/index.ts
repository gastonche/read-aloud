// Handoff over chrome.storage.session (not a runtime message): it decouples the
// popup's lifecycle from the panel's and avoids the SW→panel race where the
// panel may not exist yet. The ~10 MB session quota plus base64's ~33% inflation
// is why raw input is capped at MAX_FILE_BYTES.

import {
  HANDOFF_KEY,
  type FilePendingSource,
  type PendingSource,
} from '@/messaging/contract';

export const MAX_FILE_BYTES = 6 * 1024 * 1024; // 6 MB

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

export async function stagePendingSource(source: PendingSource): Promise<void> {
  await chrome.storage.session.set({ [HANDOFF_KEY]: source });
}

// Reads and clears in one shot so a panel reload doesn't re-trigger a stale handoff.
export async function readAndClearPendingSource(): Promise<PendingSource | null> {
  const record = await chrome.storage.session.get(HANDOFF_KEY);
  const source = record[HANDOFF_KEY] as PendingSource | undefined;
  if (!source) return null;
  await chrome.storage.session.remove(HANDOFF_KEY);
  return source;
}
