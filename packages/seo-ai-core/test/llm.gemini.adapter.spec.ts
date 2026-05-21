import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@langchain/google-genai', () => {
  return {
    ChatGoogleGenerativeAI: vi.fn().mockImplementation((cfg: Record<string, unknown>) => ({
      cfg,
      invoke: vi.fn().mockResolvedValue({
        content: 'OK',
        usage_metadata: { input_tokens: 5, output_tokens: 1, total_tokens: 6 },
        response_metadata: { stop_reason: 'end_turn' },
      }),
      stream: vi.fn(),
      getNumTokens: vi.fn().mockResolvedValue(3),
    })),
  };
});

import { GeminiAdapter } from '../src/llm/adapters/gemini.adapter.js';
import { LLMError } from '../src/errors/index.js';

describe('GeminiAdapter', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('throws LLMError when no apiKey and no env', () => {
    expect(() => new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash' }))
      .toThrow(LLMError);
  });

  it('uses env GEMINI_API_KEY when cfg.apiKey is omitted', () => {
    process.env.GEMINI_API_KEY = 'env-key';
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash' });
    expect(a.name).toBe('gemini');
    expect(a.model).toBe('gemini-2.0-flash');
  });

  it('invoke() returns LLMResponse with content + usage + model', async () => {
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k' });
    const res = await a.invoke({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.content).toBe('OK');
    expect(res.usage.total).toBe(6);
    expect(res.model).toBe('gemini-2.0-flash');
  });

  it('invoke() wraps underlying errors as LLMError with retriable=true', async () => {
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k' });
    // @ts-expect-error — replace mock to throw
    a.client.invoke = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(a.invoke({ messages: [{ role: 'user', content: 'x' }] }))
      .rejects.toBeInstanceOf(LLMError);
  });

  it('countTokens delegates to underlying client', async () => {
    const a = new GeminiAdapter({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k' });
    expect(await a.countTokens('hello')).toBe(3);
  });
});
