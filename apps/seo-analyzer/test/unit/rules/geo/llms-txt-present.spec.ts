import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { LlmsTxtPresentRule } from '../../../../src/analyzer/domain/rules/geo/llms-txt-present.rule';
import { PageData } from '../../../../src/analyzer/domain/page-data.interface';

const base: PageData = { url: 'https://example.com' } as any;

describe('LlmsTxtPresentRule', () => {
  const rule = new LlmsTxtPresentRule();

  it('fails when llmsTxt missing or 404', () => {
    expect(rule.check({ ...base, llmsTxt: { url: 'x', status: 404, sectionCount: 0, sizeBytes: 0 } }).status).toBe(CheckStatus.FAIL);
    expect(rule.check(base).status).toBe(CheckStatus.FAIL);
  });

  it('fails when present but no H1', () => {
    expect(rule.check({ ...base, llmsTxt: { url: 'x', status: 200, sectionCount: 0, sizeBytes: 50 } }).status).toBe(CheckStatus.FAIL);
  });

  it('warns when has H1 but no blockquote', () => {
    expect(rule.check({ ...base, llmsTxt: { url: 'x', status: 200, h1: 'Site', sectionCount: 0, sizeBytes: 50 } }).status).toBe(CheckStatus.WARN);
  });

  it('warns when oversized (>1MB) even with H1+summary', () => {
    expect(rule.check({ ...base, llmsTxt: { url: 'x', status: 200, h1: 'Site', summary: 'A site', sectionCount: 2, sizeBytes: 2_000_000 } }).status).toBe(CheckStatus.WARN);
  });

  it('passes when H1 + blockquote + reasonable size', () => {
    expect(rule.check({ ...base, llmsTxt: { url: 'x', status: 200, h1: 'Site', summary: 'A site', sectionCount: 2, sizeBytes: 500 } }).status).toBe(CheckStatus.PASS);
  });
});
