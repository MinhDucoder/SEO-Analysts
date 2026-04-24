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
        rule_version: '1.2.0',
        issues: [
          {
            rule_id: 'title_tag',
            status: 'warn',
            score: 50,
            category: 'meta',
            severity: 'warning',
            audiences: ['writer'],
            message: 'Title short',
            template_suggestion: 'Make it longer',
            evidence: { currentLength: 10 },
            doc_ref: 'https://d/r/title_tag',
          },
        ],
        content_stats: {
          word_count: 1,
          character_count: 2,
          reading_time_sec: 1,
          paragraph_count: 0,
          image_count: 0,
          internal_link_count: 0,
          external_link_count: 0,
        },
      },
    ),
  } as never;
}

const extractor = {
  extract: vi.fn().mockResolvedValue({ html: '<p>hi</p>', fromCache: false }),
} as never;

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
    svc = new PublicCheckService(extractor, makeAnalyzer(), makeRedis(), enricher as never);
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
      rule_version: '1.2.0',
      issues: [
        {
          rule_id: 'a',
          status: 'warn',
          score: 50,
          category: 'meta',
          severity: 'warning',
          audiences: ['writer'],
          message: 'm1',
          template_suggestion: 't1',
          evidence: {},
          doc_ref: '',
        },
        {
          rule_id: 'b',
          status: 'warn',
          score: 50,
          category: 'meta',
          severity: 'warning',
          audiences: ['writer'],
          message: 'm2',
          template_suggestion: 't2',
          evidence: {},
          doc_ref: '',
        },
      ],
      content_stats: {
        word_count: 1,
        character_count: 2,
        reading_time_sec: 1,
        paragraph_count: 0,
        image_count: 0,
        internal_link_count: 0,
        external_link_count: 0,
      },
    });
    svc = new PublicCheckService(extractor, analyzer, makeRedis(), enricher as never);
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
    svc = new PublicCheckService(extractor, makeAnalyzer(), redis, enricher as never);
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
    const mkIssue = (rule_id: string, severity: 'info' | 'warning' | 'error') => ({
      rule_id,
      status: 'warn',
      score: 50,
      category: 'meta',
      severity,
      audiences: ['writer'],
      message: `${rule_id} msg`,
      template_suggestion: '',
      evidence: {},
      doc_ref: '',
    });
    const analyzer = makeAnalyzer({
      rule_version: '1.2.0',
      issues: [mkIssue('a', 'error'), mkIssue('b', 'warning'), mkIssue('c', 'info')],
      content_stats: {
        word_count: 1,
        character_count: 2,
        reading_time_sec: 1,
        paragraph_count: 0,
        image_count: 0,
        internal_link_count: 0,
        external_link_count: 0,
      },
    });
    enricher.enrich.mockResolvedValue({
      suggestions: [null, null, null],
      source: 'none',
      degraded: false,
    });
    const redis = makeRedis();
    svc = new PublicCheckService(extractor, analyzer, redis, enricher as never);

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

  it('cache-hit with no filter returns ALL issues even when first request was filtered', async () => {
    const mkIssue = (rule_id: string, severity: 'info' | 'warning' | 'error') => ({
      rule_id,
      status: 'warn',
      score: 50,
      category: 'meta',
      severity,
      audiences: ['writer'],
      message: 'm',
      template_suggestion: '',
      evidence: {},
      doc_ref: '',
    });
    const analyzer = makeAnalyzer({
      rule_version: '1.2.0',
      issues: [mkIssue('a', 'error'), mkIssue('b', 'info')],
      content_stats: {
        word_count: 1,
        character_count: 2,
        reading_time_sec: 1,
        paragraph_count: 0,
        image_count: 0,
        internal_link_count: 0,
        external_link_count: 0,
      },
    });
    enricher.enrich.mockResolvedValue({
      suggestions: [null, null],
      source: 'none',
      degraded: false,
    });
    const redis = makeRedis();
    svc = new PublicCheckService(extractor, analyzer, redis, enricher as never);

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
