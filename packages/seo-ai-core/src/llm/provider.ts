/**
 * @file Factory for provider-neutral LLM construction. Keeps
 * consumers from importing adapters directly — they name a
 * provider, pass options, get an ILLM back.
 */
import type { ILLM } from './types';
import { AnthropicAdapter } from './adapters/anthropic.adapter';

export type LLMProviderId = 'anthropic';

export interface CreateLLMOptions {
  provider: LLMProviderId;
  apiKey?: string;
  model: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  baseURL?: string;
}

type Builder = (opts: CreateLLMOptions) => ILLM;

const REGISTRY = new Map<LLMProviderId, Builder>([
  [
    'anthropic',
    (opts) => {
      const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('createLLM(anthropic): apiKey option or ANTHROPIC_API_KEY env required');
      }
      return new AnthropicAdapter({
        apiKey,
        model: opts.model,
        defaultMaxTokens: opts.defaultMaxTokens,
        defaultTemperature: opts.defaultTemperature,
        baseURL: opts.baseURL,
      });
    },
  ],
]);

export function registerLLMProvider(id: LLMProviderId, builder: Builder): void {
  REGISTRY.set(id, builder);
}

export function createLLM(opts: CreateLLMOptions): ILLM {
  const builder = REGISTRY.get(opts.provider);
  if (!builder) throw new Error(`createLLM: unknown provider "${opts.provider}"`);
  return builder(opts);
}
