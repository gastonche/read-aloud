/**
 * Fixed-window per-IP, per-route rate limiter backed by KV.
 *
 * Deliberately simple (a KV counter with a short TTL): good enough to blunt
 * abuse of the paid upstreams (ElevenLabs / Workers AI) without standing up a
 * Durable Object. No-ops when KV is absent (local dev) or the limit is 0.
 */

import type { MiddlewareHandler } from 'hono';
import type { ApiError } from '@readaloud/shared';
import type { Env } from './env';

export const rateLimit: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  const limit = Number(c.env.RATE_LIMIT_PER_MIN ?? '0');
  const kv = c.env.RATE_LIMIT;
  if (!kv || !Number.isFinite(limit) || limit <= 0) return next();

  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  const route = new URL(c.req.url).pathname;
  const minute = Math.floor(Date.now() / 60_000);
  const key = `rl:${route}:${ip}:${minute}`;

  const used = Number((await kv.get(key)) ?? '0');
  if (used >= limit) {
    const body: ApiError = {
      error: 'Rate limit exceeded. Please wait a moment and try again.',
      code: 'rate_limited',
    };
    return c.json(body, 429, { 'Retry-After': '60' });
  }
  // TTL must be >= 60s; window is 60s so a little slack is fine.
  await kv.put(key, String(used + 1), { expirationTtl: 90 });
  return next();
};
