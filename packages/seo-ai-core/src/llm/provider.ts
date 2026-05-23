import type { ILLMProvider } from './types.js';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GeminiAdapter } from './adapters/gemini.adapter.js';
import { LLMError } from '../errors/index.js';

export type LLMProviderName = 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface LLMConfig {
  provider: LLMProviderName;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  maxRetries?: number;
  /** AbortSignal/timeout etc. handled at invoke-call-site, not at construction. */
}

type AdapterCtor = new (cfg: LLMConfig) => ILLMProvider;

/**
 * Module-level mutable registry of provider name → adapter constructor.
 * Mutated by `registerLLMProvider` (intended for tests and plugins).
 * Not thread-safe across Node worker_threads, but Vitest uses per-file fork
 * isolation so tests don't collide.
 */
const REGISTRY = new Map<string, AdapterCtor>([
  ['anthropic', AnthropicAdapter],
  ['gemini', GeminiAdapter],
]);

export function createLLM(cfg: LLMConfig): ILLMProvider {
  const Ctor = REGISTRY.get(cfg.provider);
  if (!Ctor) {
    throw new LLMError(
      `Unknown LLM provider: "${cfg.provider}". Registered: ${Array.from(REGISTRY.keys()).join(', ')}`,
    );
  }
  return new Ctor(cfg);
}

export function registerLLMProvider(name: LLMProviderName, ctor: AdapterCtor): void {
  REGISTRY.set(name, ctor);
}
