/**
 * Worker bindings + vars, per environment.
 *
 * - development (default `wrangler dev`): no AI binding, mock summarizer →
 *   runs fully offline with no Cloudflare auth. KV is Miniflare-local.
 * - staging / production: real `AI` binding + real KV namespace.
 *
 * Secrets (ELEVENLABS_API_KEY) are injected via `wrangler secret put` and are
 * never present in source or wrangler.toml.
 */

export interface Env {
  /** Workers AI binding. Present only in staging/production. */
  AI?: Ai;
  /** KV namespace backing the rate limiter. */
  RATE_LIMIT?: KVNamespace;

  ENVIRONMENT: 'development' | 'staging' | 'production';
  /** 'mock' (offline) or 'workers-ai'. */
  SUMMARY_BACKEND: 'mock' | 'workers-ai';
  SUMMARY_MODEL: string;
  /** Comma-separated allowed origins (in addition to chrome-extension://*). */
  ALLOWED_ORIGINS: string;
  /** Requests per minute per IP per route. "0" disables. */
  RATE_LIMIT_PER_MIN: string;

  // ── ElevenLabs (milestone 6) ──
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

export const DEFAULT_SUMMARY_MODEL = '@cf/meta/llama-3.1-8b-instruct';
