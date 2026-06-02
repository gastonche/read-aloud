import { describe, it, expect } from 'vitest';
import app from './index';
import type { Env } from './env';

class FakeKV {
  private m = new Map<string, string>();
  async get(k: string): Promise<string | null> {
    return this.m.get(k) ?? null;
  }
  async put(k: string, v: string): Promise<void> {
    this.m.set(k, v);
  }
}

const devEnv = (over: Partial<Env> = {}): Env => ({
  ENVIRONMENT: 'development',
  SUMMARY_BACKEND: 'mock',
  SUMMARY_MODEL: '@cf/meta/llama-3.1-8b-instruct',
  ALLOWED_ORIGINS: '',
  RATE_LIMIT_PER_MIN: '0',
  ...over,
});

const post = (body: unknown, origin?: string) =>
  new Request('http://worker.local/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('GET /health', () => {
  it('reports environment and backend', async () => {
    const res = await app.fetch(new Request('http://worker.local/health'), devEnv());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      environment: 'development',
      summaryBackend: 'mock',
    });
  });
});

describe('POST /summarize', () => {
  it('returns a (mock) summary for valid text', async () => {
    const res = await app.fetch(post({ text: 'Hello world. '.repeat(20) }), devEnv());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { summary: string };
    expect(json.summary).toContain('mock summary');
  });

  it('400s when text is missing', async () => {
    const res = await app.fetch(post({ title: 'x' }), devEnv());
    expect(res.status).toBe(400);
    expect((await res.json()) as object).toMatchObject({ code: 'bad_request' });
  });

  it('400s on invalid JSON', async () => {
    const res = await app.fetch(post('{not json'), devEnv());
    expect(res.status).toBe(400);
  });
});

describe('CORS', () => {
  it('allows chrome-extension origins', async () => {
    const res = await app.fetch(
      new Request('http://worker.local/summarize', {
        method: 'OPTIONS',
        headers: {
          Origin: 'chrome-extension://abcdefabcdef',
          'Access-Control-Request-Method': 'POST',
        },
      }),
      devEnv(),
    );
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'chrome-extension://abcdefabcdef',
    );
  });

  it('rejects unknown web origins', async () => {
    const res = await app.fetch(post({ text: 'hi there.' }, 'https://evil.example'), devEnv());
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('rate limiting', () => {
  it('429s past the per-minute limit', async () => {
    const env = devEnv({
      RATE_LIMIT_PER_MIN: '1',
      RATE_LIMIT: new FakeKV() as unknown as KVNamespace,
    });
    const first = await app.fetch(post({ text: 'one.' }), env);
    expect(first.status).toBe(200);
    const second = await app.fetch(post({ text: 'two.' }), env);
    expect(second.status).toBe(429);
    expect((await second.json()) as object).toMatchObject({ code: 'rate_limited' });
  });
});
