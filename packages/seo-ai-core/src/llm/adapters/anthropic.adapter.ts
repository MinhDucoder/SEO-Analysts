/**
 * @file SINGLE file in this package allowed to import @langchain/*.
 * Wrap `ChatAnthropic` behind the neutral `ILLM` interface.
 *
 * Security: API key comes from constructor only — never read from
 * process.env here. That keeps the adapter unit-testable without
 * leaking env access. The consumer's factory (gateway side) is
 * responsible for sourcing the key.
 */
import { ChatAnthropic } from '@langchain/anthropic';
import type { ILLM, LLMRequest, LLMResponse } from '../types';
import { toBaseMessages, toLLMResponse } from './_mappers';
import { LLMError } from '../../errors';

export interface AnthropicAdapterOptions {
  apiKey: string;
  model: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  baseURL?: string;
}

export class AnthropicAdapter implements ILLM {
  readonly providerId = 'anthropic';
  readonly modelId: string;
  private readonly client: ChatAnthropic;

  constructor(private readonly opts: AnthropicAdapterOptions) {
    this.modelId = opts.model;
    this.client = new ChatAnthropic({
      apiKey: opts.apiKey,
      model: opts.model,
      maxTokens: opts.defaultMaxTokens ?? 2048,
      temperature: opts.defaultTemperature ?? 0.2,
      clientOptions: opts.baseURL ? { baseURL: opts.baseURL } : undefined,
    });
  }

  async invoke(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    try {
      const msg = await this.client.invoke(toBaseMessages(req.messages), {
        signal,
        metadata: req.metadata,
        configurable: {
          maxTokens: req.maxTokens ?? this.opts.defaultMaxTokens ?? 2048,
          temperature: req.temperature ?? this.opts.defaultTemperature ?? 0.2,
        },
      });
      return toLLMResponse(msg as never);
    } catch (err) {
      throw new LLMError(
        err instanceof Error ? err.message : 'anthropic invoke failed',
        { cause: err, retriable: true },
      );
    }
  }
}
