import type { ILLMProvider, LLMRequest, LLMResponse, LLMChunk } from '../../src/index.js';
import { createHash } from 'node:crypto';

/**
 * Test-only adapter. Returns scripted responses keyed by the sha256 hash of
 * the request's stringified messages. Falls back to `defaultResponse`.
 */
export class FakeLLMProvider implements ILLMProvider {
  readonly name = 'fake';
  readonly model: string;
  private readonly scripted: Map<string, LLMResponse>;
  private readonly defaultResponse: LLMResponse;
  invocations = 0;

  constructor(opts: {
    model?: string;
    scripted?: Record<string, LLMResponse>;
    defaultResponse?: LLMResponse;
  } = {}) {
    this.model = opts.model ?? 'fake-model-v1';
    this.scripted = new Map(Object.entries(opts.scripted ?? {}));
    this.defaultResponse = opts.defaultResponse ?? {
      content: '{"ok":true}',
      usage: { prompt: 0, completion: 0, total: 0 },
      model: this.model,
      finishReason: 'stop',
    };
  }

  static keyOf(req: LLMRequest): string {
    return createHash('sha256')
      .update(JSON.stringify(req.messages))
      .digest('hex')
      .slice(0, 16);
  }

  async invoke(req: LLMRequest): Promise<LLMResponse> {
    this.invocations += 1;
    const key = FakeLLMProvider.keyOf(req);
    return this.scripted.get(key) ?? this.defaultResponse;
  }

  async *stream(req: LLMRequest): AsyncIterable<LLMChunk> {
    const r = await this.invoke(req);
    yield { delta: r.content, usage: r.usage };
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }
}
