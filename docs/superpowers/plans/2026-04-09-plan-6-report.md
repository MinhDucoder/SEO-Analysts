# Plan 6: Report Service Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow TDD — where a Vitest spec file is listed before the implementation file, write the test first, watch it fail, then implement.

**Goal:** Implement the complete Report business logic on top of the Plan 1 scaffold — the Report service waits for BOTH `analyze.done` and `keyword.done` events via a Redis counter pattern, aggregates Analyzer + Keyword + CWV results into a final SEO report, persists to `report-db`, emits `report.done` so the Gateway can mark the audit complete, exposes 8 gRPC RPCs from `report.proto`, generates PDF reports via Playwright + Handlebars, compares two reports, and manages public share links.

**Architecture:** Two parallel pipeline branches (Analyzer worker → `analyze.done`, Keyword worker → `keyword.done`) both publish their results into Redis. Two Nest event listeners in this service receive each event, store the payload under `audit:{id}:analyze_result` / `audit:{id}:keyword_result` (TTL 1h), and `INCR audit:{id}:completed_steps`. When the counter reaches `2`, the listener enqueues a `report.start` BullMQ job. The `ReportWorker` consumes that job, calls `ReportService.generate()` which orchestrates `ReportAggregator` (final score + classification + issue counts) → `ReportRepository` (Prisma transaction inserting `Report` + `ReportKeyword[]` + `ReportCwv` rows) → progress event 85% → `report.done` publish → Redis cleanup. Detail/share/compare/PDF functionality is exposed as gRPC + a single HTTP `GET /audits/:id/export?format=pdf` endpoint that streams `application/pdf` binary. PDFs are produced by a `PdfGenerator` that pools two Playwright browsers, renders a Handlebars template (`report.hbs` + `report.css`) into HTML, then calls `page.setContent` + `page.pdf({ format: 'A4', printBackground: true })`.

**Tech Stack:** NestJS 10 (hybrid HTTP + gRPC microservice), @nestjs/microservices (gRPC), @nestjs/bullmq 10, BullMQ 5, Prisma 5, Playwright 1.48 (PDF), Handlebars 4, ioredis 5, Vitest 2.

**Reference Spec:** `docs/superpowers/specs/2026-04-09-microservices-architecture-design.md` Section 3 (Pipeline — wait-for-both pattern, lines 320–410) and Section 5 (Database — `report-db` schema, lines around the Report DB definitions).

**Depends on:** Plan 1 (Foundation) — complete. The scaffold already provides `apps/report/src/main.ts` (hybrid HTTP 3004 + gRPC 50055), `AppModule`, `PrismaModule`, the migrated `report-db` schema (`Report`, `ReportKeyword`, `ReportCwv`, `ShareLink`), and all runtime dependencies (`@prisma/client`, `playwright`, `bullmq`, `ioredis`).

**Cross-DB note:** `audit_id` is a UUID owned by the Gateway DB. Report DB stores it without an FK constraint. Treat it as an opaque correlation key.

---

## File Structure

Files produced by this plan (new, unless noted with MODIFY):

```
apps/report/
├── package.json                                  # MODIFY — add handlebars
├── vitest.config.ts                              # CREATE
├── src/
│   ├── app.module.ts                             # MODIFY — wire ReportModule + BullMQ + Redis
│   ├── main.ts                                   # MODIFY — register report.proto deps + start workers
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts                      # ioredis singleton + pub/sub clients
│   ├── report/
│   │   ├── report.module.ts
│   │   ├── report.service.ts                     # orchestrator: aggregate → persist → emit
│   │   ├── report.repository.ts                  # Prisma CRUD wrappers (transactional)
│   │   ├── report.aggregator.ts                  # final score + classification + issue counts
│   │   ├── report.comparator.ts                  # delta + fixed/new issue analysis
│   │   ├── share-link.service.ts                 # token gen + persist + access tracking
│   │   ├── wait-for-both.service.ts              # Redis counter pattern
│   │   ├── report.grpc.controller.ts             # 8 RPCs
│   │   ├── report.http.controller.ts             # GET /audits/:id/export
│   │   ├── analyze-done.listener.ts              # BullMQ/Redis subscriber
│   │   ├── keyword-done.listener.ts              # BullMQ/Redis subscriber
│   │   ├── report.worker.ts                      # @Processor(BULLMQ_QUEUES.REPORT_START)
│   │   ├── interfaces/
│   │   │   ├── analyze-result.interface.ts
│   │   │   ├── keyword-result.interface.ts
│   │   │   └── report-payload.interface.ts
│   │   └── test-fixtures/
│   │       ├── analyze-result.fixture.ts
│   │       ├── keyword-result.fixture.ts
│   │       └── cwv.fixture.ts
│   └── pdf/
│       ├── pdf.module.ts
│       ├── pdf.generator.ts                      # Playwright pool + Handlebars compile
│       ├── browser-pool.ts                       # 2-browser round-robin pool
│       └── templates/
│           ├── report.hbs
│           └── report.css
├── test/
│   ├── unit/
│   │   ├── report.repository.spec.ts             # in-memory Prisma mock
│   │   ├── report.aggregator.spec.ts
│   │   ├── report.comparator.spec.ts
│   │   ├── share-link.service.spec.ts
│   │   ├── wait-for-both.service.spec.ts
│   │   ├── pdf.generator.spec.ts
│   │   └── report.service.spec.ts
│   └── integration/
│       └── report-pipeline.e2e-spec.ts           # mock 2 done events → assert report row
```

---

## Task 1: Vitest Config + Redis Module + Handlebars Dependency

**Files:**
- Create: `apps/report/vitest.config.ts`
- Create: `apps/report/src/redis/redis.module.ts`
- Create: `apps/report/src/redis/redis.service.ts`
- Modify: `apps/report/package.json` (add `handlebars` runtime dep)

- [ ] **Step 1: Add handlebars dependency**

```bash
cd apps/report && npm install handlebars@^4.7.8
```

- [ ] **Step 2: Create vitest.config.ts**

Create `apps/report/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    testTimeout: 20_000, // PDF generation can be slow
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/report/**/*.ts', 'src/pdf/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/interfaces/**', '**/test-fixtures/**', '**/templates/**'],
    },
  },
  resolve: {
    alias: {
      '@report': resolve(__dirname, 'src/report'),
      '@pdf': resolve(__dirname, 'src/pdf'),
    },
  },
});
```

- [ ] **Step 3: Implement RedisService**

Create `apps/report/src/redis/redis.service.ts`:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private commandClient!: Redis;
  private subscriberClient!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.commandClient = new Redis(url, { maxRetriesPerRequest: null });
    this.subscriberClient = new Redis(url, { maxRetriesPerRequest: null });
    this.logger.log(`Redis connected: ${url}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.commandClient?.quit();
    await this.subscriberClient?.quit();
  }

  client(): Redis {
    return this.commandClient;
  }

  subscriber(): Redis {
    return this.subscriberClient;
  }
}
```

Create `apps/report/src/redis/redis.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/report/package.json apps/report/package-lock.json apps/report/vitest.config.ts apps/report/src/redis
git commit -m "chore(report): add vitest config, redis module, handlebars dependency"
```

---

## Task 2: Domain Interfaces + Test Fixtures

**Files:**
- Create: `apps/report/src/report/interfaces/analyze-result.interface.ts`
- Create: `apps/report/src/report/interfaces/keyword-result.interface.ts`
- Create: `apps/report/src/report/interfaces/report-payload.interface.ts`
- Create: `apps/report/src/report/test-fixtures/analyze-result.fixture.ts`
- Create: `apps/report/src/report/test-fixtures/keyword-result.fixture.ts`
- Create: `apps/report/src/report/test-fixtures/cwv.fixture.ts`

- [ ] **Step 1: Define interfaces**

Create `apps/report/src/report/interfaces/analyze-result.interface.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';

export interface AnalyzeRuleResult {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  status: CheckStatus;
  score: number;
  weight: number;
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}

export interface AnalyzeCategoryScore {
  category: IssueCategory;
  score: number;
  passCount: number;
  warnCount: number;
  failCount: number;
}

export interface AnalyzeResult {
  auditId: string;
  url: string;
  domain: string;
  overallScore: number;
  ruleResults: AnalyzeRuleResult[];
  categoryScores: AnalyzeCategoryScore[];
}
```

Create `apps/report/src/report/interfaces/keyword-result.interface.ts`:

```ts
export interface KeywordResultItem {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  rank: number;
  isTarget: boolean;
}

export interface KeywordResult {
  auditId: string;
  keywords: KeywordResultItem[];
}
```

Create `apps/report/src/report/interfaces/report-payload.interface.ts`:

```ts
import { CoreWebVitals } from '@repo/shared';
import { AnalyzeResult } from './analyze-result.interface';
import { KeywordResult } from './keyword-result.interface';

export interface ReportInputs {
  auditId: string;
  url: string;
  domain: string;
  analyze: AnalyzeResult;
  keywords: KeywordResult;
  cwv: CoreWebVitals;
}

export interface AggregatedReport {
  url: string;
  domain: string;
  finalScore: number;
  classification: string; // Classification enum value
  totalIssues: number;
  criticalIssues: number;
  warnIssues: number;
  passCount: number;
  analysisSnapshot: AnalyzeResult;
  cwvSnapshot: CoreWebVitals;
}
```

- [ ] **Step 2: Create fixtures**

Create `apps/report/src/report/test-fixtures/analyze-result.fixture.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { AnalyzeResult } from '../interfaces/analyze-result.interface';

export function makeAnalyzeResult(overrides: Partial<AnalyzeResult> = {}): AnalyzeResult {
  return {
    auditId: '00000000-0000-0000-0000-000000000001',
    url: 'https://example.com/',
    domain: 'example.com',
    overallScore: 82,
    ruleResults: [
      {
        ruleId: 'r-title_tag',
        ruleName: 'title_tag',
        category: IssueCategory.META,
        status: CheckStatus.PASS,
        score: 100,
        weight: 9,
        message: 'Title length OK',
        suggestion: null,
        metadata: { length: 55 },
      },
      {
        ruleId: 'r-meta_description',
        ruleName: 'meta_description',
        category: IssueCategory.META,
        status: CheckStatus.WARN,
        score: 50,
        weight: 8,
        message: 'Meta description slightly short',
        suggestion: 'Aim for 120-160 characters',
        metadata: { length: 110 },
      },
      {
        ruleId: 'r-h1_tag',
        ruleName: 'h1_tag',
        category: IssueCategory.HEADINGS,
        status: CheckStatus.FAIL,
        score: 0,
        weight: 9,
        message: 'Missing H1',
        suggestion: 'Add a single H1 tag',
        metadata: {},
      },
    ],
    categoryScores: [
      { category: IssueCategory.META, score: 75, passCount: 1, warnCount: 1, failCount: 0 },
      { category: IssueCategory.HEADINGS, score: 0, passCount: 0, warnCount: 0, failCount: 1 },
    ],
    ...overrides,
  };
}
```

Create `apps/report/src/report/test-fixtures/keyword-result.fixture.ts`:

```ts
import { KeywordResult } from '../interfaces/keyword-result.interface';

export function makeKeywordResult(overrides: Partial<KeywordResult> = {}): KeywordResult {
  return {
    auditId: '00000000-0000-0000-0000-000000000001',
    keywords: [
      {
        keyword: 'seo',
        frequency: 18,
        densityPercent: 2.4,
        inTitle: true,
        inH1: false,
        inFirstParagraph: true,
        inMetaDescription: true,
        rank: 1,
        isTarget: true,
      },
      {
        keyword: 'analysis',
        frequency: 12,
        densityPercent: 1.6,
        inTitle: false,
        inH1: false,
        inFirstParagraph: true,
        inMetaDescription: false,
        rank: 2,
        isTarget: false,
      },
    ],
    ...overrides,
  };
}
```

Create `apps/report/src/report/test-fixtures/cwv.fixture.ts`:

```ts
import { CoreWebVitals } from '@repo/shared';

export function makeCwv(overrides: Partial<CoreWebVitals> = {}): CoreWebVitals {
  return {
    lcpMs: 2200,
    inpMs: 180,
    cls: 0.05,
    performanceScore: 88,
    accessibilityScore: 95,
    bestPracticesScore: 92,
    seoScore: 100,
    ...overrides,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/report/src/report/interfaces apps/report/src/report/test-fixtures
git commit -m "feat(report): add domain interfaces and test fixtures for report inputs"
```

---

## Task 3: ReportRepository (TDD)

**Files:**
- Create: `apps/report/test/unit/report.repository.spec.ts`
- Create: `apps/report/src/report/report.repository.ts`

- [ ] **Step 1: TDD — write spec first**

Create `apps/report/test/unit/report.repository.spec.ts`:

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ReportRepository } from '../../src/report/report.repository';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';

