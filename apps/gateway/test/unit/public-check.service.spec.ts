import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicCheckService } from '../../src/public-api/services/public-check.service';

function makeRedis() {
  const store = new Map<string, string>();
  return {
    client: {
      get: vi.fn().mockImplementation((k: string) => Promise.resolve(store.get(k) ?? null)),
      setex: vi.fn().mockImplementation((k: string, _ttl: number, v: string) => {
        store.set(k, v);
        return Promise.resolve('OK');
      }),
    },
  } as never;
}

function makeAnalyzer(override?: unknown) {
  return {
    analyzeContent: vi.fn().mockResolvedValue(
      override ?? {
        ruleVersion: '1.2.0',
        issues: [
          {
            ruleId: 'title_tag',
            status: 'warn',
            score: 50,
            category: 'meta',
            severity: 'warning',
            audiences: ['writer'],
            message: 'Title short',
            templateSuggestion: 'Make it longer',
            evidence: { currentLength: 10 },
            docRef: 'https://d/r/title_tag',
          },
        ],
        contentStats: {
          wordCount: 1,
          characterCount: 2,
          readingTimeSec: 1,
          paragraphCount: 0,
          imageCount: 0,
          internalLinkCount: 0,
          externalLinkCount: 0,
        },
      },
    ),
  } as never;
}

const extractor = {
  extract: vi.fn().mockResolvedValue({ html: '<p>hi</p>', fromCache: false }),
} as never;

// AI-entitlement gate deps (LLM path only): default to "allowed + quota left".
function makeEntitlement() {
  return {
    hasFeature: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
    getEffectivePlan: vi.fn().mockResolvedValue('pro'),
    isAdmin: vi.fn().mockResolvedValue(false),
  } as never;
}
function makeCounter() {
  return {
    consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 99 }),
  } as never;
}

const ctx = { apiKeyId: 'k1', userId: 'u1', ip: '1.2.3.4' };
const baseReq = {
  input: { type: 'html' as const, html: '<p>hi</p>' },
  targetKeyword: 'seo',
  options: { language: 'vi' as const },
};

