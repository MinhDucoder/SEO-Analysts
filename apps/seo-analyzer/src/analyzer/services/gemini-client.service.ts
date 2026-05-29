import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

interface Options {
  model?: string;
  timeoutMs?: number;
  temperature?: number;
}

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);
  private readonly model: GenerativeModel;
  private readonly timeoutMs: number;

  constructor(apiKey: string | undefined = process.env.GEMINI_API_KEY ?? process.env.SEO_AI_API_KEY, opts: Options = {}) {
    if (!apiKey) throw new Error('Gemini API key is required');
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({
      model: opts.model ?? 'gemini-2.0-flash-001',
      generationConfig: { temperature: opts.temperature ?? 0.2, responseMimeType: 'application/json' },
    });
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  async completeJson<T = unknown>(prompt: string): Promise<T> {
    const work = this.model.generateContent(prompt);
    const out = await Promise.race([
      work,
      new Promise((_, rej) => setTimeout(() => rej(new Error('LLM call timeout')), this.timeoutMs)),
    ]) as any;
    let text = out.response.text() as string;
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(text) as T;
  }
}
