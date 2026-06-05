const env = import.meta.env as Record<string, string | undefined>;

export const WORKER_BASE_URL =
  env.VITE_WORKER_URL?.replace(/\/$/, '') ?? 'http://localhost:8787';
