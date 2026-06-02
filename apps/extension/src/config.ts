/**
 * Build-time configuration.
 *
 * WORKER_BASE_URL points at the ReadAloud Worker:
 *   - local dev (default): http://localhost:8787 (`wrangler dev`)
 *   - staging/production:  set VITE_WORKER_URL at build time, e.g.
 *       VITE_WORKER_URL=https://readaloud-worker.<acct>.workers.dev npm run build
 */
const env = import.meta.env as Record<string, string | undefined>;

export const WORKER_BASE_URL =
  env.VITE_WORKER_URL?.replace(/\/$/, '') ?? 'http://localhost:8787';
