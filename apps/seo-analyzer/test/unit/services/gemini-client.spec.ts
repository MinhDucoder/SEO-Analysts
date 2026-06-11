import { describe, expect, it, vi } from 'vitest';
import { GeminiClientService } from '../../../src/analyzer/services/gemini-client.service';

describe('GeminiClientService', () => {
  it('throws when API key absent', () => {
    expect(() => new GeminiClientService(undefined)).toThrow(/api key/i);
  });

  it('completeJson returns parsed JSON from response text', async () => {
    const svc = new GeminiClientService('test-key');
    (svc as any).model = { generateContent: vi.fn().mockResolvedValue({ response: { text: () => '{"direct": true, "reason": "ok"}' } }) };
    const out = await svc.completeJson('prompt');
    expect(out).toEqual({ direct: true, reason: 'ok' });
  });

  it('completeJson strips markdown code fences', async () => {
    const svc = new GeminiClientService('test-key');
    (svc as any).model = { generateContent: vi.fn().mockResolvedValue({ response: { text: () => '```json\n{"a":1}\n```' } }) };
    expect(await svc.completeJson('p')).toEqual({ a: 1 });
  });

  it('completeJson throws on invalid JSON', async () => {
    const svc = new GeminiClientService('test-key');
    (svc as any).model = { generateContent: vi.fn().mockResolvedValue({ response: { text: () => 'not json' } }) };
    await expect(svc.completeJson('p')).rejects.toThrow();
  });

  it('completeJson respects timeout', async () => {
    const svc = new GeminiClientService('test-key', { timeoutMs: 10 });
    (svc as any).model = { generateContent: () => new Promise((r) => setTimeout(() => r({ response: { text: () => '{}' } }), 100)) };
    await expect(svc.completeJson('p')).rejects.toThrow(/timeout/i);
  });
});
