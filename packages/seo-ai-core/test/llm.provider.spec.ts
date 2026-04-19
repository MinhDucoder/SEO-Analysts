import { describe, it, expect } from 'vitest';
import { createLLM, registerLLMProvider, LLMError } from '../src/index.js';
import type { ILLMProvider, LLMConfig } from '../src/llm/provider.js';
import { FakeLLMProvider } from './_fixtures/fake-llm.adapter.js';

describe('createLLM', () => {
  it('routes provider:"anthropic" to AnthropicAdapter (smoke — no real call)', () => {
    const llm = createLLM({ provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'sk-test' });
    expect(llm.name).toBe('anthropic');
    expect(llm.model).toBe('claude-sonnet-4-6');
  });

  it('throws LLMError on unknown provider', () => {
    expect(() =>
      createLLM({ provider: 'gemini' as unknown as 'openai', model: 'x' }),
    ).toThrow(LLMError);
  });

  it('registerLLMProvider adds a custom provider', () => {
    class TestAdapter implements ILLMProvider {
      readonly name = 'test-custom';
      readonly model: string;
      constructor(cfg: LLMConfig) { this.model = cfg.model; }
      async invoke() { return new FakeLLMProvider().invoke({ messages: [] }); }
      async *stream() { yield { delta: '' }; }
      async countTokens() { return 0; }
    }
    registerLLMProvider('test-custom' as 'openai', TestAdapter);
    const llm = createLLM({ provider: 'test-custom' as 'openai', model: 'x' });
    expect(llm.name).toBe('test-custom');
  });
});
