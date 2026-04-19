import { ChatAnthropic } from '@langchain/anthropic';
import type { AIMessage } from '@langchain/core/messages';
import type { ILLMProvider, LLMRequest, LLMResponse, LLMChunk } from '../types.js';
import type { LLMConfig } from '../provider.js';
import { LLMError } from '../../errors/index.js';
import { toLangChainMessages, toLLMResponse } from './_mappers.js';

export class AnthropicAdapter implements ILLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly client: ChatAnthropic;

  constructor(cfg: LLMConfig) {
    if (!cfg.apiKey && !process.env['ANTHROPIC_API_KEY']) {
      throw new LLMError(
        'AnthropicAdapter: missing apiKey (pass cfg.apiKey or set ANTHROPIC_API_KEY env)',
      );
    }
    this.model = cfg.model;
    this.client = new ChatAnthropic({
      apiKey: cfg.apiKey ?? process.env['ANTHROPIC_API_KEY'],
      model: cfg.model,
      temperature: cfg.defaultTemperature ?? 0.2,
      maxTokens: cfg.defaultMaxTokens ?? 4096,
      maxRetries: cfg.maxRetries ?? 2,
      anthropicApiUrl: cfg.baseUrl,
    });
  }

  async invoke(req: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    try {
      const result = (await this.client.invoke(toLangChainMessages(req.messages), {
        signal,
        stop: req.stopSequences,
      })) as AIMessage;
      return toLLMResponse(result, this.model);
    } catch (err) {
      throw new LLMError(`Anthropic invoke failed: ${(err as Error).message}`, { cause: err });
    }
  }

  async *stream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMChunk> {
    try {
      const stream = await this.client.stream(toLangChainMessages(req.messages), {
        signal,
        stop: req.stopSequences,
      });
      for await (const chunk of stream) {
        const delta = typeof chunk.content === 'string' ? chunk.content : '';
        if (delta) yield { delta };
      }
    } catch (err) {
      throw new LLMError(`Anthropic stream failed: ${(err as Error).message}`, { cause: err });
    }
  }

  async countTokens(text: string): Promise<number> {
    return this.client.getNumTokens(text);
  }
}
