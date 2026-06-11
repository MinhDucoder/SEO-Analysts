import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { DirectAnswerIntroRule } from '../../../../src/analyzer/domain/rules/geo/direct-answer-intro.rule';
import { GeminiClientService } from '../../../../src/analyzer/services/gemini-client.service';

const base = { url: 'https://example.com', h1Tags: ['What is SEO?'], textContent: 'SEO stands for Search Engine Optimization. It is the practice of improving site visibility.', language: 'en' } as any;

describe('DirectAnswerIntroRule', () => {
  const fakeLlm = { completeJson: vi.fn() } as unknown as GeminiClientService;
  const rule = new DirectAnswerIntroRule(fakeLlm);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when LLM says direct=true', async () => {
    (fakeLlm.completeJson as any).mockResolvedValue({ direct: true, reason: 'defines SEO' });
    expect((await rule.check(base)).status).toBe(CheckStatus.PASS);
  });

  it('fails when LLM says direct=false', async () => {
    (fakeLlm.completeJson as any).mockResolvedValue({ direct: false, reason: 'too vague' });
    expect((await rule.check(base)).status).toBe(CheckStatus.FAIL);
  });

  it('returns error status when LLM throws', async () => {
    (fakeLlm.completeJson as any).mockRejectedValue(new Error('timeout'));
    const out = await rule.check(base);
    expect(out.status).toBe(CheckStatus.WARN);
    expect(out.metadata).toMatchObject({ error: 'timeout' });
  });

  it('uses Vietnamese prompt when language=vi', async () => {
    (fakeLlm.completeJson as any).mockResolvedValue({ direct: true, reason: 'ok' });
    await rule.check({ ...base, language: 'vi', h1Tags: ['SEO là gì?'] });
    expect((fakeLlm.completeJson as any).mock.calls[0][0]).toMatch(/Đoạn văn|trực tiếp/);
  });
});
