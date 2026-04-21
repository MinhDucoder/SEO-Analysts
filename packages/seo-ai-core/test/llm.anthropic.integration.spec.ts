import { describe, it, expect } from 'vitest';
import { createLLM } from '../src/index.js';

const apiKey = process.env['ANTHROPIC_API_KEY'];

describe.skipIf(!apiKey)('AnthropicAdapter [integration]', () => {
  it('returns a non-empty completion for a trivial prompt', async () => {
    const llm = createLLM({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      apiKey,
      defaultMaxTokens: 50,
    });
    const res = await llm.invoke({
      messages: [{ role: 'user', content: 'Reply with exactly the word OK.' }],
    });
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.usage.total).toBeGreaterThan(0);
    expect(res.model).toBe('claude-haiku-4-5-20251001');
  }, 30_000);
});
