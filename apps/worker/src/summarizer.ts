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

interface TextGenAi {
  run(
    model: string,
    inputs: {
      messages: { role: 'system' | 'user'; content: string }[];
      max_tokens?: number;
    },
    options?: { gateway?: { id: string } },
  ): Promise<{ response?: string }>;
}

export class WorkersAiSummarizer implements Summarizer {
  constructor(
    private readonly ai: TextGenAi,
    private readonly model: string,
    /** Cloudflare AI Gateway id; when set, all calls route through it. */
    private readonly gatewayId?: string,
  ) {}

  async summarize({ text, title }: SummarizeInput): Promise<string> {
    const result = await this.ai.run(
      this.model,
      {
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content:
              'Summarize the substance of the text itself: state its key ' +
              'points, facts, and conclusions directly, as if conveying the ' +
              'information to the reader. Do NOT describe or refer to the ' +
              'text — never write things like "This article is about", ' +
              '"The text discusses", "This content covers", "The author ' +
              'explains", or "In summary". Write the summary in the SAME ' +
              'language as the text. Just deliver the content in 3–5 ' +
              'sentences of plain prose. No preamble, no bullet points, no ' +
              'markdown.',
          },
          {
            role: 'user',
            content: `${title ? `Title: ${title}\n\n` : ''}${text}`,
          },
        ],
      },
      this.gatewayId ? { gateway: { id: this.gatewayId } } : undefined,
    );
    const summary = (result.response ?? '').trim();
    if (!summary) throw new Error('Empty summary from model');
    return summary;
  }
}

export function getSummarizer(env: Env): Summarizer {
  if (env.SUMMARY_BACKEND === 'workers-ai' && env.AI) {
    return new WorkersAiSummarizer(
      env.AI as unknown as TextGenAi,
      env.SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL,
      env.AI_GATEWAY_ID || undefined,
    );
  }
  return new MockSummarizer();
}
