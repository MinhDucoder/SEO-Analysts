import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiSuggestService } from '../../src/report/ai-suggest/services/ai-suggest.service';

type AnyMock = ReturnType<typeof vi.fn>;

function makeDeps(overrides: Record<string, unknown> = {}) {
  const prisma = {
    report: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const promptLoader = {
    render: vi.fn().mockResolvedValue({
      messages: [{ role: 'user', content: 'rendered' }],
      hash: 'abcd1234abcd1234',
    }),
  };
  const llm = {
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        suggestions: [
          { ruleId: 'title-tag', explanation: 'Title is too long (>60 chars).', actionable_fix: 'Shorten title to <=60 chars and include primary keyword.' },
        ],
      }),
      usage: { prompt: 100, completion: 30, total: 130 },
      model: 'claude-haiku-4-5',
      finishReason: 'stop',
    }),
  };
  return {
    prisma: { ...prisma, ...((overrides as { prisma?: object }).prisma ?? {}) },
    promptLoader: { ...promptLoader, ...((overrides as { promptLoader?: object }).promptLoader ?? {}) },
    llm: { ...llm, ...((overrides as { llm?: object }).llm ?? {}) },
  };
}

function buildService(deps: ReturnType<typeof makeDeps>) {
  // @ts-expect-error — DI shape constructed manually for unit test
  return new AiSuggestService(deps.prisma, deps.promptLoader, deps.llm);
}

// status values are lowercase CheckStatus ('fail'|'warn'|'pass'); each rule has a real ruleId.
const fakeReport = {
  id: 'r-1',
  auditId: 'a-1',
  url: 'https://example.com',
  analysisSnapshot: {
    ruleResults: [
      { ruleId: 'title-tag', ruleName: 'Title Tag', category: 'meta', status: 'fail', weight: 9, message: 'too long', suggestion: null },
      { ruleId: 'h1-tag', ruleName: 'H1 Tag', category: 'headings', status: 'warn', weight: 7, message: 'multiple h1', suggestion: null },
      { ruleId: 'image-alt', ruleName: 'Image Alt', category: 'images', status: 'pass', weight: 6, message: '', suggestion: null },
    ],
  },
};

describe('AiSuggestService.generate', () => {
  beforeEach(() => {
    process.env.SEO_AI_ENABLED = 'true';
  });

  it('returns [] and persists disabled marker when SEO_AI_ENABLED=false', async () => {
    process.env.SEO_AI_ENABLED = 'false';
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(fakeReport) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toEqual([]);
    expect(deps.llm.invoke).not.toHaveBeenCalled();
  });

  it('throws when report not found', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(null) as AnyMock;
    const svc = buildService(deps);
    await expect(svc.generate('missing')).rejects.toThrow(/report not found/);
  });

  it('returns empty suggestions and skips LLM when no FAIL/WARN rules', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue({
      ...fakeReport,
      analysisSnapshot: { ruleResults: [{ ruleId: 'x', ruleName: 'X', status: 'pass', weight: 5, category: 'meta', message: '', suggestion: null }] },
    }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toEqual([]);
    expect(deps.llm.invoke).not.toHaveBeenCalled();
    expect(deps.prisma.report.update).toHaveBeenCalledOnce();
  });

  it('happy path: filters failing rules, calls LLM, parses, persists', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(fakeReport) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toHaveLength(1);
    expect(out[0].ruleId).toBe('title-tag');
    expect(deps.promptLoader.render).toHaveBeenCalledOnce();
    expect(deps.llm.invoke).toHaveBeenCalledOnce();
    expect(deps.prisma.report.update).toHaveBeenCalledOnce();
  });

  it('caps failing rules at 20 and sorts by weight desc', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      ruleId: `r${i}`, ruleName: `Rule ${i}`, category: 'meta', status: 'fail', weight: 30 - i, message: 'm', suggestion: null,
    }));
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue({
      ...fakeReport,
      analysisSnapshot: { ruleResults: many },
    }) as AnyMock;
    const svc = buildService(deps);
    await svc.generate('a-1');
    const passed = (deps.promptLoader.render as AnyMock).mock.calls[0][1];
    const parsed = JSON.parse(passed.failingRulesJson);
    expect(parsed).toHaveLength(20);
    expect(parsed[0].weight).toBe(30);
    expect(parsed[0].ruleId).toBe('r0');
  });

  it('persists parse_failed marker when LLM returns invalid JSON', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(fakeReport) as AnyMock;
    deps.llm.invoke = vi.fn().mockResolvedValue({
      content: 'not json at all',
      usage: { prompt: 1, completion: 1, total: 2 },
      model: 'claude-haiku-4-5',
      finishReason: 'stop',
    }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generate('a-1');
    expect(out).toEqual([]);
    const updateArgs = (deps.prisma.report.update as AnyMock).mock.calls[0][0];
    expect(updateArgs.data.aiSuggestions.error).toBe('parse_failed');
  });
});

