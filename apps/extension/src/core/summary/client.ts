// Calls the Worker's /summarize; the Worker (never the client) holds credentials.

import type { ApiError, SummarizeResponse } from '@readaloud/shared';
import type { NormalizedDoc } from '@/core/document/types';
import { WORKER_BASE_URL } from '@/config';

export function docToText(doc: NormalizedDoc): string {
  return doc.blocks.map((s) => s.text).join(' ');
}

export async function summarize(
  text: string,
  title?: string,
  signal?: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${WORKER_BASE_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title }),
      ...(signal ? { signal } : {}),
    });
  } catch {
    throw new Error(
      `Couldn't reach the summarizer at ${WORKER_BASE_URL}. Is the Worker running?`,
    );
  }

  if (!res.ok) {
    let message = `Summary failed (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as ApiError;
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }

  const data = (await res.json()) as SummarizeResponse;
  return data.summary;
}