describe('PublicCheckService (with enricher)', () => {
  let enricher: { enrich: ReturnType<typeof vi.fn> };
  let svc: PublicCheckService;

  beforeEach(() => {
    enricher = { enrich: vi.fn() };
    svc = new PublicCheckService(extractor, makeAnalyzer(), makeRedis(), enricher as never, makeEntitlement(), makeCounter());
  });

  it('enrichMode=off: enricher called with "off", suggestionSource="none"', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [null],
      source: 'none',
      degraded: false,
    });
    const r = await svc.execute(
      { ...baseReq, options: { ...baseReq.options, enrichMode: 'off' } },
      ctx,
    );
    expect(enricher.enrich).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      'off',
    );
    expect(r.meta.suggestionSource).toBe('none');
    expect(r.meta.degraded).toBe(false);
    expect(r.issues[0].suggestion).toBeNull();
  });

  it('enrichMode=template: suggestionSource="template", not degraded', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [{ type: 'rewrite', text: 'Make it longer', rationale: '' }],
      source: 'template',
      degraded: false,
    });
    const r = await svc.execute(
      { ...baseReq, options: { ...baseReq.options, enrichMode: 'template' } },
      ctx,
    );
    expect(r.meta.suggestionSource).toBe('template');
    expect(r.meta.degraded).toBe(false);
    expect(r.issues[0].suggestion).toEqual({
      type: 'rewrite',
      text: 'Make it longer',
      rationale: '',
    });
  });

  it('enrichMode=llm happy path: suggestionSource="llm", degraded=false', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [{ type: 'rewrite', text: 'LLM rewrite', rationale: 'because' }],
      source: 'llm',
      degraded: false,
    });
    const r = await svc.execute(
      { ...baseReq, options: { ...baseReq.options, enrichMode: 'llm' } },
      ctx,
    );
    expect(r.meta.suggestionSource).toBe('llm');
    expect(r.meta.degraded).toBe(false);
    expect(r.issues[0].suggestion).toEqual({
      type: 'rewrite',
      text: 'LLM rewrite',
      rationale: 'because',
    });
  });

  it('enrichMode=llm degraded: meta.degraded=true, source="template"', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [{ type: 'rewrite', text: 'Make it longer', rationale: '' }],
      source: 'template',
      degraded: true,
    });
    const r = await svc.execute(
      { ...baseReq, options: { ...baseReq.options, enrichMode: 'llm' } },
      ctx,
    );
    expect(r.meta.suggestionSource).toBe('template');
    expect(r.meta.degraded).toBe(true);
  });

  it('enrichMode=llm mixed: source="mixed", not degraded', async () => {
    const analyzer = makeAnalyzer({
      ruleVersion: '1.2.0',
      issues: [
        {
          ruleId: 'a',
          status: 'warn',
          score: 50,
          category: 'meta',
          severity: 'warning',
          audiences: ['writer'],
          message: 'm1',
          templateSuggestion: 't1',
          evidence: {},
          docRef: '',
        },
        {
          ruleId: 'b',
          status: 'warn',
          score: 50,
          category: 'meta',
          severity: 'warning',
          audiences: ['writer'],
          message: 'm2',
          templateSuggestion: 't2',
          evidence: {},
          docRef: '',
        },
      ],
      contentStats: {
        wordCount: 1,
        characterCount: 2,
        readingTimeSec: 1,
        paragraphCount: 0,
        imageCount: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
      },
    });
    svc = new PublicCheckService(extractor, analyzer, makeRedis(), enricher as never, makeEntitlement(), makeCounter());
    enricher.enrich.mockResolvedValue({
      suggestions: [
        { type: 'rewrite', text: 'LLM A', rationale: 'r' },
        { type: 'rewrite', text: 't2', rationale: '' },
      ],
      source: 'mixed',
      degraded: false,
    });
    const r = await svc.execute(
      { ...baseReq, options: { ...baseReq.options, enrichMode: 'llm' } },
      ctx,
    );
    expect(r.meta.suggestionSource).toBe('mixed');
    expect(r.meta.degraded).toBe(false);
  });

  it('cache-hit: second identical call returns cached response without invoking enricher twice', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [{ type: 'rewrite', text: 't', rationale: '' }],
      source: 'template',
      degraded: false,
    });
    const redis = makeRedis();
    svc = new PublicCheckService(extractor, makeAnalyzer(), redis, enricher as never, makeEntitlement(), makeCounter());
    const req = {
      ...baseReq,
      options: { ...baseReq.options, enrichMode: 'template' as const },
    };
    const r1 = await svc.execute(req, ctx);
    expect(r1.meta.cached).toBe(false);
    const r2 = await svc.execute(req, ctx);
    expect(r2.meta.cached).toBe(true);
    expect(enricher.enrich).toHaveBeenCalledTimes(1);
  });

  it('cache-hit re-applies the CURRENT filter, not the one cached from the previous request', async () => {
    const mkIssue = (ruleId: string, severity: 'info' | 'warning' | 'error') => ({
      ruleId,
      status: 'warn',
      score: 50,
      category: 'meta',
      severity,
      audiences: ['writer'],
      message: `${ruleId} msg`,
      templateSuggestion: '',
      evidence: {},
      docRef: '',
    });
    const analyzer = makeAnalyzer({
      ruleVersion: '1.2.0',
      issues: [mkIssue('a', 'error'), mkIssue('b', 'warning'), mkIssue('c', 'info')],
      contentStats: {
        wordCount: 1,
        characterCount: 2,
        readingTimeSec: 1,
        paragraphCount: 0,
        imageCount: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
      },
    });
    enricher.enrich.mockResolvedValue({
      suggestions: [null, null, null],
      source: 'none',
      degraded: false,
    });
    const redis = makeRedis();
    svc = new PublicCheckService(extractor, analyzer, redis, enricher as never, makeEntitlement(), makeCounter());

    const r1 = await svc.execute(
      {
        ...baseReq,
        options: {
          ...baseReq.options,
          enrichMode: 'off',
          filter: { minSeverity: 'error' },
        },
      },
      ctx,
    );
    expect(r1.meta.cached).toBe(false);
    expect(r1.issues).toHaveLength(1);
    expect(r1.issues[0]!.ruleId).toBe('a');

    const r2 = await svc.execute(
      {
        ...baseReq,
        options: {
          ...baseReq.options,
          enrichMode: 'off',
          filter: { minSeverity: 'info' },
        },
      },
      ctx,
    );
    expect(r2.meta.cached).toBe(true);
    expect(r2.issues).toHaveLength(3);
    expect(r2.issues.map((i) => i.ruleId)).toEqual(['a', 'b', 'c']);
  });

  it('cache key uses PUBLIC_API_CACHE_SCHEMA_VERSION env var so ops can flush cache without redeploy', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [{ type: 'rewrite', text: 't', rationale: '' }],
      source: 'template',
      degraded: false,
    });
    const redis1 = makeRedis();
    const svc1 = new PublicCheckService(extractor, makeAnalyzer(), redis1, enricher as never, makeEntitlement(), makeCounter());
    const req = {
      ...baseReq,
      options: { ...baseReq.options, enrichMode: 'template' as const },
    };
    await svc1.execute(req, ctx);
    const key1 = (redis1.client.setex as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    process.env.PUBLIC_API_CACHE_SCHEMA_VERSION = '99.99.99';
    try {
      const redis2 = makeRedis();
      const svc2 = new PublicCheckService(extractor, makeAnalyzer(), redis2, enricher as never, makeEntitlement(), makeCounter());
      await svc2.execute(req, ctx);
      const key2 = (redis2.client.setex as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(key2).not.toBe(key1);
    } finally {
      delete process.env.PUBLIC_API_CACHE_SCHEMA_VERSION;
    }
  });

  it('issue list excludes PASS-status rules but score still averages them in', async () => {
    // Regression: extension popup used to render "Title length 53 is
    // optimal" labelled WARNING because PASS rules were emitted as
    // issues with their rule's intrinsic metadata severity.
    const mkRule = (
      ruleId: string,
      status: 'pass' | 'warn' | 'fail',
      score: number,
      message: string,
    ) => ({
      ruleId,
      status,
      score,
      category: 'meta',
      severity: 'warning',
      audiences: ['writer'],
      message,
      templateSuggestion: '',
      evidence: {},
      docRef: '',
    });
    const analyzer = makeAnalyzer({
      ruleVersion: '1.2.0',
      issues: [
        mkRule('title_tag', 'pass', 100, 'Title length 53 is optimal (50-60 chars)'),
        mkRule('meta_description', 'warn', 50, 'Meta description too short'),
      ],
      contentStats: {
        wordCount: 1,
        characterCount: 2,
        readingTimeSec: 1,
        paragraphCount: 0,
        imageCount: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
      },
    });
    enricher.enrich.mockResolvedValue({
      suggestions: [null],
      source: 'none',
      degraded: false,
    });
    svc = new PublicCheckService(extractor, analyzer, makeRedis(), enricher as never, makeEntitlement(), makeCounter());

    const r = await svc.execute(
      { ...baseReq, options: { ...baseReq.options, enrichMode: 'off' } },
      ctx,
    );

    expect(r.issues).toHaveLength(1);
    expect(r.issues[0]!.ruleId).toBe('meta_description');
    expect(r.issues[0]!.title).toBe('Meta description');
    // description is now localized to Vietnamese when language='vi' (baseReq default)
    expect(r.issues[0]!.description).toMatch(/Độ dài meta description|Thiếu meta description/);
    expect(r.score).toBe(75);
    expect(enricher.enrich).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'meta_description' })]),
      expect.any(Object),
      'off',
    );
    const enrichArg = enricher.enrich.mock.calls[0]![0];
    expect(enrichArg).toHaveLength(1);
  });

  it('localizes issue description to Vietnamese when language=vi', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [null],
      source: 'none',
      degraded: false,
    });
    // build the service exactly like the other tests in this file
    const res = await svc.execute(
      {
        input: { type: 'html', html: '<p>hi</p>' },
        targetKeyword: 'seo',
        options: { language: 'vi', enrichMode: 'off' },
      } as never,
      { apiKeyId: 'k1', userId: '', ip: '127.0.0.1' } as never,
    );
    const issue = res.issues.find((i) => i.ruleId === 'title_tag');
    expect(issue?.description).toMatch(/Độ dài title|Thiếu/); // Vietnamese
    expect(issue?.description).not.toBe('Title short'); // not the raw English message
  });

  it('keeps English description when language=en', async () => {
    enricher.enrich.mockResolvedValue({
      suggestions: [null],
      source: 'none',
      degraded: false,
    });
    const res = await svc.execute(
      {
        input: { type: 'html', html: '<p>hi</p>' },
        targetKeyword: 'seo',
        options: { language: 'en', enrichMode: 'off' },
      } as never,
      { apiKeyId: 'k1', userId: '', ip: '127.0.0.1' } as never,
    );
    const issue = res.issues.find((i) => i.ruleId === 'title_tag');
    expect(issue?.description).toBe('Title short'); // unchanged English message
  });

  it('cache-hit with no filter returns ALL issues even when first request was filtered', async () => {
    const mkIssue = (ruleId: string, severity: 'info' | 'warning' | 'error') => ({
      ruleId,
      status: 'warn',
      score: 50,
      category: 'meta',
      severity,
      audiences: ['writer'],
      message: 'm',
      templateSuggestion: '',
      evidence: {},
      docRef: '',
    });
    const analyzer = makeAnalyzer({
      ruleVersion: '1.2.0',
      issues: [mkIssue('a', 'error'), mkIssue('b', 'info')],
      contentStats: {
        wordCount: 1,
        characterCount: 2,
        readingTimeSec: 1,
        paragraphCount: 0,
        imageCount: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
      },
    });
    enricher.enrich.mockResolvedValue({
      suggestions: [null, null],
      source: 'none',
      degraded: false,
    });
    const redis = makeRedis();
    svc = new PublicCheckService(extractor, analyzer, redis, enricher as never, makeEntitlement(), makeCounter());

    await svc.execute(
      {
        ...baseReq,
        options: {
          ...baseReq.options,
          enrichMode: 'off',
          filter: { minSeverity: 'error' },
        },
      },
      ctx,
    );
    const r2 = await svc.execute(
      { ...baseReq, options: { ...baseReq.options, enrichMode: 'off' } },
      ctx,
    );
    expect(r2.meta.cached).toBe(true);
    expect(r2.issues).toHaveLength(2);
  });
});
