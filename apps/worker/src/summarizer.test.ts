import { describe, it, expect } from 'vitest';
import {
  WorkersAiSummarizer,
  MockSummarizer,
  getSummarizer,
} from './summarizer';
import type { Env } from './env';

interface Captured {
  model: string;
  messages: { role: string; content: string }[];
  options?: { gateway?: { id: string } };
}

/** Fake Workers AI that records the call and returns a canned response. */
function fakeAi(response: string) {
  const calls: Captured[] = [];
  const ai = {
    run(
      model: string,
      inputs: { messages: { role: string; content: string }[] },
      options?: { gateway?: { id: string } },
    ) {
      calls.push({ model, messages: inputs.messages, ...(options ? { options } : {}) });
      return Promise.resolve({ response });
    },
  };
  return { ai, calls };
}

describe('WorkersAiSummarizer', () => {
  it('sends the document text and returns a trimmed summary', async () => {
    const { ai, calls } = fakeAi('  A concise summary.  ');
    const out = await new WorkersAiSummarizer(ai, 'model-x').summarize({
      text: 'The body of the document.',
      title: 'Doc',
    });
    expect(out).toBe('A concise summary.');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.model).toBe('model-x');
    const user = calls[0]!.messages.find((m) => m.role === 'user');
    expect(user?.content).toContain('The body of the document.');
    expect(user?.content).toContain('Doc');
  });

  it('instructs the model to convey substance, not describe the document', async () => {
    const { ai, calls } = fakeAi('ok');
    await new WorkersAiSummarizer(ai, 'm').summarize({ text: 'x' });
    const system = calls[0]!.messages.find((m) => m.role === 'system')!.content;
    expect(system).toMatch(/do not describe or refer to the text/i);
    expect(system).toContain('This article is about');
    expect(system).toContain('substance');
  });

  it('routes through the AI Gateway when an id is provided', async () => {
    const { ai, calls } = fakeAi('ok');
    await new WorkersAiSummarizer(ai, 'm', 'my-gateway').summarize({ text: 'x' });
    expect(calls[0]!.options?.gateway).toEqual({ id: 'my-gateway' });
  });

  it('omits the gateway option when no id is provided', async () => {
    const { ai, calls } = fakeAi('ok');
    await new WorkersAiSummarizer(ai, 'm').summarize({ text: 'x' });
    expect(calls[0]!.options).toBeUndefined();
  });

  it('throws on an empty model response', async () => {
    const { ai } = fakeAi('   ');
    await expect(
      new WorkersAiSummarizer(ai, 'm').summarize({ text: 'x' }),
    ).rejects.toThrow(/empty/i);
  });
});

describe('getSummarizer', () => {
  const base: Env = {
    ENVIRONMENT: 'development',
    SUMMARY_BACKEND: 'workers-ai',
    SUMMARY_MODEL: 'm',
    ALLOWED_ORIGINS: '',
    RATE_LIMIT_PER_MIN: '0',
  };

  it('uses Workers AI when configured and bound', () => {
    const env: Env = { ...base, AI: {} as unknown as Ai };
    expect(getSummarizer(env)).toBeInstanceOf(WorkersAiSummarizer);
  });

  it('falls back to the mock when no AI binding is present', () => {
    expect(getSummarizer(base)).toBeInstanceOf(MockSummarizer);
  });

  it('uses the mock when SUMMARY_BACKEND is mock', () => {
    const env: Env = { ...base, SUMMARY_BACKEND: 'mock', AI: {} as unknown as Ai };
    expect(getSummarizer(env)).toBeInstanceOf(MockSummarizer);
  });
});
