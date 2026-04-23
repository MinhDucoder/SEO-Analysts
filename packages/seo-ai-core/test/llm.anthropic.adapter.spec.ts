import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();
vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}));

import { AnthropicAdapter } from '../src/llm/adapters/anthropic.adapter';
import { LLMError } from '../src/errors';

describe('AnthropicAdapter', () => {
  beforeEach(() => invokeMock.mockReset());

  it('invoke() maps LangChain AIMessage → neutral LLMResponse', async () => {
    invokeMock.mockResolvedValue({
      content: 'hello world',
      response_metadata: { stop_reason: 'end_turn' },
      usage_metadata: { input_tokens: 10, output_tokens: 5 },
    });
    const a = new AnthropicAdapter({
      apiKey: 'sk-anthropic',
      model: 'claude-sonnet-4-6',
      defaultMaxTokens: 1024,
    });
    const res = await a.invoke({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.content).toBe('hello world');
    expect(res.finishReason).toBe('stop');
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it('throws LLMError (retriable=true) on ChatAnthropic rejection', async () => {
    invokeMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const a = new AnthropicAdapter({ apiKey: 'x', model: 'claude-sonnet-4-6' });
    let caught: unknown;
    try {
      await a.invoke({ messages: [{ role: 'user', content: 'hi' }] });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(LLMError);
    expect((caught as LLMError).retriable).toBe(true);
    expect((caught as LLMError).cause).toBeInstanceOf(Error);
  });

  it('providerId = "anthropic" and modelId matches ctor option', () => {
    const a = new AnthropicAdapter({ apiKey: 'x', model: 'claude-sonnet-4-6' });
    expect(a.providerId).toBe('anthropic');
    expect(a.modelId).toBe('claude-sonnet-4-6');
  });
});
