import { ChatAnthropic } from '@langchain/anthropic';
import type { AIMessage } from '@langchain/core/messages';
import type { ILLMProvider, LLMRequest, LLMResponse, LLMChunk, TokenUsage } from '../types.js';
import type { LLMConfig } from '../provider.js';
import { LLMError } from '../../errors/index.js';
import { toLangChainMessages, toLLMResponse } from './_mappers.js';

export class AnthropicAdapter implements ILLMProvider {
  readonly name = 'anthropic';
  readonly providerId = 'anthropic';
  readonly model: string;
  readonly modelId: string;
  private readonly client: ChatAnthropic;

  constructor(cfg: LLMConfig) {
    const resolvedKey = cfg.apiKey || process.env['ANTHROPIC_API_KEY'];
    if (!resolvedKey) {
      throw new LLMError(
        'AnthropicAdapter: missing apiKey (pass cfg.apiKey or set ANTHROPIC_API_KEY env)',
      );
    }
    this.model = cfg.model;
    this.modelId = cfg.model;
    this.client = new ChatAnthropic({
      apiKey: resolvedKey,
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
      throw new LLMError(`Anthropic invoke failed: ${(err as Error).message}`, {
        cause: err,
        retriable: true,
      });
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
        const meta = chunk.usage_metadata;
        const usage: TokenUsage | undefined = meta
          ? {
              prompt: meta.input_tokens ?? 0,
              completion: meta.output_tokens ?? 0,
              total: meta.total_tokens ?? (meta.input_tokens ?? 0) + (meta.output_tokens ?? 0),
            }
          : undefined;
        if (delta || usage) {
          yield usage ? { delta, usage } : { delta };
        }
      }
    } catch (err) {
      throw new LLMError(`Anthropic stream failed: ${(err as Error).message}`, {
        cause: err,
        retriable: true,
      });
    }
  }

  async countTokens(text: string): Promise<number> {
    return this.client.getNumTokens(text);
  }
}
