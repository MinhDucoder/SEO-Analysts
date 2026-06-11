import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { QuotableDensityRule } from '../../../../src/analyzer/domain/rules/geo/quotable-density.rule';
import { PageData } from '../../../../src/analyzer/domain/page-data.interface';

const base: PageData = { url: 'https://example.com', textContent: 'word '.repeat(1000), quotableBlocks: { tables: 0, lists: 0, blockquotes: 0, dls: 0 } } as any;

describe('QuotableDensityRule', () => {
  const rule = new QuotableDensityRule();

  it('fails when density < 1.0 per 1000 words', () => {
    expect(rule.check(base).status).toBe(CheckStatus.FAIL);
  });

  it('warns when density 1-2', () => {
    const pd = { ...base, quotableBlocks: { tables: 1, lists: 1, blockquotes: 0, dls: 0 } };
    expect(rule.check(pd).status).toBe(CheckStatus.WARN);
  });

  it('passes when density >= 3', () => {
    const pd = { ...base, quotableBlocks: { tables: 1, lists: 2, blockquotes: 1, dls: 0 } };
    expect(rule.check(pd).status).toBe(CheckStatus.PASS);
  });
});
