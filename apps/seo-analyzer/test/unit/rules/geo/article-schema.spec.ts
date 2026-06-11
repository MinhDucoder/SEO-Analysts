import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { ArticleSchemaRule } from '../../../../src/analyzer/domain/rules/geo/article-schema.rule';
import { PageData } from '../../../../src/analyzer/domain/page-data.interface';

const base: PageData = { url: 'https://example.com', jsonLdBlocks: [] } as any;

describe('ArticleSchemaRule', () => {
  const rule = new ArticleSchemaRule();

  it('fails when no JSON-LD', () => {
    expect(rule.check(base).status).toBe(CheckStatus.FAIL);
  });

  it('fails when missing 2+ required fields', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'Article', headline: 'X' }] };
    expect(rule.check(pd).status).toBe(CheckStatus.FAIL);
  });

  it('warns when missing exactly 1 required field', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'BlogPosting', headline: 'X', author: 'A', datePublished: '2026-01-01' }] };
    expect(rule.check(pd).status).toBe(CheckStatus.WARN);
  });

  it('passes when all 4 fields present', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'NewsArticle', headline: 'X', author: 'A', datePublished: '2026-01-01', image: 'i.jpg' }] };
    expect(rule.check(pd).status).toBe(CheckStatus.PASS);
  });

  it('ignores FAQPage (deprecated 2026-05-07)', () => {
    const pd = { ...base, jsonLdBlocks: [{ '@type': 'FAQPage', mainEntity: [] }] };
    expect(rule.check(pd).status).toBe(CheckStatus.FAIL);
  });
});
