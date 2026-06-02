/**
 * ReadAloud Worker (Hono).
 *
 *   GET  /health     liveness + which environment/backend is live
 *   POST /summarize  Workers AI TL;DR (mock backend in local dev)
 *   POST /tts        ElevenLabs proxy — implemented in milestone 6
 *
 * CORS is restricted to chrome-extension://* (the extension) plus any
 * ALLOWED_ORIGINS, and localhost in development.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type {
  ApiError,
  SummarizeRequest,
  SummarizeResponse,
  TtsRequest,
} from '@readaloud/shared';
import type { Env } from './env';
import { getSummarizer } from './summarizer';
import { getTtsProvider } from './tts';
import { rateLimit } from './ratelimit';

const MAX_SUMMARY_CHARS = 12_000;

const app = new Hono<{ Bindings: Env }>();

// ── CORS ─────────────────────────────────────────────────────────────
app.use('*', (c, next) =>
  cors({
    origin: (origin) => {
      if (!origin) return origin; // same-origin / non-CORS
      if (origin.startsWith('chrome-extension://')) return origin;
      if (c.env.ENVIRONMENT === 'development' && origin.startsWith('http://localhost'))
        return origin;
      const allowed = (c.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86_400,
  })(c, next),
);

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'readaloud-worker',
    environment: c.env.ENVIRONMENT,
    summaryBackend: c.env.SUMMARY_BACKEND,
  }),
);

// ── POST /summarize ──────────────────────────────────────────────────
app.post('/summarize', rateLimit, async (c) => {
  let body: SummarizeRequest;
  try {
    body = await c.req.json<SummarizeRequest>();
  } catch {
    return c.json<ApiError>(
      { error: 'Request body must be valid JSON.', code: 'bad_request' },
      400,
    );
  }

  const text = (body.text ?? '').trim();
  if (!text) {
    return c.json<ApiError>(
      { error: '`text` is required.', code: 'bad_request' },
      400,
    );
  }

  const truncated = text.length > MAX_SUMMARY_CHARS;
  const input = truncated ? text.slice(0, MAX_SUMMARY_CHARS) : text;

  try {
    const summary = await getSummarizer(c.env).summarize({
      text: input,
      title: body.title,
    });
    // Cost/usage signal for the writeup.
    console.log(
      JSON.stringify({
        route: '/summarize',
        env: c.env.ENVIRONMENT,
        backend: c.env.SUMMARY_BACKEND,
        chars: input.length,
        truncated,
      }),
    );
    return c.json<SummarizeResponse>({ summary });
  } catch (err) {
    console.error('summarize failed:', err);
    return c.json<ApiError>(
      { error: 'The summarizer is unavailable right now.', code: 'upstream_error' },
      502,
    );
  }
});

// ── POST /tts ────────────────────────────────────────────────────────
app.post('/tts', rateLimit, async (c) => {
  let body: TtsRequest;
  try {
    body = await c.req.json<TtsRequest>();
  } catch {
    return c.json<ApiError>(
      { error: 'Request body must be valid JSON.', code: 'bad_request' },
      400,
    );
  }

  const text = (body.text ?? '').trim();
  if (!text) {
    return c.json<ApiError>(
      { error: '`text` is required.', code: 'bad_request' },
      400,
    );
  }

  try {
    const result = await getTtsProvider(c.env).synthesize({
      text,
      voiceId: body.voiceId,
    });
    console.log(
      JSON.stringify({
        route: '/tts',
        env: c.env.ENVIRONMENT,
        chars: text.length, // ElevenLabs bills per character
        mock: !c.env.ELEVENLABS_API_KEY,
      }),
    );
    return c.json(result);
  } catch (err) {
    console.error('tts failed:', err);
    return c.json<ApiError>(
      { error: 'Neural voice is unavailable right now.', code: 'upstream_error' },
      502,
    );
  }
});

app.notFound((c) =>
  c.json<ApiError>({ error: 'Not found.', code: 'bad_request' }, 404),
);

export default app;