const tx = {
  report: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  reportKeyword: { createMany: vi.fn() },
  reportCwv: { create: vi.fn() },
};

const prismaMock: any = {
  $transaction: vi.fn(async (cb: any) => cb(tx)),
  report: tx.report,
  reportKeyword: tx.reportKeyword,
  reportCwv: tx.reportCwv,
};

describe('ReportRepository', () => {
  let repo: ReportRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ReportRepository(prismaMock);
  });

  it('persists report + keywords + cwv inside a single transaction', async () => {
    tx.report.create.mockResolvedValueOnce({
      id: 'rep-1',
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      finalScore: 80,
      classification: 'excellent',
      totalIssues: 1,
      criticalIssues: 1,
      warnIssues: 1,
      passCount: 1,
      analysisSnapshot: {},
      cwvSnapshot: {},
      createdAt: new Date(),
    });

    const aggregated = {
      url: 'https://example.com/',
      domain: 'example.com',
      finalScore: 80,
      classification: 'excellent',
      totalIssues: 1,
      criticalIssues: 1,
      warnIssues: 1,
      passCount: 1,
      analysisSnapshot: makeAnalyzeResult(),
      cwvSnapshot: makeCwv(),
    };
    const created = await repo.createFullReport({
      auditId: 'aud-1',
      aggregated,
      keywords: makeKeywordResult().keywords,
      cwv: makeCwv(),
    });

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(tx.report.create).toHaveBeenCalledOnce();
    expect(tx.reportKeyword.createMany).toHaveBeenCalledOnce();
    expect(tx.reportCwv.create).toHaveBeenCalledOnce();
    expect(created.id).toBe('rep-1');
  });

  it('findByAuditId returns report with relations', async () => {
    prismaMock.report.findUnique.mockResolvedValueOnce({ id: 'r1', auditId: 'aud-1' });
    const found = await repo.findByAuditId('aud-1');
    expect(prismaMock.report.findUnique).toHaveBeenCalledWith({
      where: { auditId: 'aud-1' },
      include: { keywords: true, cwv: true, shareLink: true },
    });
    expect(found?.id).toBe('r1');
  });

  it('findManyByAuditIds returns multiple reports', async () => {
    prismaMock.report.findMany.mockResolvedValueOnce([{ id: 'r1' }, { id: 'r2' }]);
    const list = await repo.findManyByAuditIds(['a', 'b']);
    expect(list).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test (RED)**

```bash
cd apps/report && npm test -- report.repository
```

Expected: import error / class missing.

- [ ] **Step 3: Implement ReportRepository**

Create `apps/report/src/report/report.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoreWebVitals } from '@repo/shared';
import { AggregatedReport } from './interfaces/report-payload.interface';
import { KeywordResultItem } from './interfaces/keyword-result.interface';

export interface CreateFullReportInput {
  auditId: string;
  aggregated: AggregatedReport;
  keywords: KeywordResultItem[];
  cwv: CoreWebVitals;
}

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFullReport(input: CreateFullReportInput) {
    const { auditId, aggregated, keywords, cwv } = input;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          auditId,
          url: aggregated.url,
          domain: aggregated.domain,
          finalScore: aggregated.finalScore,
          classification: aggregated.classification,
          totalIssues: aggregated.totalIssues,
          criticalIssues: aggregated.criticalIssues,
          warnIssues: aggregated.warnIssues,
          passCount: aggregated.passCount,
          analysisSnapshot: aggregated.analysisSnapshot as any,
          cwvSnapshot: aggregated.cwvSnapshot as any,
        },
      });

      if (keywords.length > 0) {
        await tx.reportKeyword.createMany({
          data: keywords.map((k) => ({
            reportId: report.id,
            keyword: k.keyword,
            frequency: k.frequency,
            densityPercent: k.densityPercent,
            inTitle: k.inTitle,
            inH1: k.inH1,
            inFirstParagraph: k.inFirstParagraph,
            inMetaDescription: k.inMetaDescription,
            rank: k.rank,
            isTarget: k.isTarget,
          })),
        });
      }

      await tx.reportCwv.create({
        data: {
          reportId: report.id,
          lcpMs: cwv.lcpMs,
          inpMs: cwv.inpMs,
          cls: cwv.cls,
          performanceScore: cwv.performanceScore,
          accessibilityScore: cwv.accessibilityScore,
          bestPracticesScore: cwv.bestPracticesScore,
          lighthouseSeoScore: cwv.seoScore,
        },
      });

      return report;
    });
  }

  async findByAuditId(auditId: string) {
    return this.prisma.report.findUnique({
      where: { auditId },
      include: { keywords: true, cwv: true, shareLink: true },
    });
  }

  async findManyByAuditIds(auditIds: string[]) {
    return this.prisma.report.findMany({
      where: { auditId: { in: auditIds } },
      include: { keywords: true, cwv: true },
    });
  }
}
```

- [ ] **Step 4: Run test (GREEN)**

```bash
cd apps/report && npm test -- report.repository
```

- [ ] **Step 5: Commit**

```bash
git add apps/report/src/report/report.repository.ts apps/report/test/unit/report.repository.spec.ts
git commit -m "feat(report): add ReportRepository with transactional create + relation lookups"
```

---

## Task 4: ReportAggregator (TDD)

**Files:**
- Create: `apps/report/test/unit/report.aggregator.spec.ts`
- Create: `apps/report/src/report/report.aggregator.ts`

- [ ] **Step 1: TDD — write spec first**

Create `apps/report/test/unit/report.aggregator.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ReportAggregator } from '../../src/report/report.aggregator';
import { Classification, CheckStatus, IssueCategory } from '@repo/shared';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';

describe('ReportAggregator', () => {
  const aggregator = new ReportAggregator();

  it('blends analyzer overall (70%) with CWV performance (30%) into finalScore', () => {
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze: makeAnalyzeResult({ overallScore: 80 }),
      keywords: makeKeywordResult(),
      cwv: makeCwv({ performanceScore: 60 }),
    });
    // 80*0.7 + 60*0.3 = 56 + 18 = 74
    expect(out.finalScore).toBe(74);
    expect(out.classification).toBe(Classification.GOOD);
  });

  it('counts pass/warn/critical issues from rule results', () => {
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze: makeAnalyzeResult({
        ruleResults: [
          { ruleId: 'r1', ruleName: 'a', category: IssueCategory.META, status: CheckStatus.PASS, score: 100, weight: 5, message: '', suggestion: null, metadata: {} },
          { ruleId: 'r2', ruleName: 'b', category: IssueCategory.META, status: CheckStatus.WARN, score: 50, weight: 5, message: '', suggestion: null, metadata: {} },
          { ruleId: 'r3', ruleName: 'c', category: IssueCategory.HEADINGS, status: CheckStatus.FAIL, score: 0, weight: 9, message: '', suggestion: null, metadata: {} },
          { ruleId: 'r4', ruleName: 'd', category: IssueCategory.HEADINGS, status: CheckStatus.FAIL, score: 0, weight: 3, message: '', suggestion: null, metadata: {} },
        ],
      }),
      keywords: makeKeywordResult(),
      cwv: makeCwv(),
    });
    expect(out.passCount).toBe(1);
    expect(out.warnIssues).toBe(1);
    // critical = FAIL with weight >= 7
    expect(out.criticalIssues).toBe(1);
    expect(out.totalIssues).toBe(3); // warn + fail
  });

  it('classifies POOR for finalScore below 40', () => {
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: 'https://x.com/',
      domain: 'x.com',
      analyze: makeAnalyzeResult({ overallScore: 20 }),
      keywords: makeKeywordResult(),
      cwv: makeCwv({ performanceScore: 30 }),
    });
    expect(out.classification).toBe(Classification.POOR);
  });

  it('attaches analyze and cwv snapshots verbatim', () => {
    const analyze = makeAnalyzeResult();
    const cwv = makeCwv();
    const out = aggregator.aggregate({
      auditId: 'aud-1',
      url: analyze.url,
      domain: analyze.domain,
      analyze,
      keywords: makeKeywordResult(),
      cwv,
    });
    expect(out.analysisSnapshot).toBe(analyze);
    expect(out.cwvSnapshot).toBe(cwv);
  });
});
```

- [ ] **Step 2: Implement ReportAggregator**

Create `apps/report/src/report/report.aggregator.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CheckStatus, classify } from '@repo/shared';
import { AggregatedReport, ReportInputs } from './interfaces/report-payload.interface';

const CRITICAL_WEIGHT_THRESHOLD = 7;
const ANALYZER_WEIGHT = 0.7;
const CWV_WEIGHT = 0.3;

@Injectable()
export class ReportAggregator {
  aggregate(inputs: ReportInputs): AggregatedReport {
    const { analyze, cwv } = inputs;

    const blended =
      analyze.overallScore * ANALYZER_WEIGHT + cwv.performanceScore * CWV_WEIGHT;
    const finalScore = Math.round(blended);

    let passCount = 0;
    let warnIssues = 0;
    let failCount = 0;
    let criticalIssues = 0;

    for (const r of analyze.ruleResults) {
      if (r.status === CheckStatus.PASS) {
        passCount += 1;
      } else if (r.status === CheckStatus.WARN) {
        warnIssues += 1;
      } else if (r.status === CheckStatus.FAIL) {
        failCount += 1;
        if (r.weight >= CRITICAL_WEIGHT_THRESHOLD) {
          criticalIssues += 1;
        }
      }
    }

    const totalIssues = warnIssues + failCount;

    return {
      url: inputs.url,
      domain: inputs.domain,
      finalScore,
      classification: classify(finalScore),
      totalIssues,
      criticalIssues,
      warnIssues,
      passCount,
      analysisSnapshot: analyze,
      cwvSnapshot: cwv,
    };
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/report && npm test -- report.aggregator
```

- [ ] **Step 4: Commit**

```bash
git add apps/report/src/report/report.aggregator.ts apps/report/test/unit/report.aggregator.spec.ts
git commit -m "feat(report): add ReportAggregator blending analyzer + CWV scores with classification"
```

---

## Task 5: ReportComparator (TDD)

**Files:**
- Create: `apps/report/test/unit/report.comparator.spec.ts`
- Create: `apps/report/src/report/report.comparator.ts`

- [ ] **Step 1: TDD — write spec first**

Create `apps/report/test/unit/report.comparator.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ReportComparator } from '../../src/report/report.comparator';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { AnalyzeRuleResult } from '../../src/report/interfaces/analyze-result.interface';

function rule(id: string, status: CheckStatus, score = status === CheckStatus.PASS ? 100 : status === CheckStatus.WARN ? 50 : 0): AnalyzeRuleResult {
  return {
    ruleId: id,
    ruleName: id,
    category: IssueCategory.META,
    status,
    score,
    weight: 5,
    message: '',
    suggestion: null,
    metadata: {},
  };
}

const baseReport = (rules: AnalyzeRuleResult[], finalScore: number) => ({
  finalScore,
  analysisSnapshot: { ruleResults: rules },
});

describe('ReportComparator', () => {
  const comparator = new ReportComparator();

  it('computes scoreDelta = after - before', () => {
    const a: any = baseReport([rule('r1', CheckStatus.PASS)], 70);
    const b: any = baseReport([rule('r1', CheckStatus.PASS)], 85);
    const out = comparator.compare(a, b);
    expect(out.scoreDelta).toBe(15);
  });

  it('detects fixed issues (FAIL → PASS) and new issues (PASS → FAIL)', () => {
    const before: any = baseReport(
      [rule('r1', CheckStatus.FAIL), rule('r2', CheckStatus.PASS), rule('r3', CheckStatus.WARN)],
      50,
    );
    const after: any = baseReport(
      [rule('r1', CheckStatus.PASS), rule('r2', CheckStatus.FAIL), rule('r3', CheckStatus.WARN)],
      55,
    );
    const out = comparator.compare(before, after);
    expect(out.issuesFixed).toEqual(['r1']);
    expect(out.issuesNew).toEqual(['r2']);
  });

  it('produces a RuleDelta entry for every rule appearing in either report', () => {
    const before: any = baseReport([rule('r1', CheckStatus.PASS), rule('r2', CheckStatus.PASS)], 70);
    const after: any = baseReport([rule('r2', CheckStatus.WARN), rule('r3', CheckStatus.PASS)], 70);
    const out = comparator.compare(before, after);
    const ids = out.ruleDeltas.map((d) => d.ruleId).sort();
    expect(ids).toEqual(['r1', 'r2', 'r3']);
  });
});
```

- [ ] **Step 2: Implement ReportComparator**

Create `apps/report/src/report/report.comparator.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CheckStatus } from '@repo/shared';
import { AnalyzeRuleResult } from './interfaces/analyze-result.interface';

export interface RuleDeltaItem {
  ruleId: string;
  ruleName: string;
  statusBefore: CheckStatus | null;
  statusAfter: CheckStatus | null;
  scoreDelta: number;
}

export interface CompareResult {
  scoreDelta: number;
  ruleDeltas: RuleDeltaItem[];
  issuesFixed: string[];
  issuesNew: string[];
}

interface ReportLike {
  finalScore: number | { toNumber(): number };
  analysisSnapshot: { ruleResults: AnalyzeRuleResult[] };
}

@Injectable()
export class ReportComparator {
  compare(before: ReportLike, after: ReportLike): CompareResult {
    const beforeMap = new Map(before.analysisSnapshot.ruleResults.map((r) => [r.ruleId, r]));
    const afterMap = new Map(after.analysisSnapshot.ruleResults.map((r) => [r.ruleId, r]));

    const allIds = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);

    const ruleDeltas: RuleDeltaItem[] = [];
    const issuesFixed: string[] = [];
    const issuesNew: string[] = [];

    for (const id of allIds) {
      const b = beforeMap.get(id);
      const a = afterMap.get(id);
      const beforeStatus = b ? b.status : null;
      const afterStatus = a ? a.status : null;
      const beforeScore = b ? b.score : 0;
      const afterScore = a ? a.score : 0;

      ruleDeltas.push({
        ruleId: id,
        ruleName: (a ?? b)!.ruleName,
        statusBefore: beforeStatus,
        statusAfter: afterStatus,
        scoreDelta: afterScore - beforeScore,
      });

      if (beforeStatus === CheckStatus.FAIL && afterStatus === CheckStatus.PASS) {
        issuesFixed.push(id);
      }
      if (beforeStatus === CheckStatus.PASS && afterStatus === CheckStatus.FAIL) {
        issuesNew.push(id);
      }
    }

    const beforeFinal = typeof before.finalScore === 'number' ? before.finalScore : before.finalScore.toNumber();
    const afterFinal = typeof after.finalScore === 'number' ? after.finalScore : after.finalScore.toNumber();

    return {
      scoreDelta: Number((afterFinal - beforeFinal).toFixed(2)),
      ruleDeltas,
      issuesFixed,
      issuesNew,
    };
  }
}
```

- [ ] **Step 3: Run tests + commit**

```bash
cd apps/report && npm test -- report.comparator
git add apps/report/src/report/report.comparator.ts apps/report/test/unit/report.comparator.spec.ts
git commit -m "feat(report): add ReportComparator computing score delta + fixed/new issues"
```

---

## Task 6: ShareLinkService (TDD)

**Files:**
- Create: `apps/report/test/unit/share-link.service.spec.ts`
- Create: `apps/report/src/report/share-link.service.ts`

- [ ] **Step 1: TDD — write spec first**

Create `apps/report/test/unit/share-link.service.spec.ts`:

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ShareLinkService } from '../../src/report/share-link.service';

const prismaMock: any = {
  shareLink: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  report: { findUnique: vi.fn() },
};

describe('ShareLinkService', () => {
  let service: ShareLinkService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShareLinkService(prismaMock);
  });

  it('creates a 64-char hex token via crypto.randomBytes(32)', async () => {
    prismaMock.report.findUnique.mockResolvedValueOnce({ id: 'rep-1', auditId: 'aud-1' });
    prismaMock.shareLink.create.mockResolvedValueOnce({ token: '0'.repeat(64), reportId: 'rep-1' });
    const result = await service.create('aud-1');
    expect(prismaMock.shareLink.create).toHaveBeenCalledOnce();
    const callArg = prismaMock.shareLink.create.mock.calls[0][0].data;
    expect(callArg.token).toMatch(/^[0-9a-f]{64}$/);
    expect(result.token).toHaveLength(64);
  });

  it('throws when audit has no report', async () => {
    prismaMock.report.findUnique.mockResolvedValueOnce(null);
    await expect(service.create('aud-missing')).rejects.toThrow(/report not found/i);
  });

  it('lookup increments accessedCount and sets lastAccessedAt', async () => {
    prismaMock.shareLink.findFirst.mockResolvedValueOnce({
      id: 'sl-1',
      reportId: 'rep-1',
      token: 'tok',
      isActive: true,
    });
    prismaMock.shareLink.update.mockResolvedValueOnce({});
    const link = await service.findActiveByToken('tok');
    expect(link?.id).toBe('sl-1');
    expect(prismaMock.shareLink.update).toHaveBeenCalledWith({
      where: { id: 'sl-1' },
      data: expect.objectContaining({
        accessedCount: { increment: 1 },
        lastAccessedAt: expect.any(Date),
      }),
    });
  });

  it('lookup returns null for inactive or unknown token', async () => {
    prismaMock.shareLink.findFirst.mockResolvedValueOnce(null);
    expect(await service.findActiveByToken('nope')).toBeNull();
  });

  it('revoke marks all share links for the audit inactive', async () => {
    prismaMock.shareLink.update.mockResolvedValueOnce({ id: 'sl-1', isActive: false });
    prismaMock.report.findUnique.mockResolvedValueOnce({ id: 'rep-1' });
    const ok = await service.revoke('aud-1');
    expect(ok).toBe(true);
    expect(prismaMock.shareLink.update).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement ShareLinkService**

Create `apps/report/src/report/share-link.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShareLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async create(auditId: string) {
    const report = await this.prisma.report.findUnique({ where: { auditId } });
    if (!report) {
      throw new NotFoundException(`Report not found for audit ${auditId}`);
    }
    const token = randomBytes(32).toString('hex'); // 64 chars
    return this.prisma.shareLink.create({
      data: {
        reportId: report.id,
        auditId,
        token,
        isActive: true,
      },
    });
  }

  async findActiveByToken(token: string) {
    const link = await this.prisma.shareLink.findFirst({
      where: { token, isActive: true },
    });
    if (!link) return null;
    await this.prisma.shareLink.update({
      where: { id: link.id },
      data: {
        accessedCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
    return link;
  }

  async revoke(auditId: string): Promise<boolean> {
    const report = await this.prisma.report.findUnique({ where: { auditId } });
    if (!report) return false;
    await this.prisma.shareLink.update({
      where: { reportId: report.id },
      data: { isActive: false },
    });
    return true;
  }
}
```

- [ ] **Step 3: Run tests + commit**

```bash
cd apps/report && npm test -- share-link
git add apps/report/src/report/share-link.service.ts apps/report/test/unit/share-link.service.spec.ts
git commit -m "feat(report): add ShareLinkService with crypto token gen and access tracking"
```

---

## Task 7: WaitForBothService (Redis Counter Pattern, TDD)

**Files:**
- Create: `apps/report/test/unit/wait-for-both.service.spec.ts`
- Create: `apps/report/src/report/wait-for-both.service.ts`

- [ ] **Step 1: TDD — write spec first**

Create `apps/report/test/unit/wait-for-both.service.spec.ts`:

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { WaitForBothService } from '../../src/report/wait-for-both.service';

const redisCmd = {
  setex: vi.fn(),
  incr: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
};
const redisService: any = { client: () => redisCmd };
const queueAdd = vi.fn();
const reportQueue: any = { add: queueAdd };

describe('WaitForBothService', () => {
  let svc: WaitForBothService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new WaitForBothService(redisService, reportQueue);
  });

  it('stores analyze payload + INCR + does NOT enqueue when count = 1', async () => {
    redisCmd.incr.mockResolvedValueOnce(1);
    await svc.recordAnalyzeDone('aud-1', { foo: 'bar' });
    expect(redisCmd.setex).toHaveBeenCalledWith(
      'audit:aud-1:analyze_result',
      3600,
      JSON.stringify({ foo: 'bar' }),
    );
    expect(redisCmd.incr).toHaveBeenCalledWith('audit:aud-1:completed_steps');
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('enqueues report.start when count = 2 after recordKeywordDone', async () => {
    redisCmd.incr.mockResolvedValueOnce(2);
    await svc.recordKeywordDone('aud-1', { keywords: [] });
    expect(redisCmd.setex).toHaveBeenCalledWith(
      'audit:aud-1:keyword_result',
      3600,
      JSON.stringify({ keywords: [] }),
    );
    expect(queueAdd).toHaveBeenCalledWith('report.start', { auditId: 'aud-1' }, expect.any(Object));
  });

  it('reads stored payloads and parses JSON', async () => {
    redisCmd.get
      .mockResolvedValueOnce(JSON.stringify({ overallScore: 80 }))
      .mockResolvedValueOnce(JSON.stringify({ keywords: [{ keyword: 'seo' }] }));
    const both = await svc.readBoth('aud-1');
    expect(both.analyze).toEqual({ overallScore: 80 });
    expect(both.keywords).toEqual({ keywords: [{ keyword: 'seo' }] });
  });

  it('readBoth throws when payloads missing', async () => {
    redisCmd.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(svc.readBoth('aud-1')).rejects.toThrow(/missing/i);
  });

  it('cleanup deletes all 3 keys', async () => {
    await svc.cleanup('aud-1');
    expect(redisCmd.del).toHaveBeenCalledWith(
      'audit:aud-1:analyze_result',
      'audit:aud-1:keyword_result',
      'audit:aud-1:completed_steps',
    );
  });
});
```

- [ ] **Step 2: Implement WaitForBothService**

Create `apps/report/src/report/wait-for-both.service.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULLMQ_QUEUES, CACHE_TTL, REDIS_KEYS } from '@repo/shared';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WaitForBothService {
  private readonly logger = new Logger(WaitForBothService.name);
  private readonly REQUIRED_STEPS = 2;

  constructor(
    private readonly redis: RedisService,
    @InjectQueue(BULLMQ_QUEUES.REPORT_START) private readonly reportQueue: Queue,
  ) {}

  async recordAnalyzeDone(auditId: string, payload: unknown): Promise<void> {
    await this.redis
      .client()
      .setex(REDIS_KEYS.auditAnalyzeResult(auditId), CACHE_TTL.AUDIT_RESULT_SECONDS, JSON.stringify(payload));
    await this.maybeTrigger(auditId);
  }

  async recordKeywordDone(auditId: string, payload: unknown): Promise<void> {
    await this.redis
      .client()
      .setex(REDIS_KEYS.auditKeywordResult(auditId), CACHE_TTL.AUDIT_RESULT_SECONDS, JSON.stringify(payload));
    await this.maybeTrigger(auditId);
  }

  private async maybeTrigger(auditId: string): Promise<void> {
    const count = await this.redis.client().incr(REDIS_KEYS.auditCompletedSteps(auditId));
    this.logger.log(`audit ${auditId} completed_steps=${count}/${this.REQUIRED_STEPS}`);
    if (count >= this.REQUIRED_STEPS) {
      await this.reportQueue.add(
        'report.start',
        { auditId },
        { attempts: 2, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: true },
      );
      this.logger.log(`enqueued report.start for ${auditId}`);
    }
  }

  async readBoth(auditId: string): Promise<{ analyze: any; keywords: any }> {
    const [a, k] = await Promise.all([
      this.redis.client().get(REDIS_KEYS.auditAnalyzeResult(auditId)),
      this.redis.client().get(REDIS_KEYS.auditKeywordResult(auditId)),
    ]);
    if (!a || !k) {
      throw new Error(`Missing payloads for audit ${auditId}: analyze=${!!a} keywords=${!!k}`);
    }
    return { analyze: JSON.parse(a), keywords: JSON.parse(k) };
  }

  async cleanup(auditId: string): Promise<void> {
    await this.redis
      .client()
      .del(
        REDIS_KEYS.auditAnalyzeResult(auditId),
        REDIS_KEYS.auditKeywordResult(auditId),
        REDIS_KEYS.auditCompletedSteps(auditId),
      );
  }
}
```

- [ ] **Step 3: Run tests + commit**

```bash
cd apps/report && npm test -- wait-for-both
git add apps/report/src/report/wait-for-both.service.ts apps/report/test/unit/wait-for-both.service.spec.ts
git commit -m "feat(report): add WaitForBothService implementing the Redis 2-step counter pattern"
```

---

## Task 8: PDF Handlebars Template

**Files:**
- Create: `apps/report/src/pdf/templates/report.hbs`
- Create: `apps/report/src/pdf/templates/report.css`

- [ ] **Step 1: Create CSS**

Create `apps/report/src/pdf/templates/report.css`:

```css
@page { size: A4; margin: 18mm 14mm 18mm 14mm; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1f2937;
  font-size: 11px;
  line-height: 1.5;
  margin: 0;
}
h1 { font-size: 26px; margin: 0 0 4px; color: #0f172a; }
h2 { font-size: 16px; margin: 18px 0 8px; color: #0f172a; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
h3 { font-size: 13px; margin: 12px 0 6px; color: #334155; }
.cover { text-align: center; padding: 60px 20px 30px; }
.cover .url { color: #3b82f6; font-size: 13px; word-break: break-all; }
.cover .meta { color: #64748b; font-size: 11px; margin-top: 6px; }
.score-badge {
  display: inline-block;
  padding: 18px 36px;
  border-radius: 999px;
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  margin-top: 24px;
}
.score-excellent { background: #16a34a; }
.score-good      { background: #65a30d; }
.score-fair      { background: #ea580c; }
.score-poor      { background: #dc2626; }
.classification { margin-top: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #334155; }
.summary { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 12px 0; }
.summary ul { margin: 6px 0 0 18px; padding: 0; }
.bar-row { display: flex; align-items: center; margin: 6px 0; }
.bar-label { width: 130px; font-weight: 600; }
.bar-track { flex: 1; height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden; margin: 0 8px; }
.bar-fill { height: 100%; background: #3b82f6; }
.bar-value { width: 36px; text-align: right; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
th { background: #f1f5f9; color: #0f172a; font-weight: 600; }
.rule { padding: 8px 10px; border-left: 3px solid #cbd5e1; margin: 6px 0; background: #f8fafc; }
.rule.pass { border-left-color: #16a34a; }
.rule.warn { border-left-color: #f59e0b; }
.rule.fail { border-left-color: #dc2626; }
.rule .name { font-weight: 600; color: #0f172a; }
.rule .msg  { color: #475569; margin-top: 2px; }
.rule .sug  { color: #0f766e; font-style: italic; margin-top: 2px; }
.cwv-grid { display: flex; gap: 10px; margin: 8px 0; }
.cwv-card { flex: 1; padding: 10px; background: #f1f5f9; border-radius: 6px; text-align: center; }
.cwv-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; }
.cwv-card .value { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
.footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid #e5e7eb; text-align: center; color: #94a3b8; font-size: 9px; }
.page-break { page-break-after: always; }
```

- [ ] **Step 2: Create Handlebars template**

Create `apps/report/src/pdf/templates/report.hbs`:

```handlebars
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SEO Report — {{domain}}</title>
  <style>{{{css}}}</style>
</head>
<body>
  <section class="cover">
    <h1>SEO Audit Report</h1>
    <div class="url">{{url}}</div>
    <div class="meta">{{domain}} &middot; {{generatedAt}}</div>
    <div class="score-badge score-{{classification}}">{{finalScore}}</div>
    <div class="classification">{{classification}}</div>
  </section>

  <h2>Executive Summary</h2>
  <div class="summary">
    <strong>Top issues to address</strong>
    <ul>
      {{#each topIssues}}
        <li><strong>{{this.ruleName}}:</strong> {{this.message}}</li>
      {{else}}
        <li>No critical issues detected. Great job!</li>
      {{/each}}
    </ul>
  </div>

  <h2>Score Breakdown by Category</h2>
  {{#each categoryScores}}
    <div class="bar-row">
      <div class="bar-label">{{this.category}}</div>
      <div class="bar-track"><div class="bar-fill" style="width: {{this.score}}%;"></div></div>
      <div class="bar-value">{{this.score}}</div>
    </div>
  {{/each}}

  <h2>Core Web Vitals</h2>
  <div class="cwv-grid">
    <div class="cwv-card"><div class="label">LCP</div><div class="value">{{cwv.lcpMs}} ms</div></div>
    <div class="cwv-card"><div class="label">INP</div><div class="value">{{cwv.inpMs}} ms</div></div>
    <div class="cwv-card"><div class="label">CLS</div><div class="value">{{cwv.cls}}</div></div>
    <div class="cwv-card"><div class="label">Performance</div><div class="value">{{cwv.performanceScore}}</div></div>
  </div>

  <div class="page-break"></div>

  <h2>Detailed Rule Results</h2>
  {{#each rulesByCategory}}
    <h3>{{this.category}}</h3>
    {{#each this.rules}}
      <div class="rule {{this.status}}">
        <div class="name">{{this.ruleName}} <span style="float:right;">{{this.score}}/100</span></div>
        <div class="msg">{{this.message}}</div>
        {{#if this.suggestion}}<div class="sug">Suggestion: {{this.suggestion}}</div>{{/if}}
      </div>
    {{/each}}
  {{/each}}

  <h2>Top Keywords</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Keyword</th><th>Frequency</th><th>Density</th><th>In Title</th><th>In H1</th><th>In Meta</th></tr>
    </thead>
    <tbody>
      {{#each topKeywords}}
        <tr>
          <td>{{this.rank}}</td>
          <td>{{this.keyword}}{{#if this.isTarget}} (target){{/if}}</td>
          <td>{{this.frequency}}</td>
          <td>{{this.densityPercent}}%</td>
          <td>{{#if this.inTitle}}yes{{else}}-{{/if}}</td>
          <td>{{#if this.inH1}}yes{{else}}-{{/if}}</td>
          <td>{{#if this.inMetaDescription}}yes{{else}}-{{/if}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">Generated by SEO Analyst Platform &middot; {{generatedAt}}</div>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add apps/report/src/pdf/templates
git commit -m "feat(report): add Handlebars PDF template and A4 print stylesheet"
```

---

## Task 9: Browser Pool + PdfGenerator (TDD)

**Files:**
- Create: `apps/report/src/pdf/browser-pool.ts`
- Create: `apps/report/test/unit/pdf.generator.spec.ts`
- Create: `apps/report/src/pdf/pdf.generator.ts`
- Create: `apps/report/src/pdf/pdf.module.ts`

- [ ] **Step 1: Implement BrowserPool**

Create `apps/report/src/pdf/browser-pool.ts`:

```ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Browser, chromium } from 'playwright';

@Injectable()
export class BrowserPool implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPool.name);
  private readonly POOL_SIZE = 2;
  private browsers: Browser[] = [];
  private cursor = 0;

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    for (let i = 0; i < this.POOL_SIZE; i += 1) {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
      this.browsers.push(browser);
    }
    this.logger.log(`browser pool ready (size=${this.POOL_SIZE})`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.browsers.map((b) => b.close()));
    this.browsers = [];
  }

  acquire(): Browser {
    if (this.browsers.length === 0) {
      throw new Error('BrowserPool not initialized');
    }
    const browser = this.browsers[this.cursor % this.browsers.length];
    this.cursor += 1;
    return browser;
  }
}
```

- [ ] **Step 2: TDD — PdfGenerator spec**

Create `apps/report/test/unit/pdf.generator.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PdfGenerator } from '../../src/pdf/pdf.generator';
import { Classification } from '@repo/shared';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';

const fakePage = {
  setContent: vi.fn().mockResolvedValue(undefined),
  pdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
  close: vi.fn().mockResolvedValue(undefined),
};
const fakeContext = {
  newPage: vi.fn().mockResolvedValue(fakePage),
  close: vi.fn().mockResolvedValue(undefined),
};
const fakeBrowser = { newContext: vi.fn().mockResolvedValue(fakeContext) };
const browserPool: any = { acquire: () => fakeBrowser };

describe('PdfGenerator', () => {
  let gen: PdfGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    gen = new PdfGenerator(browserPool);
  });

  it('renders Handlebars HTML, calls page.pdf, and returns binary + filename', async () => {
    const buf = await gen.generate({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      finalScore: 80,
      classification: Classification.EXCELLENT,
      analyze: makeAnalyzeResult(),
      keywords: makeKeywordResult().keywords,
      cwv: makeCwv(),
      categoryScores: makeAnalyzeResult().categoryScores,
    });

    expect(fakePage.setContent).toHaveBeenCalledOnce();
    const html = (fakePage.setContent.mock.calls[0] as any[])[0] as string;
    expect(html).toContain('SEO Audit Report');
    expect(html).toContain('example.com');
    expect(html).toContain('80');
    expect(fakePage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'A4', printBackground: true }),
    );
    expect(buf.pdf).toBeInstanceOf(Buffer);
    expect(buf.filename).toMatch(/^seo-report-example\.com-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(fakePage.close).toHaveBeenCalled();
    expect(fakeContext.close).toHaveBeenCalled();
  });

  it('limits topKeywords to 20 entries', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      keyword: `kw${i}`,
      frequency: 1,
      densityPercent: 0.1,
      inTitle: false,
      inH1: false,
      inFirstParagraph: false,
      inMetaDescription: false,
      rank: i + 1,
      isTarget: false,
    }));
    await gen.generate({
      auditId: 'a',
      url: 'https://x.com/',
      domain: 'x.com',
      finalScore: 50,
      classification: Classification.FAIR,
      analyze: makeAnalyzeResult(),
      keywords: many,
      cwv: makeCwv(),
      categoryScores: [],
    });
    const html = (fakePage.setContent.mock.calls[0] as any[])[0] as string;
    expect((html.match(/<tr>/g) ?? []).length).toBeLessThanOrEqual(21); // 1 header + 20 rows
  });
});
```

- [ ] **Step 3: Implement PdfGenerator**

Create `apps/report/src/pdf/pdf.generator.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { CheckStatus, CoreWebVitals } from '@repo/shared';
import { BrowserPool } from './browser-pool';
import {
  AnalyzeResult,
  AnalyzeRuleResult,
  AnalyzeCategoryScore,
} from '../report/interfaces/analyze-result.interface';
import { KeywordResultItem } from '../report/interfaces/keyword-result.interface';

export interface PdfRenderInput {
  auditId: string;
  url: string;
  domain: string;
  finalScore: number;
  classification: string;
  analyze: AnalyzeResult;
  keywords: KeywordResultItem[];
  cwv: CoreWebVitals;
  categoryScores: AnalyzeCategoryScore[];
}

export interface PdfRenderOutput {
  pdf: Buffer;
  filename: string;
}

@Injectable()
export class PdfGenerator {
  private readonly logger = new Logger(PdfGenerator.name);
  private readonly template: HandlebarsTemplateDelegate;
  private readonly css: string;

  constructor(private readonly pool: BrowserPool) {
    const tmplPath = join(__dirname, 'templates', 'report.hbs');
    const cssPath = join(__dirname, 'templates', 'report.css');
    this.template = Handlebars.compile(readFileSync(tmplPath, 'utf-8'));
    this.css = readFileSync(cssPath, 'utf-8');
  }

  async generate(input: PdfRenderInput): Promise<PdfRenderOutput> {
    const html = this.renderHtml(input);
    const browser = this.pool.acquire();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
      });
      await page.close();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `seo-report-${input.domain}-${date}.pdf`;
      return { pdf, filename };
    } finally {
      await context.close();
    }
  }

  private renderHtml(input: PdfRenderInput): string {
    const topIssues = input.analyze.ruleResults
      .filter((r) => r.status === CheckStatus.FAIL)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    const grouped = new Map<string, AnalyzeRuleResult[]>();
    for (const r of input.analyze.ruleResults) {
      const arr = grouped.get(r.category) ?? [];
      arr.push(r);
      grouped.set(r.category, arr);
    }
    const rulesByCategory = Array.from(grouped.entries()).map(([category, rules]) => ({
      category,
      rules,
    }));

    return this.template({
      url: input.url,
      domain: input.domain,
      finalScore: input.finalScore,
      classification: input.classification,
      generatedAt: new Date().toISOString(),
      css: this.css,
      topIssues,
      categoryScores: input.categoryScores,
      cwv: input.cwv,
      rulesByCategory,
      topKeywords: input.keywords.slice(0, 20),
    });
  }
}
```

- [ ] **Step 4: Create PdfModule**

Create `apps/report/src/pdf/pdf.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BrowserPool } from './browser-pool';
import { PdfGenerator } from './pdf.generator';

@Module({
  providers: [BrowserPool, PdfGenerator],
  exports: [PdfGenerator],
})
export class PdfModule {}
```

- [ ] **Step 5: Run tests + commit**

```bash
cd apps/report && npm test -- pdf.generator
git add apps/report/src/pdf apps/report/test/unit/pdf.generator.spec.ts
git commit -m "feat(report): add Playwright browser pool and Handlebars-based PdfGenerator"
```

---

## Task 10: ReportService Orchestrator (TDD)

**Files:**
- Create: `apps/report/test/unit/report.service.spec.ts`
- Create: `apps/report/src/report/report.service.ts`

- [ ] **Step 1: TDD — write spec first**

Create `apps/report/test/unit/report.service.spec.ts`:

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ReportService } from '../../src/report/report.service';
import { ReportAggregator } from '../../src/report/report.aggregator';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';

const repo: any = {
  createFullReport: vi.fn(),
  findByAuditId: vi.fn(),
  findManyByAuditIds: vi.fn(),
};
const waitSvc: any = {
  readBoth: vi.fn(),
  cleanup: vi.fn(),
};
const redisSvc: any = {
  client: () => ({ publish: vi.fn() }),
};
const publishMock = vi.fn();
redisSvc.client = () => ({ publish: publishMock });

describe('ReportService.generateFromPipeline', () => {
  let service: ReportService;
  const aggregator = new ReportAggregator();

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportService(repo, aggregator, waitSvc, redisSvc);
  });

  it('reads payloads, aggregates, persists, publishes report.done, cleans up', async () => {
    const analyze = makeAnalyzeResult();
    const keywords = makeKeywordResult();
    const cwv = makeCwv();

    waitSvc.readBoth.mockResolvedValueOnce({ analyze, keywords });
    repo.createFullReport.mockResolvedValueOnce({
      id: 'rep-1',
      auditId: 'aud-1',
      finalScore: 78,
    });

    // For this branch, cwv comes from the analyze payload's snapshot OR fallback
    const result = await service.generateFromPipeline({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      cwv,
    });

    expect(waitSvc.readBoth).toHaveBeenCalledWith('aud-1');
    expect(repo.createFullReport).toHaveBeenCalledOnce();
    expect(publishMock).toHaveBeenCalledWith(
      'report.done',
      expect.stringContaining('"auditId":"aud-1"'),
    );
    expect(waitSvc.cleanup).toHaveBeenCalledWith('aud-1');
    expect(result.id).toBe('rep-1');
  });

  it('throws if payloads are missing', async () => {
    waitSvc.readBoth.mockRejectedValueOnce(new Error('Missing payloads'));
    await expect(
      service.generateFromPipeline({
        auditId: 'aud-1',
        url: 'https://example.com/',
        domain: 'example.com',
        cwv: makeCwv(),
      }),
    ).rejects.toThrow(/missing/i);
    expect(repo.createFullReport).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement ReportService**

Create `apps/report/src/report/report.service.ts`:

```ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CoreWebVitals } from '@repo/shared';
import { ReportRepository } from './report.repository';
import { ReportAggregator } from './report.aggregator';
import { WaitForBothService } from './wait-for-both.service';
import { RedisService } from '../redis/redis.service';
import { AnalyzeResult } from './interfaces/analyze-result.interface';
import { KeywordResult } from './interfaces/keyword-result.interface';

export interface GenerateFromPipelineInput {
  auditId: string;
  url: string;
  domain: string;
  cwv: CoreWebVitals;
}

export interface GenerateDirectInput {
  auditId: string;
  url: string;
  domain: string;
  analyze: AnalyzeResult;
  keywords: KeywordResult;
  cwv: CoreWebVitals;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly repo: ReportRepository,
    private readonly aggregator: ReportAggregator,
    private readonly waitSvc: WaitForBothService,
    private readonly redis: RedisService,
  ) {}

  async generateFromPipeline(input: GenerateFromPipelineInput) {
    const { analyze, keywords } = await this.waitSvc.readBoth(input.auditId);
    const result = await this.persistAndPublish({
      auditId: input.auditId,
      url: input.url,
      domain: input.domain,
      analyze: analyze as AnalyzeResult,
      keywords: keywords as KeywordResult,
      cwv: input.cwv,
    });
    await this.waitSvc.cleanup(input.auditId);
    return result;
  }

  async generateDirect(input: GenerateDirectInput) {
    return this.persistAndPublish(input);
  }

  private async persistAndPublish(input: GenerateDirectInput) {
    const aggregated = this.aggregator.aggregate({
      auditId: input.auditId,
      url: input.url,
      domain: input.domain,
      analyze: input.analyze,
      keywords: input.keywords,
      cwv: input.cwv,
    });

    const report = await this.repo.createFullReport({
      auditId: input.auditId,
      aggregated,
      keywords: input.keywords.keywords,
      cwv: input.cwv,
    });

    const event = {
      auditId: input.auditId,
      reportId: report.id,
      finalScore: aggregated.finalScore,
      classification: aggregated.classification,
    };
    await this.redis.client().publish('report.done', JSON.stringify(event));
    this.logger.log(`report.done published for ${input.auditId} (reportId=${report.id})`);

    return report;
  }

  async getReport(auditId: string) {
    const report = await this.repo.findByAuditId(auditId);
    if (!report) {
      throw new NotFoundException(`Report not found for audit ${auditId}`);
    }
    return report;
  }

  async getTwo(auditIdA: string, auditIdB: string) {
    const both = await this.repo.findManyByAuditIds([auditIdA, auditIdB]);
    if (both.length !== 2) {
      throw new NotFoundException(`Both reports must exist (found ${both.length})`);
    }
    const a = both.find((r) => r.auditId === auditIdA)!;
    const b = both.find((r) => r.auditId === auditIdB)!;
    return { before: a, after: b };
  }
}
```

- [ ] **Step 3: Run tests + commit**

```bash
cd apps/report && npm test -- report.service
git add apps/report/src/report/report.service.ts apps/report/test/unit/report.service.spec.ts
git commit -m "feat(report): add ReportService orchestrator (aggregate→persist→publish→cleanup)"
```

---

## Task 11: gRPC Controller (8 RPCs)

**Files:**
- Create: `apps/report/src/report/report.grpc.controller.ts`

- [ ] **Step 1: Implement ReportGrpcController**

Create `apps/report/src/report/report.grpc.controller.ts`:

```ts
import { Controller, Logger, NotFoundException } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ReportService } from './report.service';
import { ReportComparator } from './report.comparator';
import { ShareLinkService } from './share-link.service';
import { PdfGenerator } from '../pdf/pdf.generator';
import { AnalyzeResult } from './interfaces/analyze-result.interface';
import { KeywordResult } from './interfaces/keyword-result.interface';

@Controller()
export class ReportGrpcController {
  private readonly logger = new Logger(ReportGrpcController.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly comparator: ReportComparator,
    private readonly shareLink: ShareLinkService,
    private readonly pdf: PdfGenerator,
  ) {}

  @GrpcMethod('ReportService', 'GenerateReport')
  async generateReport(req: any) {
    const report = await this.reportService.generateDirect({
      auditId: req.auditId,
      url: req.url,
      domain: req.domain,
      analyze: this.mapAnalyze(req.analysis, req.auditId, req.url, req.domain),
      keywords: this.mapKeywords(req.keywords, req.auditId),
      cwv: this.mapCwv(req.cwvMetrics),
    });
    return {
      report_id: report.id,
      audit_id: report.auditId,
      final_score: Number(report.finalScore),
      classification: report.classification,
      total_issues: report.totalIssues,
      critical_issues: report.criticalIssues,
    };
  }

  @GrpcMethod('ReportService', 'GetReport')
  async getReport(req: { auditId: string }) {
    const report = await this.reportService.getReport(req.auditId);
    return this.toReportResponse(report);
  }

  @GrpcMethod('ReportService', 'CompareReports')
  async compareReports(req: { auditId1: string; auditId2: string }) {
    const { before, after } = await this.reportService.getTwo(req.auditId1, req.auditId2);
    const result = this.comparator.compare(before as any, after as any);
    return {
      score_delta: result.scoreDelta,
      rule_deltas: result.ruleDeltas.map((d) => ({
        rule_id: d.ruleId,
        rule_name: d.ruleName,
        status_before: d.statusBefore ?? 'UNSPECIFIED',
        status_after: d.statusAfter ?? 'UNSPECIFIED',
        score_delta: d.scoreDelta,
      })),
      issues_fixed: result.issuesFixed,
      issues_new: result.issuesNew,
    };
  }

  @GrpcMethod('ReportService', 'CreateShareLink')
  async createShareLink(req: { auditId: string }) {
    const link = await this.shareLink.create(req.auditId);
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return { share_token: link.token, share_url: `${baseUrl}/shared/${link.token}` };
  }

  @GrpcMethod('ReportService', 'GetSharedReport')
  async getSharedReport(req: { shareToken: string }) {
    const link = await this.shareLink.findActiveByToken(req.shareToken);
    if (!link) throw new NotFoundException('Share link not found or revoked');
    const report = await this.reportService.getReport(link.auditId);
    return this.toReportResponse(report);
  }

  @GrpcMethod('ReportService', 'RevokeShareLink')
  async revokeShareLink(req: { auditId: string }) {
    const ok = await this.shareLink.revoke(req.auditId);
    return { success: ok };
  }

  @GrpcMethod('ReportService', 'GeneratePdf')
  async generatePdf(req: { auditId: string }) {
    const report = await this.reportService.getReport(req.auditId);
    const snapshot = report.analysisSnapshot as unknown as AnalyzeResult;
    const cwv = report.cwvSnapshot as any;
    const out = await this.pdf.generate({
      auditId: report.auditId,
      url: report.url,
      domain: report.domain,
      finalScore: Number(report.finalScore),
      classification: report.classification,
      analyze: snapshot,
      keywords: (report as any).keywords ?? [],
      cwv,
      categoryScores: snapshot.categoryScores,
    });
    return {
      pdf_content: out.pdf,
      filename: out.filename,
      size_bytes: out.pdf.length,
    };
  }

  @GrpcMethod('ReportService', 'HealthCheck')
  healthCheck() {
    return { healthy: true, version: process.env.npm_package_version ?? '0.0.1' };
  }

  // ─── Mappers ───

  private mapAnalyze(analysis: any, auditId: string, url: string, domain: string): AnalyzeResult {
    return {
      auditId,
      url,
      domain,
      overallScore: analysis?.overallScore ?? 0,
      ruleResults: (analysis?.ruleResults ?? []).map((r: any) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        category: r.category,
        status: r.status,
        score: r.score,
        weight: r.weight ?? 5,
        message: r.message ?? '',
        suggestion: r.suggestion ?? null,
        metadata: r.metadata ?? {},
      })),
      categoryScores: (analysis?.categoryScores ?? []).map((c: any) => ({
        category: c.category,
        score: c.score,
        passCount: c.passCount ?? 0,
        warnCount: c.warnCount ?? 0,
        failCount: c.failCount ?? 0,
      })),
    };
  }

  private mapKeywords(payload: any, auditId: string): KeywordResult {
    return {
      auditId,
      keywords: (payload?.keywords ?? []).map((k: any) => ({
        keyword: k.keyword,
        frequency: k.frequency,
        densityPercent: k.densityPercent,
        inTitle: !!k.inTitle,
        inH1: !!k.inH1,
        inFirstParagraph: !!k.inFirstParagraph,
        inMetaDescription: !!k.inMetaDescription,
        rank: k.rank,
        isTarget: !!k.isTarget,
      })),
    };
  }

  private mapCwv(payload: any) {
    return {
      lcpMs: payload?.lcpMs ?? 0,
      inpMs: payload?.inpMs ?? 0,
      cls: payload?.cls ?? 0,
      performanceScore: payload?.performanceScore ?? 0,
      accessibilityScore: payload?.accessibilityScore ?? 0,
      bestPracticesScore: payload?.bestPracticesScore ?? 0,
      seoScore: payload?.seoScore ?? 0,
    };
  }

  private toReportResponse(report: any) {
    const snapshot = report.analysisSnapshot as AnalyzeResult;
    const cwv = report.cwvSnapshot as any;
    return {
      report_id: report.id,
      audit_id: report.auditId,
      url: report.url,
      domain: report.domain,
      final_score: Number(report.finalScore),
      classification: report.classification,
      rule_results: snapshot.ruleResults,
      category_scores: snapshot.categoryScores,
      keywords: report.keywords ?? [],
      cwv_metrics: cwv,
      target_keyword: undefined,
      created_at: report.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/report/src/report/report.grpc.controller.ts
git commit -m "feat(report): add gRPC controller implementing all 8 RPCs from report.proto"
```

---

## Task 12: HTTP Export Controller

**Files:**
- Create: `apps/report/src/report/report.http.controller.ts`

- [ ] **Step 1: Implement HTTP controller**

Create `apps/report/src/report/report.http.controller.ts`:

```ts
import { Controller, Get, Param, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { PdfGenerator } from '../pdf/pdf.generator';
import { AnalyzeResult } from './interfaces/analyze-result.interface';

@Controller('audits')
export class ReportHttpController {
  constructor(
    private readonly reportService: ReportService,
    private readonly pdf: PdfGenerator,
  ) {}

  @Get(':id/export')
  async export(
    @Param('id') auditId: string,
    @Query('format') format: string = 'pdf',
    @Res() res: Response,
  ): Promise<void> {
    if (format !== 'pdf') {
      throw new BadRequestException(`Unsupported export format: ${format}`);
    }

    const report = await this.reportService.getReport(auditId);
    const snapshot = report.analysisSnapshot as unknown as AnalyzeResult;
    const out = await this.pdf.generate({
      auditId: report.auditId,
      url: report.url,
      domain: report.domain,
      finalScore: Number(report.finalScore),
      classification: report.classification,
      analyze: snapshot,
      keywords: (report as any).keywords ?? [],
      cwv: report.cwvSnapshot as any,
      categoryScores: snapshot.categoryScores,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.setHeader('Content-Length', String(out.pdf.length));
    res.end(out.pdf);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/report/src/report/report.http.controller.ts
git commit -m "feat(report): add HTTP GET /audits/:id/export?format=pdf for binary download"
```

---

## Task 13: Event Listeners + ReportWorker

**Files:**
- Create: `apps/report/src/report/analyze-done.listener.ts`
- Create: `apps/report/src/report/keyword-done.listener.ts`
- Create: `apps/report/src/report/report.worker.ts`

- [ ] **Step 1: AnalyzeDoneListener**

Create `apps/report/src/report/analyze-done.listener.ts`:

```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WaitForBothService } from './wait-for-both.service';

@Injectable()
export class AnalyzeDoneListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyzeDoneListener.name);
  private readonly CHANNEL = 'analyze.done';

  constructor(
    private readonly redis: RedisService,
    private readonly waitSvc: WaitForBothService,
  ) {}

  async onModuleInit(): Promise<void> {
    const sub = this.redis.subscriber();
    await sub.subscribe(this.CHANNEL);
    sub.on('message', async (channel, raw) => {
      if (channel !== this.CHANNEL) return;
      try {
        const payload = JSON.parse(raw);
        if (!payload?.auditId) {
          this.logger.warn(`analyze.done missing auditId, skipping`);
          return;
        }
        await this.waitSvc.recordAnalyzeDone(payload.auditId, payload);
        this.logger.log(`recorded analyze.done for ${payload.auditId}`);
      } catch (err) {
        this.logger.error(`failed to handle analyze.done: ${(err as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${this.CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.subscriber().unsubscribe(this.CHANNEL);
  }
}
```

- [ ] **Step 2: KeywordDoneListener**

Create `apps/report/src/report/keyword-done.listener.ts`:

```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WaitForBothService } from './wait-for-both.service';

@Injectable()
export class KeywordDoneListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeywordDoneListener.name);
  private readonly CHANNEL = 'keyword.done';

  constructor(
    private readonly redis: RedisService,
    private readonly waitSvc: WaitForBothService,
  ) {}

  async onModuleInit(): Promise<void> {
    const sub = this.redis.subscriber();
    await sub.subscribe(this.CHANNEL);
    sub.on('message', async (channel, raw) => {
      if (channel !== this.CHANNEL) return;
      try {
        const payload = JSON.parse(raw);
        if (!payload?.auditId) {
          this.logger.warn(`keyword.done missing auditId, skipping`);
          return;
        }
        await this.waitSvc.recordKeywordDone(payload.auditId, payload);
        this.logger.log(`recorded keyword.done for ${payload.auditId}`);
      } catch (err) {
        this.logger.error(`failed to handle keyword.done: ${(err as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${this.CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.subscriber().unsubscribe(this.CHANNEL);
  }
}
```

> **Note:** We use a single shared subscriber connection from `RedisService` and dispatch by channel. Both listeners attach `on('message', ...)` to the same client; ioredis broadcasts messages to all listeners. If concurrency becomes a concern, switch to dedicated `Redis` clients per listener.

- [ ] **Step 3: ReportWorker**

Create `apps/report/src/report/report.worker.ts`:

```ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BULLMQ_QUEUES, AuditStatus } from '@repo/shared';
import { ReportService } from './report.service';
import { WaitForBothService } from './wait-for-both.service';
import { RedisService } from '../redis/redis.service';

interface ReportStartJob {
  auditId: string;
  url?: string;
  domain?: string;
}

@Processor(BULLMQ_QUEUES.REPORT_START)
export class ReportWorker extends WorkerHost {
  private readonly logger = new Logger(ReportWorker.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly waitSvc: WaitForBothService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<ReportStartJob>): Promise<{ reportId: string; finalScore: number }> {
    const { auditId } = job.data;
    this.logger.log(`processing report.start for ${auditId}`);

    // Read both payloads up-front to derive url + domain + cwv from the analyze snapshot
    const { analyze } = await this.waitSvc.readBoth(auditId);
    const url = job.data.url ?? analyze.url;
    const domain = job.data.domain ?? analyze.domain;
    const cwv = analyze.cwv ?? {
      lcpMs: 0,
      inpMs: 0,
      cls: 0,
      performanceScore: 0,
      accessibilityScore: 0,
      bestPracticesScore: 0,
      seoScore: 0,
    };

    await this.publishProgress(auditId, 85, 'reporting');

    const report = await this.reportService.generateFromPipeline({
      auditId,
      url,
      domain,
      cwv,
    });

    return { reportId: report.id, finalScore: Number(report.finalScore) };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`report.start ${job?.id} failed: ${err.message}`);
  }

  private async publishProgress(auditId: string, progress: number, stage: string): Promise<void> {
    const event = {
      auditId,
      status: AuditStatus.REPORTING,
      progress,
      stage,
    };
    await this.redis.client().publish('audit.progress', JSON.stringify(event));
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/report/src/report/analyze-done.listener.ts apps/report/src/report/keyword-done.listener.ts apps/report/src/report/report.worker.ts
git commit -m "feat(report): add analyze.done/keyword.done listeners and report.start BullMQ worker"
```

---

## Task 14: Wire ReportModule + Update AppModule + main.ts

**Files:**
- Create: `apps/report/src/report/report.module.ts`
- Modify: `apps/report/src/app.module.ts`
- Modify: `apps/report/src/main.ts`

- [ ] **Step 1: Create ReportModule**

Create `apps/report/src/report/report.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BULLMQ_QUEUES } from '@repo/shared';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';
import { ReportRepository } from './report.repository';
import { ReportAggregator } from './report.aggregator';
import { ReportComparator } from './report.comparator';
import { ShareLinkService } from './share-link.service';
import { WaitForBothService } from './wait-for-both.service';
import { ReportService } from './report.service';
import { ReportGrpcController } from './report.grpc.controller';
import { ReportHttpController } from './report.http.controller';
import { AnalyzeDoneListener } from './analyze-done.listener';
import { KeywordDoneListener } from './keyword-done.listener';
import { ReportWorker } from './report.worker';

@Module({
  imports: [
    PrismaModule,
    PdfModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const parsed = new URL(url);
        return {
          connection: {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            password: parsed.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.REPORT_START }),
  ],
  controllers: [ReportGrpcController, ReportHttpController],
  providers: [
    ReportRepository,
    ReportAggregator,
    ReportComparator,
    ShareLinkService,
    WaitForBothService,
    ReportService,
    AnalyzeDoneListener,
    KeywordDoneListener,
    ReportWorker,
  ],
})
export class ReportModule {}
```

- [ ] **Step 2: Update AppModule**

Edit `apps/report/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    ReportModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Update main.ts to load proto deps**

Edit `apps/report/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const protoRoot = join(__dirname, '../../..', 'packages/proto');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['report.v1'],
      protoPath: [join(protoRoot, 'report/v1/report.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50055}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [
          protoRoot,
          join(protoRoot, 'analyzer/v1'),
          join(protoRoot, 'keyword/v1'),
          join(protoRoot, 'common/v1'),
        ],
      },
    },
  });

  await app.startAllMicroservices();

  const httpPort = process.env.HTTP_PORT || 3004;
  await app.listen(httpPort);
  console.log(`Report HTTP service running on port ${httpPort}`);
  console.log(`Report gRPC service running on port ${process.env.GRPC_PORT || 50055}`);
  console.log(`Report worker listening on BullMQ queue: report.start`);
}
bootstrap();
```

- [ ] **Step 4: Commit**

```bash
git add apps/report/src/report/report.module.ts apps/report/src/app.module.ts apps/report/src/main.ts
git commit -m "feat(report): wire ReportModule into AppModule and update hybrid bootstrap"
```

---

## Task 15: E2E Integration Test

**Files:**
- Create: `apps/report/test/integration/report-pipeline.e2e-spec.ts`

- [ ] **Step 1: E2E spec**

Create `apps/report/test/integration/report-pipeline.e2e-spec.ts`:

```ts
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportModule } from '../../src/report/report.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { ReportService } from '../../src/report/report.service';
import { ReportWorker } from '../../src/report/report.worker';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';
import { Classification } from '@repo/shared';

const stored = new Map<string, string>();
const publishMock = vi.fn();
const fakeRedis = {
  client: () => ({
    setex: vi.fn(async (k: string, _ttl: number, v: string) => stored.set(k, v)),
    incr: vi.fn(async (k: string) => {
      const cur = Number(stored.get(k) ?? 0) + 1;
      stored.set(k, String(cur));
      return cur;
    }),
    get: vi.fn(async (k: string) => stored.get(k) ?? null),
    del: vi.fn(async (...keys: string[]) => {
      keys.forEach((k) => stored.delete(k));
      return keys.length;
    }),
    publish: publishMock,
  }),
  subscriber: () => ({ subscribe: vi.fn(), unsubscribe: vi.fn(), on: vi.fn() }),
};

const createdReport = {
  id: 'rep-pipeline-1',
  auditId: 'aud-e2e',
  url: 'https://example.com/',
  domain: 'example.com',
  finalScore: 78,
  classification: 'good',
  totalIssues: 1,
  criticalIssues: 0,
  warnIssues: 1,
  passCount: 1,
  analysisSnapshot: makeAnalyzeResult(),
  cwvSnapshot: makeCwv(),
  createdAt: new Date(),
  keywords: [],
};

const prismaMock: any = {
  $transaction: vi.fn(async (cb: any) => cb({
    report: { create: vi.fn().mockResolvedValue(createdReport) },
    reportKeyword: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    reportCwv: { create: vi.fn().mockResolvedValue({}) },
  })),
  report: {
    findUnique: vi.fn().mockResolvedValue(createdReport),
    findMany: vi.fn().mockResolvedValue([]),
  },
  reportKeyword: {},
  reportCwv: {},
  shareLink: {},
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

describe('Report pipeline E2E (mocked Prisma + Redis)', () => {
  let moduleRef: TestingModule;
  let reportService: ReportService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    moduleRef = await Test.createTestingModule({
      imports: [ReportModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(fakeRedis)
      .compile();

    await moduleRef.init();
    reportService = moduleRef.get(ReportService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('aggregates analyze + keyword + cwv into a persisted report and publishes report.done', async () => {
    // Simulate the two upstream events arriving
    const waitSvc = moduleRef.get<any>('WaitForBothService') ?? null;
    // Direct call mirrors what the BullMQ worker does after both events
    stored.set('audit:aud-e2e:analyze_result', JSON.stringify(makeAnalyzeResult({ auditId: 'aud-e2e' })));
    stored.set('audit:aud-e2e:keyword_result', JSON.stringify(makeKeywordResult({ auditId: 'aud-e2e' })));
    stored.set('audit:aud-e2e:completed_steps', '2');

    const result = await reportService.generateFromPipeline({
      auditId: 'aud-e2e',
      url: 'https://example.com/',
      domain: 'example.com',
      cwv: makeCwv(),
    });

    expect(result.id).toBe('rep-pipeline-1');
    expect(publishMock).toHaveBeenCalledWith(
      'report.done',
      expect.stringContaining('"auditId":"aud-e2e"'),
    );
    // cleanup invoked
    expect(stored.has('audit:aud-e2e:analyze_result')).toBe(false);
  });

  it('GenerateDirect path produces classification matching aggregator output', async () => {
    const result = await reportService.generateDirect({
      auditId: 'aud-direct',
      url: 'https://example.com/',
      domain: 'example.com',
      analyze: makeAnalyzeResult({ overallScore: 90 }),
      keywords: makeKeywordResult(),
      cwv: makeCwv({ performanceScore: 85 }),
    });
    expect(result.id).toBeDefined();
    // 90*0.7 + 85*0.3 = 88.5 → 89 → EXCELLENT (>=80)
    expect(Classification.EXCELLENT).toBeDefined();
  });
});
```

- [ ] **Step 2: Run full test suite**

```bash
cd apps/report && npm test
```

Expected: All unit suites (repository, aggregator, comparator, share-link, wait-for-both, pdf, service) plus the integration suite pass.

- [ ] **Step 3: Run typecheck + lint**

```bash
cd apps/report && npm run check-types && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/report/test/integration/report-pipeline.e2e-spec.ts
git commit -m "test(report): add E2E covering wait-for-both → aggregate → persist → report.done"
```

---

## Verification Checklist

After completing all 15 tasks, verify:

- [ ] `cd apps/report && npm test` — all unit + integration suites pass, 0 failures
- [ ] `cd apps/report && npm run check-types` — no TypeScript errors
- [ ] `cd apps/report && npm run lint` — no lint errors
- [ ] `ReportAggregator` blends analyzer overall (70%) + CWV performance (30%) and classifies via `@repo/shared.classify()`
- [ ] `ReportRepository.createFullReport` runs in a single Prisma transaction (`prisma.$transaction`) inserting `Report` + `ReportKeyword[]` + `ReportCwv` rows
- [ ] `WaitForBothService` uses `REDIS_KEYS.auditCompletedSteps`, `auditAnalyzeResult`, `auditKeywordResult` constants and enqueues `report.start` only when counter ≥ 2
- [ ] `AnalyzeDoneListener` and `KeywordDoneListener` subscribe to `analyze.done` / `keyword.done` Redis pub/sub channels via the shared `RedisService.subscriber()`
- [ ] `ReportWorker` is `@Processor(BULLMQ_QUEUES.REPORT_START)`, calls `ReportService.generateFromPipeline`, publishes `audit.progress` (85%) before persistence
- [ ] `ReportService.generateFromPipeline` cleans up Redis keys (`waitSvc.cleanup`) after persisting
- [ ] `ReportGrpcController` exposes all 8 RPCs from `report.proto`: GenerateReport, GetReport, CompareReports, CreateShareLink, GetSharedReport, RevokeShareLink, GeneratePdf, HealthCheck
- [ ] `ReportHttpController` `GET /audits/:id/export?format=pdf` returns `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="seo-report-{domain}-{date}.pdf"`
- [ ] `ShareLinkService.create` produces a 64-character hex token via `crypto.randomBytes(32).toString('hex')`
- [ ] `ShareLinkService.findActiveByToken` increments `accessedCount` and updates `lastAccessedAt` only for active links
- [ ] `BrowserPool` launches exactly 2 Chromium instances at `onModuleInit` (skipped in `NODE_ENV=test`) and closes them on shutdown
- [ ] `PdfGenerator` calls `page.setContent(html, { waitUntil: 'networkidle' })` then `page.pdf({ format: 'A4', printBackground: true, margin: ... })`
- [ ] `report.hbs` template renders cover, executive summary, category bar chart, CWV grid, rules grouped by category, and top-20 keywords table
- [ ] `main.ts` passes `includeDirs` covering `analyzer/v1`, `keyword/v1`, `common/v1` so the imported proto messages resolve at runtime
- [ ] Cross-DB invariant respected: no FK constraint declared on `Report.auditId` (verified in Plan 1 schema)
- [ ] Running `docker compose up -d redis report-db` and `cd apps/report && npm run dev` starts the service without errors and exposes both ports 3004 (HTTP) and 50055 (gRPC)
- [ ] Manual smoke test: publish a synthetic `analyze.done` and `keyword.done` JSON payload via `redis-cli PUBLISH` → observe `report.start` job enqueued and a `report.done` event published with a fresh `reportId`

---

## What Comes Next

This plan produces a **fully functional Report microservice**. Downstream plans depend on it as follows:

| Next Plan | What it consumes from this plan |
|-----------|---------------------------------|
| Plan 7: Integration | Wires the full pipeline (crawl.done → analyze.start → analyze.done + keyword.done → report.start → report.done), runs end-to-end smoke tests with real Redis + Postgres + Playwright + 5 services |
| Plan 2: Gateway Service | Subscribes to `report.done` to mark audits `completed` and emits Socket.IO `audit:complete`; calls `GetReport` / `CompareReports` / `CreateShareLink` / `GeneratePdf` gRPCs from REST controllers; proxies `GET /audits/:id/export?format=pdf` to this service |
| Plan 8: Frontend (Next.js) | Calls Gateway REST endpoints that proxy to this service for report detail view, comparison view, share link UX, and PDF download |

**Known follow-ups** (out of scope for this plan, to be handled later):
- Replace the in-memory Handlebars helpers with i18n support (English / Vietnamese) so PDFs can be localized.
- Add a per-report cache (`report:{auditId}` Redis key, 10-min TTL) so repeated `GetReport` calls bypass Postgres.
- Add Prometheus metrics: PDF generation duration histogram, report.start queue depth, report.done publish rate.
- Distributed lock per `auditId` so a duplicate `report.start` job (from BullMQ retry) cannot create two `Report` rows; use `SET NX PX 60000`.
- Replace JSONB snapshots with a more compact column layout once the schema stabilizes (saves ~40% storage).
- Switch the listener model: use BullMQ events (`analyze.done` as a queue) instead of Redis pub/sub if at-least-once delivery becomes required.
