import { describe, it, expect } from 'vitest';
import { createLLM } from '../src/index.js';

const apiKey = process.env['GEMINI_API_KEY'];

describe.skipIf(!apiKey)('GeminiAdapter [integration]', () => {
  it('returns a non-empty completion for a trivial prompt', async () => {
    const llm = createLLM({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey,
      defaultMaxTokens: 50,
    });
    const res = await llm.invoke({
      messages: [{ role: 'user', content: 'Reply with exactly the word OK.' }],
    });
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.usage.total).toBeGreaterThan(0);
    expect(res.model).toBe('gemini-2.0-flash');
  }, 30_000);
});
