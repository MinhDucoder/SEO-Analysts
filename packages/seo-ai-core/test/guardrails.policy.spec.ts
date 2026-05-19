import { describe, it, expect } from 'vitest';
import { applyPolicy } from '../src/guardrails/policy.js';
import type { LLMRequest } from '../src/llm/types.js';
import type { Policy } from '../src/guardrails/types.js';

const baseReq = (): LLMRequest => ({
  messages: [{ role: 'user', content: 'hello world' }],
  maxTokens: 8000,
});

describe('applyPolicy', () => {
  it('passes through when no policy fields apply', () => {
    const { request, result } = applyPolicy(baseReq(), {});
    expect(request.maxTokens).toBe(8000);
    expect(result.applied).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it('clamps maxTokens DOWN to policy.maxTokens (never up)', () => {
    const { request, result } = applyPolicy(baseReq(), { maxTokens: 1000 });
    expect(request.maxTokens).toBe(1000);
    expect(result.applied).toBe(true);
    expect(result.changes).toContain('maxTokens clamped: 8000 → 1000');
  });

  it('does NOT raise maxTokens when caller asked for less than policy', () => {
    const req: LLMRequest = { ...baseReq(), maxTokens: 500 };
    const { request, result } = applyPolicy(req, { maxTokens: 1000 });
    expect(request.maxTokens).toBe(500);
    expect(result.applied).toBe(false);
  });

  it('truncates messages keeping the LAST N (most-recent context)', () => {
    const req: LLMRequest = {
      messages: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u1' },
        { role: 'assistant', content: 'a1' },
        { role: 'user', content: 'u2' },
        { role: 'assistant', content: 'a2' },
        { role: 'user', content: 'u3' },
      ],
    };
    const { request } = applyPolicy(req, { maxMessages: 3 });
    expect(request.messages.map((m) => m.content)).toEqual(['u2', 'a2', 'u3']);
  });

  it('redacts content matching redactPatterns', () => {
    const policy: Policy = {
      redactPatterns: [
        { source: '\\b\\d{3}-\\d{2}-\\d{4}\\b', flags: 'g' },
        { source: 'sk-[a-zA-Z0-9]+', flags: 'g' },
      ],
    };
    const req: LLMRequest = {
      messages: [
        { role: 'user', content: 'My SSN is 123-45-6789 and my key is sk-abc123XYZ.' },
      ],
    };
    const { request, result } = applyPolicy(req, policy);
    expect(request.messages[0]?.content).toBe('My SSN is [REDACTED] and my key is [REDACTED].');
    expect(result.applied).toBe(true);
    expect(result.changes.some((c) => c.includes('redacted'))).toBe(true);
  });

  it('does not mutate the original request', () => {
    const req = baseReq();
    const original = JSON.parse(JSON.stringify(req));
    applyPolicy(req, { maxTokens: 100 });
    expect(req).toEqual(original);
  });
});