describe('AiSuggestService.generateOnce', () => {
  beforeEach(() => {
    process.env.SEO_AI_ENABLED = 'true';
  });

  it('returns already + skips LLM when prior success exists', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue({
      ...fakeReport,
      aiSuggestions: {
        items: [{ ruleId: 'title-tag', explanation: 'x'.repeat(12), actionable_fix: 'y'.repeat(12) }],
        generatedAt: '2026-01-01T00:00:00.000Z',
        model: 'm',
        promptHash: 'h',
      },
    }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('already');
    expect(out.suggestions).toHaveLength(1);
    expect(deps.llm.invoke).not.toHaveBeenCalled();
  });

  it('returns generated when LLM produced items', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi
      .fn()
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce({
        ...fakeReport,
        aiSuggestions: {
          items: [{ ruleId: 'title-tag', explanation: 'x'.repeat(12), actionable_fix: 'y'.repeat(12) }],
          generatedAt: '2026-01-02T00:00:00.000Z',
          model: 'm',
          promptHash: 'h',
        },
      }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('generated');
    expect(out.suggestions).toHaveLength(1);
  });

  it('returns empty when no failing rules', async () => {
    const noFail = {
      ...fakeReport,
      analysisSnapshot: {
        ruleResults: [
          { ruleId: 'x', ruleName: 'X', status: 'pass', weight: 5, category: 'meta', message: '', suggestion: null },
        ],
      },
    };
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi
      .fn()
      .mockResolvedValueOnce(noFail)
      .mockResolvedValueOnce(noFail)
      .mockResolvedValueOnce({
        ...noFail,
        aiSuggestions: { items: [], generatedAt: '2026-01-02T00:00:00.000Z', model: 'm', promptHash: '' },
      }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('empty');
    expect(deps.llm.invoke).not.toHaveBeenCalled();
  });

  it('returns disabled when SEO_AI_ENABLED=false', async () => {
    process.env.SEO_AI_ENABLED = 'false';
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi
      .fn()
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce({
        ...fakeReport,
        aiSuggestions: {
          items: [],
          generatedAt: '2026-01-02T00:00:00.000Z',
          model: 'disabled',
          promptHash: '',
          error: 'disabled',
        },
      }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('disabled');
  });

  it('returns failed when LLM throws', async () => {
    const deps = makeDeps();
    deps.llm.invoke = vi.fn().mockRejectedValue(new Error('boom')) as AnyMock;
    deps.prisma.report.findUnique = vi
      .fn()
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce(fakeReport)
      .mockResolvedValueOnce({
        ...fakeReport,
        aiSuggestions: {
          items: [],
          generatedAt: '2026-01-02T00:00:00.000Z',
          model: 'm',
          promptHash: 'h',
          error: 'llm_failed',
        },
      }) as AnyMock;
    const svc = buildService(deps);
    const out = await svc.generateOnce('a-1');
    expect(out.status).toBe('failed');
  });

  it('throws when report not found', async () => {
    const deps = makeDeps();
    deps.prisma.report.findUnique = vi.fn().mockResolvedValue(null) as AnyMock;
    const svc = buildService(deps);
    await expect(svc.generateOnce('missing')).rejects.toThrow(/report not found/);
  });
});
