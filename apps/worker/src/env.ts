/**
 * Worker bindings + vars, per environment.
 *
 * All environments (including local `wrangler dev`) call real Workers AI
 * routed through the Cloudflare AI Gateway, so local dev needs `wrangler login`.
 * The 'mock' backend is only a credential-free fallback used by the E2E suite
 * (which sets SUMMARY_BACKEND=mock) and by unit tests (no AI binding).
 *
 * Secrets (ELEVENLABS_API_KEY) are injected via `wrangler secret put` and are
 * never present in source or wrangler.toml.
 */

export interface Env {
  /** Workers AI binding. Absent only in unit tests / forced-mock runs. */
  AI?: Ai;
  /** KV namespace backing the rate limiter. */
  RATE_LIMIT?: KVNamespace;

  ENVIRONMENT: 'development' | 'staging' | 'production';
  /** 'workers-ai' (default, via AI Gateway) or 'mock' (offline fallback). */
  SUMMARY_BACKEND: 'mock' | 'workers-ai';
  SUMMARY_MODEL: string;
  /** Cloudflare AI Gateway id to route Workers AI through. Empty = direct. */
  AI_GATEWAY_ID?: string;
  /** Comma-separated allowed origins (in addition to chrome-extension://*). */
  ALLOWED_ORIGINS: string;
  /** Requests per minute per IP per route. "0" disables. */
  RATE_LIMIT_PER_MIN: string;

  // ── Neural TTS providers (secrets). The set of configured keys decides which
  //    voices /voices advertises and which providers /tts can route to. ──
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  OPENAI_API_KEY?: string;
  /** OpenAI TTS model (default gpt-4o-mini-tts). */
  OPENAI_TTS_MODEL?: string;
}

export const DEFAULT_SUMMARY_MODEL = '@cf/meta/llama-3.1-8b-instruct';
