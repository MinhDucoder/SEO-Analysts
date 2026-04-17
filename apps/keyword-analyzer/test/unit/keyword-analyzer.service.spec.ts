import { describe, expect, it, beforeEach } from 'vitest';
import { KeywordAnalyzerService } from '../../src/keyword/services/keyword-analyzer.service';

describe('KeywordAnalyzerService', () => {
  let service: KeywordAnalyzerService;

  beforeEach(() => {
    service = new KeywordAnalyzerService();
  });

  it('analyzes an English document end-to-end', async () => {
    const result = await service.analyze({
      auditId: 'audit-1',
      url: 'https://example.com',
      title: 'Best SEO Audit Tools for 2026',
      h1Text: 'Top SEO Audit Tools',
      metaDescription: 'Compare the best SEO audit tools of 2026.',
      textContent:
        'SEO audit tools help websites rank better. A good SEO audit identifies issues with meta tags, ' +
        'headings, and content. This seo audit guide covers the essential tools for 2026. ' +
        'Running an seo audit regularly is key to ranking success. Audit tools analyze hundreds of signals.',
      targetKeyword: 'seo audit',
      language: 'en',
    });

    expect(result.auditId).toBe('audit-1');
    expect(result.totalWords).toBeGreaterThan(0);
    expect(result.uniqueWords).toBeGreaterThan(0);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.keywords.length).toBeLessThanOrEqual(20);

    // keywords must be rank-ordered starting at 1
    expect(result.keywords[0]?.rank).toBe(1);
    for (let i = 1; i < result.keywords.length; i++) {
      expect(result.keywords[i]?.frequency).toBeLessThanOrEqual(result.keywords[i - 1]?.frequency ?? 0);
    }

    // 'audit' should be a top keyword
    const auditKw = result.keywords.find((k) => k.keyword === 'audit');
    expect(auditKw).toBeDefined();
    expect(auditKw!.inTitle).toBe(true);
    expect(auditKw!.inH1).toBe(true);
  });

  it('auto-detects Vietnamese when language not provided', async () => {
    const result = await service.analyze({
      auditId: 'audit-2',
      url: 'https://example.vn',
      textContent:
        'Công nghệ phần mềm là một ngành rất phát triển. ' +
        'Học công nghệ phần mềm giúp bạn có nhiều cơ hội. ' +
        'Công nghệ phần mềm đang thay đổi thế giới.',
      title: 'Công nghệ phần mềm',
      h1Text: 'Học công nghệ phần mềm',
    });

    expect(result.keywords.length).toBeGreaterThan(0);
    const kw = result.keywords.find((k) => k.keyword === 'công');
    expect(kw).toBeDefined();
    expect(kw!.inTitle).toBe(true);
  });

  it('returns targetAnalysis with correct verdict', async () => {
    const body = Array.from({ length: 100 }, () => 'filler').join(' ') + ' pizza pizza pizza';
    const result = await service.analyze({
      auditId: 'audit-3',
      url: 'https://example.com',
      textContent: body,
      title: 'Best Pizza',
      targetKeyword: 'pizza',
      language: 'en',
    });

    expect(result.targetAnalysis).toBeDefined();
    expect(result.targetAnalysis!.keyword).toBe('pizza');
    expect(result.targetAnalysis!.frequency).toBe(3);
    expect(result.targetAnalysis!.inTitle).toBe(true);
    expect(['low', 'optimal', 'high', 'stuffing']).toContain(result.targetAnalysis!.verdict);
  });

  it('omits targetAnalysis when targetKeyword not provided', async () => {
    const result = await service.analyze({
      auditId: 'audit-4',
      url: 'https://example.com',
      textContent: 'some content about nothing in particular',
      language: 'en',
    });
    expect(result.targetAnalysis).toBeUndefined();
  });

  it('flags high-repetition target keyword as stuffing', async () => {
    const result = await service.analyze({
      auditId: 'audit-5',
      url: 'https://example.com',
      textContent: 'spam '.repeat(20) + 'other words here to make up total',
      targetKeyword: 'spam',
      language: 'en',
    });
    expect(result.targetAnalysis!.isStuffing).toBe(true);
    expect(result.targetAnalysis!.verdict).toBe('stuffing');
  });
});
