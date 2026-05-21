import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as path from 'node:path';
import { AiSuggestService } from '../../src/report/ai-suggest/services/ai-suggest.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { FileSystemPromptLoader } from '@repo/seo-ai-core';

// Real Prisma (against the report DB) + real FileSystemPromptLoader (reads the
// actual YAML) + a stub LLM. Proves the round-trip: snapshot -> prompt render
// -> Zod parse -> persist Report.aiSuggestions. Requires REPORT_DATABASE_URL.
//
// Services are constructed manually (not via Nest DI): vitest's esbuild
// transform doesn't emit decorator metadata, so type-based injection can't
// resolve — same reason the other report integration tests build by hand.
const hasDb = !!(process.env.REPORT_DATABASE_URL || process.env.DATABASE_URL);

const stubLLM = {
  name: 'stub',
  providerId: 'stub',
  model: 'stub',
  modelId: 'stub',
  invoke: async () => ({
    content: JSON.stringify({
      suggestions: [
        {
          ruleId: 'title-tag',
          explanation: 'Title is too long, hurting SERP display.',
          actionable_fix: 'Shorten the title to under 60 characters.',
        },
      ],
    }),
    usage: { prompt: 50, completion: 30, total: 80 },
    model: 'stub',
    finishReason: 'stop' as const,
  }),
  stream: async function* () {
    /* noop */
  },
  countTokens: async () => 0,
};

describe.skipIf(!hasDb)('ai-suggest pipeline [integration]', () => {
  let prisma: PrismaService;
  let svc: AiSuggestService;
  const AUDIT_ID = '00000000-0000-0000-0000-0000000a1501';

  beforeAll(async () => {
    process.env.SEO_AI_ENABLED = 'true';
    prisma = new PrismaService();
    await prisma.$connect();
    const promptLoader = new FileSystemPromptLoader({
      baseDir: path.join(__dirname, '..', '..', 'src', 'report', 'ai-suggest', 'prompts'),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svc = new AiSuggestService(prisma, promptLoader as any, stubLLM as any);
  });

  afterAll(async () => {
    await prisma?.report.deleteMany({ where: { auditId: AUDIT_ID } });
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({ where: { auditId: AUDIT_ID } });
  });

  it('persists suggestions to Report.aiSuggestions for failing rules', async () => {
    const created = await prisma.report.create({
      data: {
        auditId: AUDIT_ID,
        url: 'https://example.com',
        domain: 'example.com',
        finalScore: 72.5,
        classification: 'good',
        totalIssues: 1,
        criticalIssues: 1,
        warnIssues: 0,
        passCount: 0,
        analysisSnapshot: {
          ruleResults: [
            { ruleId: 'title-tag', ruleName: 'Title Tag', category: 'meta', status: 'fail', weight: 9, message: 'too long', suggestion: null },
          ],
        } as object,
        cwvSnapshot: {} as object,
      },
    });

    const out = await svc.generate(AUDIT_ID);
    expect(out).toHaveLength(1);
    expect(out[0].ruleId).toBe('title-tag');

    const fresh = await prisma.report.findUnique({ where: { id: created.id } });
    const ai = fresh!.aiSuggestions as { items: unknown[]; generatedAt: string; model: string };
    expect(ai.items).toHaveLength(1);
    expect(ai.generatedAt).toBeTruthy();
  });

  it('persists empty suggestions when no failing rules', async () => {
    await prisma.report.create({
      data: {
        auditId: AUDIT_ID,
        url: 'https://example.com',
        domain: 'example.com',
        finalScore: 95,
        classification: 'excellent',
        totalIssues: 0,
        criticalIssues: 0,
        warnIssues: 0,
        passCount: 1,
        analysisSnapshot: {
          ruleResults: [
            { ruleId: 'title-tag', ruleName: 'Title Tag', category: 'meta', status: 'pass', weight: 9, message: 'ok', suggestion: null },
          ],
        } as object,
        cwvSnapshot: {} as object,
      },
    });

    const out = await svc.generate(AUDIT_ID);
    expect(out).toEqual([]);

    const fresh = await prisma.report.findUnique({ where: { auditId: AUDIT_ID } });
    const ai = fresh!.aiSuggestions as { items: unknown[]; generatedAt: string };
    expect(ai.items).toEqual([]);
    expect(ai.generatedAt).toBeTruthy();
  });
});
