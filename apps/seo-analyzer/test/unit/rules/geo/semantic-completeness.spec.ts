import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { SemanticCompletenessRule } from '../../../../src/analyzer/domain/rules/geo/semantic-completeness.rule';
import { GeminiClientService } from '../../../../src/analyzer/services/gemini-client.service';

const base = { url: 'https://example.com', h2Tags: ['Intro', 'Setup', 'Conclusion'], sections: [
  { heading: 'Intro', text: 'word '.repeat(150) },
  { heading: 'Setup', text: 'word '.repeat(150) },
  { heading: 'Conclusion', text: 'word '.repeat(150) },
], language: 'en' } as any;

describe('SemanticCompletenessRule', () => {
  const fakeLlm = { completeJson: vi.fn() } as unknown as GeminiClientService;
  const rule = new SemanticCompletenessRule(fakeLlm);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when >=80% complete and avg >=134 words', async () => {
    (fakeLlm.completeJson as any).mockResolvedValue({ complete: true, wordCount: 150 });
    expect((await rule.check(base)).status).toBe(CheckStatus.PASS);
  });

  it('warns when 50-80% complete', async () => {
    let call = 0;
    (fakeLlm.completeJson as any).mockImplementation(() => Promise.resolve({ complete: call++ < 2, wordCount: 150 }));
    expect((await rule.check(base)).status).toBe(CheckStatus.WARN);
  });

  it('fails when <50% complete', async () => {
    (fakeLlm.completeJson as any).mockResolvedValue({ complete: false, wordCount: 80 });
    expect((await rule.check(base)).status).toBe(CheckStatus.FAIL);
  });

  it('caps at 5 chunks', async () => {
    const pd = { ...base, sections: Array.from({ length: 10 }, (_, i) => ({ heading: `H${i}`, text: 'word '.repeat(150) })) };
    (fakeLlm.completeJson as any).mockResolvedValue({ complete: true, wordCount: 150 });
    await rule.check(pd);
    expect((fakeLlm.completeJson as any).mock.calls.length).toBeLessThanOrEqual(5);
  });

  it('returns warn when no sections', async () => {
    expect((await rule.check({ ...base, sections: [] })).status).toBe(CheckStatus.WARN);
  });
});
