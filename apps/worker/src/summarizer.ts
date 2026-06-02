/**
 * Summarizer abstraction. The handler depends only on the {@link Summarizer}
 * interface; the concrete backend is chosen per environment so local dev never
 * needs Cloudflare credentials.
 */

import { DEFAULT_SUMMARY_MODEL, type Env } from './env';

export interface SummarizeInput {
  text: string;
  title?: string | undefined;
}

export interface Summarizer {
  summarize(input: SummarizeInput): Promise<string>;
}

/** Offline backend for local dev / tests — deterministic, no network. */
export class MockSummarizer implements Summarizer {
  async summarize({ text, title }: SummarizeInput): Promise<string> {
    const words = text.split(/\s+/).filter(Boolean).length;
    const lead = text.replace(/\s+/g, ' ').slice(0, 180).trim();
    const titlePart = title ? ` of “${title}”` : '';
    return (
      `[mock summary${titlePart}] ${lead}${text.length > 180 ? '…' : ''} ` +
      `(${words} words. This is a local-dev stub — deploy to staging for a real Workers AI summary.)`
    );
  }
}

/** Minimal shape of the Workers AI text-generation call we rely on. */
interface TextGenAi {
  run(
    model: string,
    options: {
      messages: { role: 'system' | 'user'; content: string }[];
      max_tokens?: number;
    },
  ): Promise<{ response?: string }>;
}

export class WorkersAiSummarizer implements Summarizer {
  constructor(
    private readonly ai: TextGenAi,
    private readonly model: string,
  ) {}

  async summarize({ text, title }: SummarizeInput): Promise<string> {
    const result = await this.ai.run(this.model, {
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content:
            'You write tight, faithful TL;DR summaries. Respond with 3–5 ' +
            'sentences of plain prose. No preamble, no bullet points, no ' +
            'markdown — just the summary.',
        },
        {
          role: 'user',
          content: `${title ? `Title: ${title}\n\n` : ''}${text}`,
        },
      ],
    });
    const summary = (result.response ?? '').trim();
    if (!summary) throw new Error('Empty summary from model');
    return summary;
  }
}

/** Pick the summarizer for the current environment. */
export function getSummarizer(env: Env): Summarizer {
  if (env.SUMMARY_BACKEND === 'workers-ai' && env.AI) {
    return new WorkersAiSummarizer(
      env.AI as unknown as TextGenAi,
      env.SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL,
    );
  }
  return new MockSummarizer();
}
