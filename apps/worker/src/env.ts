// Secrets (API keys) are injected via `wrangler secret put`, never present in source.
export interface Env {
  AI?: Ai;
  RATE_LIMIT?: KVNamespace;

  ENVIRONMENT: 'development' | 'staging' | 'production';
  SUMMARY_BACKEND: 'mock' | 'workers-ai';
  SUMMARY_MODEL: string;
  AI_GATEWAY_ID?: string;
  /** Comma-separated allowed origins, in addition to chrome-extension://*. */
  ALLOWED_ORIGINS: string;
  /** Requests per minute per IP per route. "0" disables. */
  RATE_LIMIT_PER_MIN: string;

  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TTS_MODEL?: string;
}

export const DEFAULT_SUMMARY_MODEL = '@cf/meta/llama-3.1-8b-instruct';
