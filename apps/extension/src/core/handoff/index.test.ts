import { describe, it, expect } from 'vitest';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  fileToPendingSource,
  FileTooLargeError,
  MAX_FILE_BYTES,
} from './index';

function bytes(...vals: number[]): ArrayBuffer {
  return new Uint8Array(vals).buffer;
}

describe('base64 codecs', () => {
  it('round-trips arbitrary byte sequences', () => {
    const original = bytes(0, 1, 2, 254, 255, 127, 128);
    const restored = base64ToArrayBuffer(arrayBufferToBase64(original));
    expect(new Uint8Array(restored)).toEqual(new Uint8Array(original));
  });

  it('round-trips a multi-chunk buffer (> 32k) without stack overflow', () => {
    const big = new Uint8Array(100_000);
    for (let i = 0; i < big.length; i++) big[i] = i % 256;
    const restored = new Uint8Array(
      base64ToArrayBuffer(arrayBufferToBase64(big.buffer)),
    );
    expect(restored.length).toBe(big.length);
    expect(restored).toEqual(big);
  });

  it('encodes empty buffers to empty strings', () => {
    expect(arrayBufferToBase64(new ArrayBuffer(0))).toBe('');
    expect(base64ToArrayBuffer('').byteLength).toBe(0);
  });
});

describe('fileToPendingSource', () => {
  it('produces a staged source whose decoded bytes match the input', async () => {
    const content = 'The quick brown fox.';
    const file = new File([content], 'note.txt', { type: 'text/plain' });
    const source = await fileToPendingSource(file);

    expect(source).toMatchObject({
      kind: 'file',
      name: 'note.txt',
      mime: 'text/plain',
      size: content.length,
    });
    const decoded = new TextDecoder().decode(
      base64ToArrayBuffer(source.dataBase64),
    );
    expect(decoded).toBe(content);
  });

  it('falls back to a generic MIME when the file type is empty', async () => {
    const file = new File(['x'], 'unknown.bin', { type: '' });
    const source = await fileToPendingSource(file);
    expect(source.mime).toBe('application/octet-stream');
  });

  it('rejects files over the size limit with FileTooLargeError', async () => {
    const huge = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.pdf', {
      type: 'application/pdf',
    });
    await expect(fileToPendingSource(huge)).rejects.toBeInstanceOf(
      FileTooLargeError,
    );
  });

  it('accepts files exactly at the limit', async () => {
    const atLimit = new File([new Uint8Array(MAX_FILE_BYTES)], 'edge.pdf', {
      type: 'application/pdf',
    });
    await expect(fileToPendingSource(atLimit)).resolves.toMatchObject({
      size: MAX_FILE_BYTES,
    });
  });
});
