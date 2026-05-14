import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SuggestionEnricherService,
  type EnrichContext,
  type AnalyzerIssue,
} from '../../src/public-api/services/suggestion-enricher.service';

function makeRedis(store = new Map<string, string>()) {
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

function makeRateLimit(acquireResult = true) {
  return {
    acquireConcurrency: vi.fn().mockResolvedValue(acquireResult),
    releaseConcurrency: vi.fn().mockResolvedValue(undefined),
  } as never;
}

function issue(ruleId: string, extras?: Partial<AnalyzerIssue>): AnalyzerIssue {
  return {
    ruleId: ruleId,
    status: 'warn',
    score: 50,
    category: 'meta',
    severity: 'warning',
    audiences: ['writer'],
    message: `issue ${ruleId}`,
    templateSuggestion: `tpl for ${ruleId}`,
    evidence: {},
    docRef: '',
    ...extras,
  };
}

const ctx: EnrichContext = {
  apiKeyId: 'k1',
  targetKeyword: 'seo 2026',
  language: 'vi',
  contentExcerpt: 'exc',
  ruleVersion: '1.2.0',
  contentHash: 'abc123',
};

describe('SuggestionEnricherService', () => {
  let factory: { getOrNull: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    factory = { getOrNull: vi.fn() };
  });

  it('mode=off returns null suggestions for every issue', async () => {
    const svc = new SuggestionEnricherService(
      factory as never,
      makeRedis(),
      makeRateLimit(),
    );
    const out = await svc.enrich([issue('a'), issue('b')], ctx, 'off');
    expect(out.suggestions).toHaveLength(2);
    expect(out.suggestions.every((s) => s === null)).toBe(true);
    expect(out.source).toBe('none');
    expect(out.degraded).toBe(false);
  });

  it('mode=template renders per-issue rewrite from templateSuggestion', async () => {
    const svc = new SuggestionEnricherService(
      factory as never,
      makeRedis(),
      makeRateLimit(),
    );
    const out = await svc.enrich([issue('a'), issue('b')], ctx, 'template');
    expect(out.source).toBe('template');
    expect(out.degraded).toBe(false);
    expect(out.suggestions[0]).toEqual({ type: 'rewrite', text: 'tpl for a', rationale: '' });
    expect(out.suggestions[1]).toEqual({ type: 'rewrite', text: 'tpl for b', rationale: '' });
  });

  it('mode=llm: factory returns null → degrade to template, degraded=true', async () => {
    factory.getOrNull.mockResolvedValue(null);
    const svc = new SuggestionEnricherService(
      factory as never,
      makeRedis(),
      makeRateLimit(),
    );
    const out = await svc.enrich([issue('a')], ctx, 'llm');
    expect(out.source).toBe('template');
    expect(out.degraded).toBe(true);
    expect(out.suggestions[0]).toMatchObject({ type: 'rewrite', text: 'tpl for a' });
  });

  it('mode=llm: concurrency bucket full → degrade to template, degraded=true', async () => {
    factory.getOrNull.mockResolvedValue({ run: vi.fn() });
    const rl = makeRateLimit(false);
    const svc = new SuggestionEnricherService(factory as never, makeRedis(), rl);
    const out = await svc.enrich([issue('a')], ctx, 'llm');
    expect(out.source).toBe('template');
    expect(out.degraded).toBe(true);
    expect(rl.acquireConcurrency).toHaveBeenCalledWith('k1');
  });

  it('mode=llm happy path: chain runs, suggestions come from LLM, source=llm', async () => {
    const chainRun = vi.fn().mockResolvedValue([
      { ruleId: 'a', type: 'rewrite', text: 'LLM rewrite A', rationale: 'A reason' },
    ]);
    factory.getOrNull.mockResolvedValue({ run: chainRun });
    const rl = makeRateLimit(true);
    const svc = new SuggestionEnricherService(factory as never, makeRedis(), rl);
    const out = await svc.enrich([issue('a')], ctx, 'llm');
    expect(out.source).toBe('llm');
    expect(out.degraded).toBe(false);
    expect(out.suggestions[0]).toEqual({
      type: 'rewrite',
      text: 'LLM rewrite A',
      rationale: 'A reason',
    });
    expect(chainRun).toHaveBeenCalledOnce();
    expect(rl.releaseConcurrency).toHaveBeenCalledWith('k1');
  });

  it('mode=llm: chain throws → degrade to template, release concurrency', async () => {
    const chainRun = vi.fn().mockRejectedValue(new Error('boom'));
    factory.getOrNull.mockResolvedValue({ run: chainRun });
    const rl = makeRateLimit(true);
    const svc = new SuggestionEnricherService(factory as never, makeRedis(), rl);
    const out = await svc.enrich([issue('a')], ctx, 'llm');
    expect(out.source).toBe('template');
    expect(out.degraded).toBe(true);
    expect(rl.releaseConcurrency).toHaveBeenCalledWith('k1');
  });

  it('mode=llm: order-preservation — output re-aligned by input index, missing filled by template', async () => {
    const chainRun = vi.fn().mockResolvedValue([
      { ruleId: 'a', type: 'rewrite', text: 'LLM A', rationale: 'r' },
    ]);
    factory.getOrNull.mockResolvedValue({ run: chainRun });
    const svc = new SuggestionEnricherService(
      factory as never,
      makeRedis(),
      makeRateLimit(),
    );
    const out = await svc.enrich([issue('a'), issue('b')], ctx, 'llm');
    expect(out.source).toBe('mixed');
    expect(out.degraded).toBe(false);
    expect(out.suggestions[0]).toEqual({ type: 'rewrite', text: 'LLM A', rationale: 'r' });
    expect(out.suggestions[1]).toEqual({ type: 'rewrite', text: 'tpl for b', rationale: '' });
  });

  it('mode=llm: cache hit short-circuits LLM call', async () => {
    const store = new Map<string, string>();
    const redis = makeRedis(store);
    const chainRun = vi.fn().mockResolvedValue([
      { ruleId: 'a', type: 'rewrite', text: 'LLM A', rationale: 'r' },
    ]);
    factory.getOrNull.mockResolvedValue({ run: chainRun });
    const svc = new SuggestionEnricherService(factory as never, redis, makeRateLimit());
    await svc.enrich([issue('a')], ctx, 'llm');
    expect(chainRun).toHaveBeenCalledTimes(1);
    await svc.enrich([issue('a')], ctx, 'llm');
    expect(chainRun).toHaveBeenCalledTimes(1);
  });
});
