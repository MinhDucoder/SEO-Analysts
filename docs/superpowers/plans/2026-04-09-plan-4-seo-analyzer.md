# Plan 4: SEO Analyzer Service Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow TDD — where a Vitest spec file is listed before the implementation file, write the test first, watch it fail, then implement.

**Goal:** Implement the complete SEO Analyzer business logic on top of the scaffold produced by Plan 1 — a rule engine with 20 rules, weighted scoring, a gRPC controller exposing all 5 RPCs defined in `analyzer.proto`, and a BullMQ worker that consumes `analyze.start` and emits `analyze.done`.

**Architecture:** The analyzer receives a `PageData` (either via gRPC `AnalyzePage` or via a BullMQ job from the orchestrator). A `RuleRunner` loads all enabled `SeoRule` records from PostgreSQL, resolves each rule name to a concrete `ISeoRule` implementation via `RuleRegistry`, calls `rule.check(pageData, targetKeyword)`, persists `RuleResult` rows, computes weighted overall + per-category scores via `ScoreCalculator`, and returns an `AnalyzeResponse`. The BullMQ worker is a thin wrapper that calls the same `AnalyzerService.analyze()` method and publishes the result to the `analyze.done` event stream (Redis).

**Tech Stack:** NestJS 10 (microservice), @nestjs/microservices (gRPC), @nestjs/bullmq 10, BullMQ 5, Prisma 5, Vitest 2, ioredis 5.

**Reference Spec:** `docs/superpowers/specs/2026-04-09-microservices-architecture-design.md` section 6 "Core Logic — SEO Rule Engine" (the 20 rules detailed scoring logic).

**Depends on:** Plan 1 (Foundation) — complete. The scaffold already provides `apps/seo-analyzer/src/main.ts` (gRPC bootstrap on port 50053), `AppModule`, `PrismaModule`, and the seeded 20 rules in `analyzer-db`.

---

## File Structure

Files produced by this plan (new, unless noted):

```
apps/seo-analyzer/
├── src/
│   ├── app.module.ts                          # MODIFY — wire AnalyzerModule
│   ├── main.ts                                # MODIFY — add BullMQ worker bootstrap
│   ├── analyzer/
│   │   ├── analyzer.module.ts
│   │   ├── analyzer.service.ts                # orchestrator: loadRules + run + persist + score
│   │   ├── analyzer.controller.ts             # gRPC controller (5 RPCs)
│   │   ├── analyzer.worker.ts                 # BullMQ processor for analyze.start
│   │   ├── rule-registry.ts
│   │   ├── rule-runner.ts
│   │   ├── score-calculator.ts
│   │   ├── interfaces/
│   │   │   ├── seo-rule.interface.ts          # ISeoRule, RuleCheckOutput
│   │   │   └── page-data.interface.ts         # PageData TS type (mirrors proto)
│   │   ├── rules/
│   │   │   ├── index.ts                       # barrel export + registerAllRules()
│   │   │   ├── meta/
│   │   │   │   ├── title-tag.rule.ts
│   │   │   │   ├── meta-description.rule.ts
│   │   │   │   ├── open-graph.rule.ts
│   │   │   │   └── twitter-card.rule.ts
│   │   │   ├── headings/
│   │   │   │   ├── h1-tag.rule.ts
│   │   │   │   └── heading-hierarchy.rule.ts
│   │   │   ├── images/
│   │   │   │   ├── image-alt.rule.ts
│   │   │   │   └── image-optimization.rule.ts
│   │   │   ├── links/
│   │   │   │   ├── internal-links.rule.ts
│   │   │   │   └── external-links.rule.ts
│   │   │   ├── technical/
│   │   │   │   ├── canonical-url.rule.ts
│   │   │   │   ├── robots-meta.rule.ts
│   │   │   │   ├── viewport-meta.rule.ts
│   │   │   │   ├── https-check.rule.ts
│   │   │   │   ├── schema-org.rule.ts
│   │   │   │   ├── http-status.rule.ts
│   │   │   │   ├── url-structure.rule.ts
│   │   │   │   ├── language-tag.rule.ts
│   │   │   │   └── favicon.rule.ts
│   │   │   └── performance/
│   │   │       └── page-size.rule.ts
│   │   └── test-fixtures/
│   │       └── page-data.fixture.ts           # reusable fake PageData builders
├── test/
│   ├── unit/
│   │   ├── rule-registry.spec.ts
│   │   ├── rule-runner.spec.ts
│   │   ├── score-calculator.spec.ts
│   │   └── rules/
│   │       ├── meta.spec.ts
│   │       ├── headings.spec.ts
│   │       ├── images.spec.ts
│   │       ├── links.spec.ts
│   │       ├── technical.spec.ts
│   │       └── performance.spec.ts
│   └── integration/
│       └── analyze-page.e2e-spec.ts
└── vitest.config.ts                            # CREATE if not present
```

---

## Task 1: Rule Engine Core (ISeoRule, RuleRegistry, RuleRunner)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/interfaces/seo-rule.interface.ts`
- Create: `apps/seo-analyzer/src/analyzer/interfaces/page-data.interface.ts`
- Create: `apps/seo-analyzer/src/analyzer/rule-registry.ts`
- Create: `apps/seo-analyzer/src/analyzer/rule-runner.ts`
- Create: `apps/seo-analyzer/src/analyzer/test-fixtures/page-data.fixture.ts`
- Create: `apps/seo-analyzer/test/unit/rule-registry.spec.ts`
- Create: `apps/seo-analyzer/test/unit/rule-runner.spec.ts`
- Create: `apps/seo-analyzer/vitest.config.ts`

- [ ] **Step 1: Create vitest.config.ts**

Create `apps/seo-analyzer/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/analyzer/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/interfaces/**', '**/test-fixtures/**'],
    },
  },
  resolve: {
    alias: {
      '@analyzer': resolve(__dirname, 'src/analyzer'),
    },
  },
});
```

- [ ] **Step 2: Define ISeoRule interface and PageData TS type**

Create `apps/seo-analyzer/src/analyzer/interfaces/seo-rule.interface.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { PageData } from './page-data.interface';

export interface RuleCheckOutput {
  status: CheckStatus;
  score: number; // 0 | 50 | 100
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}

export interface ISeoRule {
  readonly id: string; // unique rule name, e.g. "title_tag"
  readonly category: IssueCategory;
  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput;
}
```

Create `apps/seo-analyzer/src/analyzer/interfaces/page-data.interface.ts`:

```ts
import { ImageInfo, LinkInfo } from '@repo/shared';

export interface PageData {
  url: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  htmlSizeBytes: number;
  title?: string;
  metaDescription?: string;
  metaRobots?: string;
  canonicalUrl?: string;
  language?: string;
  faviconUrl?: string;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  h4Tags: string[];
  h5Tags: string[];
  h6Tags: string[];
  images: ImageInfo[];
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
  schemaJsonLd: string[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  isHttps: boolean;
  redirectChain: string[];
  contentEncoding: string;
  cacheControl: string;
  viewportContent?: string;
  textContent: string;
  rawHtml: string;
}
```

- [ ] **Step 3: Create page-data fixture builder**

Create `apps/seo-analyzer/src/analyzer/test-fixtures/page-data.fixture.ts`:

```ts
import { PageData } from '../interfaces/page-data.interface';

export function makePageData(overrides: Partial<PageData> = {}): PageData {
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    statusCode: 200,
    responseTimeMs: 250,
    htmlSizeBytes: 50_000,
    title: 'Example Domain — Testing Page Title Here',
    metaDescription:
      'This is a perfectly sized meta description used for testing purposes. It is between 120 and 160 characters long to satisfy the SEO rule check.',
    metaRobots: 'index,follow',
    canonicalUrl: 'https://example.com/',
    language: 'en',
    faviconUrl: 'https://example.com/favicon.ico',
    h1Tags: ['Main Heading'],
    h2Tags: ['Section A', 'Section B'],
    h3Tags: ['Sub A1'],
    h4Tags: [],
    h5Tags: [],
    h6Tags: [],
    images: [
      { src: '/a.webp', alt: 'A image', sizeBytes: 50_000, format: 'webp' },
    ],
    internalLinks: [
      { href: '/a', anchorText: 'A', isInternal: true, rel: null, statusCode: 200 },
      { href: '/b', anchorText: 'B', isInternal: true, rel: null, statusCode: 200 },
      { href: '/c', anchorText: 'C', isInternal: true, rel: null, statusCode: 200 },
    ],
    externalLinks: [],
    schemaJsonLd: ['{"@context":"https://schema.org","@type":"WebPage"}'],
    openGraph: {
      'og:title': 'Example',
      'og:description': 'Desc',
      'og:image': 'https://example.com/og.png',
    },
    twitterCard: { 'twitter:card': 'summary' },
    isHttps: true,
    redirectChain: [],
    contentEncoding: 'gzip',
    cacheControl: 'public, max-age=3600',
    viewportContent: 'width=device-width, initial-scale=1',
    textContent: 'Example text content body of the page.',
    rawHtml: '<html lang="en"><head><title>Example</title></head><body></body></html>',
    ...overrides,
  };
}
```

- [ ] **Step 4: TDD — write RuleRegistry test first**

Create `apps/seo-analyzer/test/unit/rule-registry.spec.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { RuleRegistry } from '../../src/analyzer/rule-registry';
import { ISeoRule, RuleCheckOutput } from '../../src/analyzer/interfaces/seo-rule.interface';
import { CheckStatus, IssueCategory } from '@repo/shared';

class FakeRule implements ISeoRule {
  constructor(public readonly id: string, public readonly category: IssueCategory) {}
  check(): RuleCheckOutput {
    return { status: CheckStatus.PASS, score: 100, message: 'ok', suggestion: null, metadata: {} };
  }
}

describe('RuleRegistry', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = new RuleRegistry();
  });

  it('registers a rule and retrieves it by id', () => {
    const rule = new FakeRule('title_tag', IssueCategory.META);
    registry.register(rule);
    expect(registry.get('title_tag')).toBe(rule);
  });

  it('throws when registering duplicate id', () => {
    registry.register(new FakeRule('dup', IssueCategory.META));
    expect(() => registry.register(new FakeRule('dup', IssueCategory.META))).toThrow(
      /already registered/,
    );
  });

  it('returns undefined for unknown id', () => {
    expect(registry.get('nope')).toBeUndefined();
  });

  it('lists all rules via getAll', () => {
    registry.register(new FakeRule('a', IssueCategory.META));
    registry.register(new FakeRule('b', IssueCategory.HEADINGS));
    expect(registry.getAll().map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('filters by category via getByCategory', () => {
    registry.register(new FakeRule('a', IssueCategory.META));
    registry.register(new FakeRule('b', IssueCategory.META));
    registry.register(new FakeRule('c', IssueCategory.HEADINGS));
    expect(registry.getByCategory(IssueCategory.META).map((r) => r.id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 5: Implement RuleRegistry**

Create `apps/seo-analyzer/src/analyzer/rule-registry.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { IssueCategory } from '@repo/shared';
import { ISeoRule } from './interfaces/seo-rule.interface';

@Injectable()
export class RuleRegistry {
  private readonly rules = new Map<string, ISeoRule>();

  register(rule: ISeoRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule "${rule.id}" is already registered`);
    }
    this.rules.set(rule.id, rule);
  }

  get(id: string): ISeoRule | undefined {
    return this.rules.get(id);
  }

  getAll(): ISeoRule[] {
    return Array.from(this.rules.values());
  }

  getByCategory(category: IssueCategory): ISeoRule[] {
    return this.getAll().filter((r) => r.category === category);
  }

  clear(): void {
    this.rules.clear();
  }
}
```

Run `npm run test --workspace @seo/seo-analyzer` — RuleRegistry tests pass.

- [ ] **Step 6: TDD — write RuleRunner test first**

Create `apps/seo-analyzer/test/unit/rule-runner.spec.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { RuleRegistry } from '../../src/analyzer/rule-registry';
import { RuleRunner } from '../../src/analyzer/rule-runner';
import { ISeoRule, RuleCheckOutput } from '../../src/analyzer/interfaces/seo-rule.interface';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { makePageData } from '../../src/analyzer/test-fixtures/page-data.fixture';

function fakeRule(id: string, category: IssueCategory, status: CheckStatus, score: number): ISeoRule {
  return {
    id,
    category,
    check(): RuleCheckOutput {
      return { status, score, message: `${id}:${status}`, suggestion: null, metadata: {} };
    },
  };
}

describe('RuleRunner', () => {
  let registry: RuleRegistry;
  let runner: RuleRunner;

  beforeEach(() => {
    registry = new RuleRegistry();
    runner = new RuleRunner(registry);
  });

  it('runs every enabled DB rule whose name is in the registry', () => {
    registry.register(fakeRule('title_tag', IssueCategory.META, CheckStatus.PASS, 100));
    registry.register(fakeRule('h1_tag', IssueCategory.HEADINGS, CheckStatus.FAIL, 0));

    const dbRules = [
      { id: 'uuid-1', name: 'title_tag', category: IssueCategory.META, weight: 8 },
      { id: 'uuid-2', name: 'h1_tag', category: IssueCategory.HEADINGS, weight: 8 },
    ];

    const results = runner.runAll(makePageData(), dbRules);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ ruleName: 'title_tag', score: 100, weight: 8 });
    expect(results[1]).toMatchObject({ ruleName: 'h1_tag', score: 0, weight: 8 });
  });

  it('skips DB rules with no registered implementation and logs a warning', () => {
    registry.register(fakeRule('title_tag', IssueCategory.META, CheckStatus.PASS, 100));
    const dbRules = [
      { id: 'u1', name: 'title_tag', category: IssueCategory.META, weight: 8 },
      { id: 'u2', name: 'ghost_rule', category: IssueCategory.META, weight: 5 },
    ];
    const results = runner.runAll(makePageData(), dbRules);
    expect(results).toHaveLength(1);
    expect(results[0].ruleName).toBe('title_tag');
  });

  it('catches rule exceptions and records a fail result', () => {
    const brokenRule: ISeoRule = {
      id: 'broken',
      category: IssueCategory.META,
      check() {
        throw new Error('boom');
      },
    };
    registry.register(brokenRule);
    const dbRules = [{ id: 'u1', name: 'broken', category: IssueCategory.META, weight: 4 }];
    const results = runner.runAll(makePageData(), dbRules);
    expect(results[0].status).toBe(CheckStatus.FAIL);
    expect(results[0].score).toBe(0);
    expect(results[0].message).toMatch(/boom/);
  });
});
```

- [ ] **Step 7: Implement RuleRunner**

Create `apps/seo-analyzer/src/analyzer/rule-runner.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { CheckStatus, IssueCategory } from '@repo/shared';
import { RuleRegistry } from './rule-registry';
import { PageData } from './interfaces/page-data.interface';
import { RuleCheckOutput } from './interfaces/seo-rule.interface';

export interface DbRule {
  id: string;
  name: string;
  category: IssueCategory;
  weight: number;
}

export interface RunnerResult extends RuleCheckOutput {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  weight: number;
}

@Injectable()
export class RuleRunner {
  private readonly logger = new Logger(RuleRunner.name);

  constructor(private readonly registry: RuleRegistry) {}

  runAll(pageData: PageData, dbRules: DbRule[], targetKeyword?: string): RunnerResult[] {
    const out: RunnerResult[] = [];
    for (const db of dbRules) {
      const impl = this.registry.get(db.name);
      if (!impl) {
        this.logger.warn(`No implementation registered for rule "${db.name}" — skipping`);
        continue;
      }
      try {
        const result = impl.check(pageData, targetKeyword);
        out.push({
          ruleId: db.id,
          ruleName: db.name,
          category: db.category,
          weight: db.weight,
          ...result,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Rule "${db.name}" threw: ${msg}`);
        out.push({
          ruleId: db.id,
          ruleName: db.name,
          category: db.category,
          weight: db.weight,
          status: CheckStatus.FAIL,
          score: 0,
          message: `Rule execution error: ${msg}`,
          suggestion: null,
          metadata: { error: msg },
        });
      }
    }
    return out;
  }
}
```

Run tests — both RuleRegistry and RuleRunner suites should be green.

- [ ] **Step 8: Commit**

```bash
git add apps/seo-analyzer/vitest.config.ts apps/seo-analyzer/src/analyzer/interfaces apps/seo-analyzer/src/analyzer/rule-registry.ts apps/seo-analyzer/src/analyzer/rule-runner.ts apps/seo-analyzer/src/analyzer/test-fixtures apps/seo-analyzer/test/unit/rule-registry.spec.ts apps/seo-analyzer/test/unit/rule-runner.spec.ts
git commit -m "feat(analyzer): add ISeoRule contract, RuleRegistry and RuleRunner with unit tests"
```

---

## Task 2: Score Calculator

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/score-calculator.ts`
- Create: `apps/seo-analyzer/test/unit/score-calculator.spec.ts`

- [ ] **Step 1: TDD — write score calculator tests first**

Create `apps/seo-analyzer/test/unit/score-calculator.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ScoreCalculator } from '../../src/analyzer/score-calculator';
import { CheckStatus, Classification, IssueCategory } from '@repo/shared';
import type { RunnerResult } from '../../src/analyzer/rule-runner';

function r(overrides: Partial<RunnerResult>): RunnerResult {
  return {
    ruleId: overrides.ruleId ?? 'x',
    ruleName: overrides.ruleName ?? 'x',
    category: overrides.category ?? IssueCategory.META,
    weight: overrides.weight ?? 1,
    status: overrides.status ?? CheckStatus.PASS,
    score: overrides.score ?? 100,
    message: overrides.message ?? 'ok',
    suggestion: overrides.suggestion ?? null,
    metadata: overrides.metadata ?? {},
  };
}

describe('ScoreCalculator', () => {
  const calc = new ScoreCalculator();

  it('returns 0 overall for empty results', () => {
    expect(calc.overall([])).toBe(0);
  });

  it('computes weighted average overall score', () => {
    // 100*8 + 0*8 + 50*4 = 800 + 0 + 200 = 1000 / (8+8+4)=20  => 50
    const results = [
      r({ score: 100, weight: 8 }),
      r({ score: 0, weight: 8 }),
      r({ score: 50, weight: 4 }),
    ];
    expect(calc.overall(results)).toBe(50);
  });

  it('rounds overall to 2 decimals', () => {
    // 100*7 + 0*3 = 700 / 10 = 70.0
    const results = [r({ score: 100, weight: 7 }), r({ score: 0, weight: 3 })];
    expect(calc.overall(results)).toBe(70);
  });

  it('classifies scores correctly', () => {
    expect(calc.classify(95)).toBe(Classification.EXCELLENT);
    expect(calc.classify(80)).toBe(Classification.EXCELLENT);
    expect(calc.classify(79.9)).toBe(Classification.GOOD);
    expect(calc.classify(60)).toBe(Classification.GOOD);
    expect(calc.classify(40)).toBe(Classification.FAIR);
    expect(calc.classify(39.9)).toBe(Classification.POOR);
    expect(calc.classify(0)).toBe(Classification.POOR);
  });

  it('computes per-category scores with counts', () => {
    const results = [
      r({ category: IssueCategory.META, score: 100, weight: 8, status: CheckStatus.PASS }),
      r({ category: IssueCategory.META, score: 50, weight: 7, status: CheckStatus.WARN }),
      r({ category: IssueCategory.HEADINGS, score: 0, weight: 8, status: CheckStatus.FAIL }),
    ];
    const per = calc.perCategory(results);
    const meta = per.find((c) => c.category === IssueCategory.META)!;
    expect(meta.totalRules).toBe(2);
    expect(meta.passed).toBe(1);
    expect(meta.warned).toBe(1);
    expect(meta.failed).toBe(0);
    // (100*8 + 50*7)/(8+7) = (800+350)/15 = 76.67
    expect(meta.score).toBeCloseTo(76.67, 1);

    const headings = per.find((c) => c.category === IssueCategory.HEADINGS)!;
    expect(headings.failed).toBe(1);
    expect(headings.score).toBe(0);
  });
});
```

- [ ] **Step 2: Implement ScoreCalculator**

Create `apps/seo-analyzer/src/analyzer/score-calculator.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CheckStatus, Classification, IssueCategory } from '@repo/shared';
import type { RunnerResult } from './rule-runner';

export interface CategoryScore {
  category: IssueCategory;
  score: number;
  totalRules: number;
  passed: number;
  warned: number;
  failed: number;
}

@Injectable()
export class ScoreCalculator {
  overall(results: RunnerResult[]): number {
    if (results.length === 0) return 0;
    let totalWeighted = 0;
    let totalWeight = 0;
    for (const r of results) {
      totalWeighted += r.score * r.weight;
      totalWeight += r.weight;
    }
    if (totalWeight === 0) return 0;
    return Math.round((totalWeighted / totalWeight) * 100) / 100;
  }

  classify(score: number): Classification {
    if (score >= 80) return Classification.EXCELLENT;
    if (score >= 60) return Classification.GOOD;
    if (score >= 40) return Classification.FAIR;
    return Classification.POOR;
  }

  perCategory(results: RunnerResult[]): CategoryScore[] {
    const buckets = new Map<IssueCategory, RunnerResult[]>();
    for (const r of results) {
      if (!buckets.has(r.category)) buckets.set(r.category, []);
      buckets.get(r.category)!.push(r);
    }
    const out: CategoryScore[] = [];
    for (const [category, items] of buckets) {
      let weighted = 0;
      let weight = 0;
      let passed = 0;
      let warned = 0;
      let failed = 0;
      for (const it of items) {
        weighted += it.score * it.weight;
        weight += it.weight;
        if (it.status === CheckStatus.PASS) passed++;
        else if (it.status === CheckStatus.WARN) warned++;
        else if (it.status === CheckStatus.FAIL) failed++;
      }
      out.push({
        category,
        score: weight > 0 ? Math.round((weighted / weight) * 100) / 100 : 0,
        totalRules: items.length,
        passed,
        warned,
        failed,
      });
    }
    return out;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/score-calculator.ts apps/seo-analyzer/test/unit/score-calculator.spec.ts
git commit -m "feat(analyzer): add ScoreCalculator with weighted average, classify, per-category breakdown"
```

---

## Task 3: Meta Category Rules (4 rules)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/rules/meta/title-tag.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/meta/meta-description.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/meta/open-graph.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/meta/twitter-card.rule.ts`
- Create: `apps/seo-analyzer/test/unit/rules/meta.spec.ts`

- [ ] **Step 1: TDD — write meta rule tests first**

Create `apps/seo-analyzer/test/unit/rules/meta.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { TitleTagRule } from '../../../src/analyzer/rules/meta/title-tag.rule';
import { MetaDescriptionRule } from '../../../src/analyzer/rules/meta/meta-description.rule';
import { OpenGraphRule } from '../../../src/analyzer/rules/meta/open-graph.rule';
import { TwitterCardRule } from '../../../src/analyzer/rules/meta/twitter-card.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

describe('TitleTagRule', () => {
  const rule = new TitleTagRule();
  it('PASS for 50-60 chars', () => {
    const title = 'x'.repeat(55);
    expect(rule.check(makePageData({ title })).status).toBe(CheckStatus.PASS);
  });
  it('WARN for 30-49 chars', () => {
    expect(rule.check(makePageData({ title: 'x'.repeat(40) })).status).toBe(CheckStatus.WARN);
  });
  it('WARN for 61-70 chars', () => {
    expect(rule.check(makePageData({ title: 'x'.repeat(65) })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ title: undefined })).status).toBe(CheckStatus.FAIL);
  });
  it('FAIL when <30 or >70', () => {
    expect(rule.check(makePageData({ title: 'short' })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ title: 'x'.repeat(80) })).status).toBe(CheckStatus.FAIL);
  });
});

describe('MetaDescriptionRule', () => {
  const rule = new MetaDescriptionRule();
  it('PASS for 120-160', () => {
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(140) })).status).toBe(CheckStatus.PASS);
  });
  it('WARN for 80-119 or 161-200', () => {
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(100) })).status).toBe(CheckStatus.WARN);
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(180) })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when missing or out of bounds', () => {
    expect(rule.check(makePageData({ metaDescription: undefined })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(50) })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ metaDescription: 'x'.repeat(250) })).status).toBe(CheckStatus.FAIL);
  });
});

describe('OpenGraphRule', () => {
  const rule = new OpenGraphRule();
  it('PASS when all 3 present', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('WARN when 1-2 present', () => {
    expect(rule.check(makePageData({ openGraph: { 'og:title': 't' } })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when none present', () => {
    expect(rule.check(makePageData({ openGraph: {} })).status).toBe(CheckStatus.FAIL);
  });
});

describe('TwitterCardRule', () => {
  const rule = new TwitterCardRule();
  it('PASS when twitter:card is set', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ twitterCard: {} })).status).toBe(CheckStatus.FAIL);
  });
});
```

- [ ] **Step 2: Implement TitleTagRule**

Create `apps/seo-analyzer/src/analyzer/rules/meta/title-tag.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class TitleTagRule implements ISeoRule {
  readonly id = 'title_tag';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const title = pageData.title?.trim() ?? '';
    const len = title.length;

    if (len >= 50 && len <= 60) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `Title length ${len} is optimal (50-60 chars)`,
        suggestion: null,
        metadata: { length: len },
      };
    }
    if ((len >= 30 && len <= 49) || (len >= 61 && len <= 70)) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Title length ${len} is acceptable but not optimal`,
        suggestion: 'Adjust title to 50-60 characters for best SERP display.',
        metadata: { length: len },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: len === 0 ? 'Title tag is missing' : `Title length ${len} is out of range`,
      suggestion: 'Add a title between 50 and 60 characters that includes the primary keyword.',
      metadata: { length: len },
    };
  }
}
```

- [ ] **Step 3: Implement MetaDescriptionRule**

Create `apps/seo-analyzer/src/analyzer/rules/meta/meta-description.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class MetaDescriptionRule implements ISeoRule {
  readonly id = 'meta_description';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const desc = pageData.metaDescription?.trim() ?? '';
    const len = desc.length;

    if (len >= 120 && len <= 160) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `Meta description length ${len} is optimal`,
        suggestion: null,
        metadata: { length: len },
      };
    }
    if ((len >= 80 && len <= 119) || (len >= 161 && len <= 200)) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Meta description length ${len} is acceptable`,
        suggestion: 'Target 120-160 characters for best SERP snippet.',
        metadata: { length: len },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: len === 0 ? 'Meta description is missing' : `Meta description length ${len} is out of range`,
      suggestion: 'Add a meta description between 120 and 160 characters.',
      metadata: { length: len },
    };
  }
}
```

- [ ] **Step 4: Implement OpenGraphRule**

Create `apps/seo-analyzer/src/analyzer/rules/meta/open-graph.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

const REQUIRED = ['og:title', 'og:description', 'og:image'] as const;

export class OpenGraphRule implements ISeoRule {
  readonly id = 'open_graph';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const og = pageData.openGraph ?? {};
    const present = REQUIRED.filter((k) => typeof og[k] === 'string' && og[k].trim() !== '');
    const count = present.length;

    if (count === 3) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'All required Open Graph tags are present',
        suggestion: null,
        metadata: { present },
      };
    }
    if (count >= 1) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Only ${count}/3 Open Graph tags are present`,
        suggestion: `Add missing tags: ${REQUIRED.filter((k) => !present.includes(k)).join(', ')}`,
        metadata: { present },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'No Open Graph tags found',
      suggestion: 'Add og:title, og:description, and og:image for better social sharing.',
      metadata: { present },
    };
  }
}
```

- [ ] **Step 5: Implement TwitterCardRule**

Create `apps/seo-analyzer/src/analyzer/rules/meta/twitter-card.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class TwitterCardRule implements ISeoRule {
  readonly id = 'twitter_card';
  readonly category = IssueCategory.META;

  check(pageData: PageData): RuleCheckOutput {
    const card = pageData.twitterCard?.['twitter:card'];
    if (card && card.trim() !== '') {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `Twitter card "${card}" present`,
        suggestion: null,
        metadata: { card },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'Twitter card is missing',
      suggestion: 'Add <meta name="twitter:card" content="summary_large_image">.',
      metadata: {},
    };
  }
}
```

Run tests — all meta rule specs should pass.

- [ ] **Step 6: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/rules/meta apps/seo-analyzer/test/unit/rules/meta.spec.ts
git commit -m "feat(analyzer): implement meta category rules (title, description, open graph, twitter)"
```

---

## Task 4: Headings Category Rules (2 rules)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/rules/headings/h1-tag.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/headings/heading-hierarchy.rule.ts`
- Create: `apps/seo-analyzer/test/unit/rules/headings.spec.ts`

- [ ] **Step 1: TDD — write headings tests first**

Create `apps/seo-analyzer/test/unit/rules/headings.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { H1TagRule } from '../../../src/analyzer/rules/headings/h1-tag.rule';
import { HeadingHierarchyRule } from '../../../src/analyzer/rules/headings/heading-hierarchy.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

describe('H1TagRule', () => {
  const rule = new H1TagRule();
  it('PASS exactly 1 H1 and contains keyword', () => {
    const res = rule.check(makePageData({ h1Tags: ['Best Gaming Laptops 2026'] }), 'gaming laptops');
    expect(res.status).toBe(CheckStatus.PASS);
  });
  it('PASS exactly 1 H1 when no keyword is provided', () => {
    expect(rule.check(makePageData({ h1Tags: ['Heading'] })).status).toBe(CheckStatus.PASS);
  });
  it('WARN exactly 1 H1 but missing keyword', () => {
    const res = rule.check(makePageData({ h1Tags: ['About Us'] }), 'laptops');
    expect(res.status).toBe(CheckStatus.WARN);
  });
  it('FAIL zero H1', () => {
    expect(rule.check(makePageData({ h1Tags: [] })).status).toBe(CheckStatus.FAIL);
  });
  it('FAIL multiple H1', () => {
    expect(rule.check(makePageData({ h1Tags: ['A', 'B'] })).status).toBe(CheckStatus.FAIL);
  });
});

describe('HeadingHierarchyRule', () => {
  const rule = new HeadingHierarchyRule();
  it('PASS H1 then H2 then H3', () => {
    const res = rule.check(
      makePageData({ h1Tags: ['A'], h2Tags: ['B'], h3Tags: ['C'], h4Tags: [], h5Tags: [], h6Tags: [] }),
    );
    expect(res.status).toBe(CheckStatus.PASS);
  });
  it('WARN minor skip like H2 then H4', () => {
    const res = rule.check(
      makePageData({ h1Tags: ['A'], h2Tags: ['B'], h3Tags: [], h4Tags: ['C'], h5Tags: [], h6Tags: [] }),
    );
    expect(res.status).toBe(CheckStatus.WARN);
  });
  it('FAIL no headings at all', () => {
    const res = rule.check(
      makePageData({ h1Tags: [], h2Tags: [], h3Tags: [], h4Tags: [], h5Tags: [], h6Tags: [] }),
    );
    expect(res.status).toBe(CheckStatus.FAIL);
  });
});
```

- [ ] **Step 2: Implement H1TagRule**

Create `apps/seo-analyzer/src/analyzer/rules/headings/h1-tag.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class H1TagRule implements ISeoRule {
  readonly id = 'h1_tag';
  readonly category = IssueCategory.HEADINGS;

  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput {
    const count = pageData.h1Tags.length;
    if (count === 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'No H1 tag found',
        suggestion: 'Add exactly one H1 that describes the page topic.',
        metadata: { count },
      };
    }
    if (count > 1) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: `Found ${count} H1 tags; exactly one is required`,
        suggestion: 'Keep a single H1 and demote the rest to H2.',
        metadata: { count },
      };
    }
    const h1 = pageData.h1Tags[0].toLowerCase();
    if (targetKeyword && !h1.includes(targetKeyword.toLowerCase())) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: 'H1 present but does not contain the target keyword',
        suggestion: `Include "${targetKeyword}" in the H1 for stronger topical relevance.`,
        metadata: { count, h1: pageData.h1Tags[0] },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: 'Exactly one H1 found',
      suggestion: null,
      metadata: { count, h1: pageData.h1Tags[0] },
    };
  }
}
```

- [ ] **Step 3: Implement HeadingHierarchyRule**

Create `apps/seo-analyzer/src/analyzer/rules/headings/heading-hierarchy.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class HeadingHierarchyRule implements ISeoRule {
  readonly id = 'heading_hierarchy';
  readonly category = IssueCategory.HEADINGS;

  check(pageData: PageData): RuleCheckOutput {
    const levels = [
      pageData.h1Tags.length,
      pageData.h2Tags.length,
      pageData.h3Tags.length,
      pageData.h4Tags.length,
      pageData.h5Tags.length,
      pageData.h6Tags.length,
    ];
    const total = levels.reduce((a, b) => a + b, 0);
    if (total === 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'No headings found on the page',
        suggestion: 'Structure your content with H1, H2 and H3 headings.',
        metadata: { levels },
      };
    }

    // Build presence sequence h1..h6
    let previousLevel = 0;
    let skipped = false;
    let majorSkip = false;
    for (let i = 0; i < 6; i++) {
      if (levels[i] > 0) {
        if (previousLevel === 0 && i !== 0) {
          // Starts at H2 or lower without H1
          majorSkip = true;
        } else if (i - previousLevel > 1) {
          skipped = true;
          if (i - previousLevel >= 3) majorSkip = true;
        }
        previousLevel = i + 1;
      }
    }

    if (levels[0] === 0 || majorSkip) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Heading hierarchy has major structural issues',
        suggestion: 'Start with a single H1, then use H2/H3 in order without jumping levels.',
        metadata: { levels },
      };
    }
    if (skipped) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: 'Heading hierarchy skips levels (e.g. H2 to H4)',
        suggestion: 'Avoid skipping heading levels — use H3 between H2 and H4.',
        metadata: { levels },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: 'Heading hierarchy is well-structured',
      suggestion: null,
      metadata: { levels },
    };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/rules/headings apps/seo-analyzer/test/unit/rules/headings.spec.ts
git commit -m "feat(analyzer): implement headings rules (h1 tag, heading hierarchy)"
```

---

## Task 5: Images Category Rules (2 rules)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/rules/images/image-alt.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/images/image-optimization.rule.ts`
- Create: `apps/seo-analyzer/test/unit/rules/images.spec.ts`

- [ ] **Step 1: TDD — write images tests first**

Create `apps/seo-analyzer/test/unit/rules/images.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CheckStatus, ImageInfo } from '@repo/shared';
import { ImageAltRule } from '../../../src/analyzer/rules/images/image-alt.rule';
import { ImageOptimizationRule } from '../../../src/analyzer/rules/images/image-optimization.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

const img = (alt: string | null, sizeBytes = 50_000, format = 'webp'): ImageInfo => ({
  src: '/img.webp', alt, sizeBytes, format,
});

describe('ImageAltRule', () => {
  const rule = new ImageAltRule();
  it('PASS when no images (nothing to check)', () => {
    expect(rule.check(makePageData({ images: [] })).status).toBe(CheckStatus.PASS);
  });
  it('PASS when >90% have alt', () => {
    const images = [img('a'), img('b'), img('c'), img('d'), img('e'), img('f'), img('g'), img('h'), img('i'), img('j')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when 70-90% have alt', () => {
    const images = [img('a'), img('b'), img('c'), img('d'), img('e'), img('f'), img('g'), img('h'), img(null), img(null)];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when <70% have alt', () => {
    const images = [img('a'), img(null), img(null), img(null)];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.FAIL);
  });
});

describe('ImageOptimizationRule', () => {
  const rule = new ImageOptimizationRule();
  it('PASS when all <200KB and modern formats', () => {
    const images = [img('a', 150_000, 'webp'), img('b', 180_000, 'avif')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when some oversized or legacy format', () => {
    const images = [img('a', 150_000, 'webp'), img('b', 300_000, 'jpeg')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when majority oversized or legacy', () => {
    const images = [img('a', 400_000, 'jpeg'), img('b', 500_000, 'png'), img('c', 600_000, 'gif')];
    expect(rule.check(makePageData({ images })).status).toBe(CheckStatus.FAIL);
  });
});
```

- [ ] **Step 2: Implement ImageAltRule**

Create `apps/seo-analyzer/src/analyzer/rules/images/image-alt.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class ImageAltRule implements ISeoRule {
  readonly id = 'image_alt';
  readonly category = IssueCategory.IMAGES;

  check(pageData: PageData): RuleCheckOutput {
    const total = pageData.images.length;
    if (total === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'No images on the page',
        suggestion: null,
        metadata: { total: 0 },
      };
    }
    const withAlt = pageData.images.filter((i) => typeof i.alt === 'string' && i.alt.trim() !== '').length;
    const ratio = withAlt / total;
    const percent = Math.round(ratio * 100);

    if (ratio > 0.9) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `${percent}% of images have alt text`,
        suggestion: null,
        metadata: { total, withAlt, percent },
      };
    }
    if (ratio >= 0.7) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `${percent}% of images have alt text`,
        suggestion: 'Add descriptive alt attributes to the remaining images.',
        metadata: { total, withAlt, percent },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `Only ${percent}% of images have alt text`,
      suggestion: 'Add descriptive alt attributes to improve accessibility and SEO.',
      metadata: { total, withAlt, percent },
    };
  }
}
```

- [ ] **Step 3: Implement ImageOptimizationRule**

Create `apps/seo-analyzer/src/analyzer/rules/images/image-optimization.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

const MODERN_FORMATS = new Set(['webp', 'avif']);
const MAX_BYTES = 200 * 1024;

export class ImageOptimizationRule implements ISeoRule {
  readonly id = 'image_optimization';
  readonly category = IssueCategory.IMAGES;

  check(pageData: PageData): RuleCheckOutput {
    const total = pageData.images.length;
    if (total === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'No images on the page',
        suggestion: null,
        metadata: { total: 0 },
      };
    }
    let issues = 0;
    for (const img of pageData.images) {
      const badFormat = !MODERN_FORMATS.has(img.format.toLowerCase());
      const oversized = img.sizeBytes > MAX_BYTES;
      if (badFormat || oversized) issues++;
    }
    const ratio = issues / total;
    if (ratio === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'All images use a modern format and are under 200KB',
        suggestion: null,
        metadata: { total, issues },
      };
    }
    if (ratio <= 0.5) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `${issues}/${total} images are oversized or use legacy formats`,
        suggestion: 'Convert images to WebP/AVIF and keep each under 200KB.',
        metadata: { total, issues },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `${issues}/${total} images have optimization issues`,
      suggestion: 'Convert to WebP/AVIF and compress to under 200KB.',
      metadata: { total, issues },
    };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/rules/images apps/seo-analyzer/test/unit/rules/images.spec.ts
git commit -m "feat(analyzer): implement image rules (alt text, optimization)"
```

---

## Task 6: Links Category Rules (2 rules)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/rules/links/internal-links.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/links/external-links.rule.ts`
- Create: `apps/seo-analyzer/test/unit/rules/links.spec.ts`

- [ ] **Step 1: TDD — write links tests first**

Create `apps/seo-analyzer/test/unit/rules/links.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CheckStatus, LinkInfo } from '@repo/shared';
import { InternalLinksRule } from '../../../src/analyzer/rules/links/internal-links.rule';
import { ExternalLinksRule } from '../../../src/analyzer/rules/links/external-links.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

const link = (overrides: Partial<LinkInfo> = {}): LinkInfo => ({
  href: '/x', anchorText: 'x', isInternal: true, rel: null, statusCode: 200, ...overrides,
});

describe('InternalLinksRule', () => {
  const rule = new InternalLinksRule();
  it('PASS with >=3', () => {
    expect(rule.check(makePageData({ internalLinks: [link(), link(), link()] })).status).toBe(CheckStatus.PASS);
  });
  it('WARN with 1-2', () => {
    expect(rule.check(makePageData({ internalLinks: [link()] })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL with 0', () => {
    expect(rule.check(makePageData({ internalLinks: [] })).status).toBe(CheckStatus.FAIL);
  });
});

describe('ExternalLinksRule', () => {
  const rule = new ExternalLinksRule();
  it('PASS when no external links', () => {
    expect(rule.check(makePageData({ externalLinks: [] })).status).toBe(CheckStatus.PASS);
  });
  it('PASS when all externals have rel noopener', () => {
    const externals = [link({ isInternal: false, rel: 'noopener noreferrer', statusCode: 200 })];
    expect(rule.check(makePageData({ externalLinks: externals })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when some are missing rel', () => {
    const externals = [
      link({ isInternal: false, rel: 'noopener', statusCode: 200 }),
      link({ isInternal: false, rel: null, statusCode: 200 }),
    ];
    expect(rule.check(makePageData({ externalLinks: externals })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when any external link is broken (4xx/5xx)', () => {
    const externals = [link({ isInternal: false, rel: 'noopener', statusCode: 404 })];
    expect(rule.check(makePageData({ externalLinks: externals })).status).toBe(CheckStatus.FAIL);
  });
});
```

- [ ] **Step 2: Implement InternalLinksRule**

Create `apps/seo-analyzer/src/analyzer/rules/links/internal-links.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class InternalLinksRule implements ISeoRule {
  readonly id = 'internal_links';
  readonly category = IssueCategory.LINKS;

  check(pageData: PageData): RuleCheckOutput {
    const count = pageData.internalLinks.length;
    if (count >= 3) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `${count} internal links found`,
        suggestion: null,
        metadata: { count },
      };
    }
    if (count >= 1) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Only ${count} internal link(s) found`,
        suggestion: 'Add at least 3 internal links to support crawling and topic clusters.',
        metadata: { count },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'No internal links found',
      suggestion: 'Add internal links to related pages within your site.',
      metadata: { count },
    };
  }
}
```

- [ ] **Step 3: Implement ExternalLinksRule**

Create `apps/seo-analyzer/src/analyzer/rules/links/external-links.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class ExternalLinksRule implements ISeoRule {
  readonly id = 'external_links';
  readonly category = IssueCategory.LINKS;

  check(pageData: PageData): RuleCheckOutput {
    const externals = pageData.externalLinks;
    if (externals.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'No external links on the page',
        suggestion: null,
        metadata: { total: 0 },
      };
    }
    const broken = externals.filter((l) => l.statusCode >= 400).length;
    if (broken > 0) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: `${broken} external link(s) return 4xx/5xx`,
        suggestion: 'Fix or remove broken external links.',
        metadata: { total: externals.length, broken },
      };
    }
    const missingRel = externals.filter((l) => !(l.rel ?? '').toLowerCase().includes('noopener')).length;
    if (missingRel === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'All external links use rel=noopener',
        suggestion: null,
        metadata: { total: externals.length },
      };
    }
    return {
      status: CheckStatus.WARN,
      score: 50,
      message: `${missingRel}/${externals.length} external links are missing rel=noopener`,
      suggestion: 'Add rel="noopener noreferrer" to all external target=_blank links.',
      metadata: { total: externals.length, missingRel },
    };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/rules/links apps/seo-analyzer/test/unit/rules/links.spec.ts
git commit -m "feat(analyzer): implement link rules (internal links, external links)"
```

---

## Task 7: Technical Rules Part 1 (canonical, robots, viewport, https)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/canonical-url.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/robots-meta.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/viewport-meta.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/https-check.rule.ts`
- Create: `apps/seo-analyzer/test/unit/rules/technical.spec.ts` (will be extended in Task 8)

- [ ] **Step 1: TDD — write initial technical tests (canonical, robots, viewport, https)**

Create `apps/seo-analyzer/test/unit/rules/technical.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { CanonicalUrlRule } from '../../../src/analyzer/rules/technical/canonical-url.rule';
import { RobotsMetaRule } from '../../../src/analyzer/rules/technical/robots-meta.rule';
import { ViewportMetaRule } from '../../../src/analyzer/rules/technical/viewport-meta.rule';
import { HttpsCheckRule } from '../../../src/analyzer/rules/technical/https-check.rule';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

describe('CanonicalUrlRule', () => {
  const rule = new CanonicalUrlRule();
  it('PASS same domain', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/a', canonicalUrl: 'https://example.com/a' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN different domain', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/a', canonicalUrl: 'https://other.com/a' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL missing', () => {
    expect(rule.check(makePageData({ canonicalUrl: undefined })).status).toBe(CheckStatus.FAIL);
  });
});

describe('RobotsMetaRule', () => {
  const rule = new RobotsMetaRule();
  it('PASS when absent or index', () => {
    expect(rule.check(makePageData({ metaRobots: undefined })).status).toBe(CheckStatus.PASS);
    expect(rule.check(makePageData({ metaRobots: 'index,follow' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN when nofollow only', () => {
    expect(rule.check(makePageData({ metaRobots: 'index,nofollow' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL when noindex', () => {
    expect(rule.check(makePageData({ metaRobots: 'noindex,follow' })).status).toBe(CheckStatus.FAIL);
  });
});

describe('ViewportMetaRule', () => {
  const rule = new ViewportMetaRule();
  it('PASS width=device-width', () => {
    expect(rule.check(makePageData({ viewportContent: 'width=device-width, initial-scale=1' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN present without device-width', () => {
    expect(rule.check(makePageData({ viewportContent: 'width=1024' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL missing', () => {
    expect(rule.check(makePageData({ viewportContent: undefined })).status).toBe(CheckStatus.FAIL);
  });
});

describe('HttpsCheckRule', () => {
  const rule = new HttpsCheckRule();
  it('PASS when HTTPS', () => {
    expect(rule.check(makePageData({ isHttps: true })).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when HTTP', () => {
    expect(rule.check(makePageData({ isHttps: false })).status).toBe(CheckStatus.FAIL);
  });
});
```

- [ ] **Step 2: Implement CanonicalUrlRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/canonical-url.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class CanonicalUrlRule implements ISeoRule {
  readonly id = 'canonical_url';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const canonical = pageData.canonicalUrl?.trim();
    if (!canonical) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Canonical URL is missing',
        suggestion: 'Add <link rel="canonical" href="..."> to indicate the preferred URL.',
        metadata: {},
      };
    }
    try {
      const pageHost = new URL(pageData.url).hostname;
      const canonHost = new URL(canonical).hostname;
      if (pageHost === canonHost) {
        return {
          status: CheckStatus.PASS,
          score: 100,
          message: 'Canonical URL is present and on same domain',
          suggestion: null,
          metadata: { canonical },
        };
      }
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: 'Canonical URL points to a different domain',
        suggestion: 'Verify cross-domain canonical is intentional.',
        metadata: { canonical, pageHost, canonHost },
      };
    } catch {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Canonical URL is malformed',
        suggestion: 'Provide an absolute canonical URL.',
        metadata: { canonical },
      };
    }
  }
}
```

- [ ] **Step 3: Implement RobotsMetaRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/robots-meta.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class RobotsMetaRule implements ISeoRule {
  readonly id = 'robots_meta';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const robots = (pageData.metaRobots ?? '').toLowerCase();
    if (!robots || robots.includes('index')) {
      if (robots.includes('noindex')) {
        return {
          status: CheckStatus.FAIL,
          score: 0,
          message: 'Page has noindex directive',
          suggestion: 'Remove noindex if the page should appear in search results.',
          metadata: { robots },
        };
      }
      if (robots.includes('nofollow')) {
        return {
          status: CheckStatus.WARN,
          score: 50,
          message: 'Page is indexable but all links are nofollow',
          suggestion: 'Allow at least some followable links to share link equity.',
          metadata: { robots },
        };
      }
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: robots ? `Robots meta is "${robots}"` : 'No robots meta (defaults to index,follow)',
        suggestion: null,
        metadata: { robots },
      };
    }
    if (robots.includes('noindex')) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Page has noindex directive',
        suggestion: 'Remove noindex if this page should appear in search results.',
        metadata: { robots },
      };
    }
    return {
      status: CheckStatus.PASS,
      score: 100,
      message: `Robots meta is "${robots}"`,
      suggestion: null,
      metadata: { robots },
    };
  }
}
```

- [ ] **Step 4: Implement ViewportMetaRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/viewport-meta.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class ViewportMetaRule implements ISeoRule {
  readonly id = 'viewport_meta';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const vp = pageData.viewportContent?.trim();
    if (!vp) {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'Viewport meta tag is missing',
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
        metadata: {},
      };
    }
    if (vp.toLowerCase().includes('width=device-width')) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Viewport meta is mobile-friendly',
        suggestion: null,
        metadata: { viewport: vp },
      };
    }
    return {
      status: CheckStatus.WARN,
      score: 50,
      message: 'Viewport meta present but not responsive',
      suggestion: 'Use width=device-width for mobile responsiveness.',
      metadata: { viewport: vp },
    };
  }
}
```

- [ ] **Step 5: Implement HttpsCheckRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/https-check.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class HttpsCheckRule implements ISeoRule {
  readonly id = 'https_check';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    if (pageData.isHttps) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Page is served over HTTPS',
        suggestion: null,
        metadata: { isHttps: true },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'Page is served over HTTP',
      suggestion: 'Install a TLS certificate and redirect HTTP to HTTPS.',
      metadata: { isHttps: false },
    };
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/rules/technical/canonical-url.rule.ts apps/seo-analyzer/src/analyzer/rules/technical/robots-meta.rule.ts apps/seo-analyzer/src/analyzer/rules/technical/viewport-meta.rule.ts apps/seo-analyzer/src/analyzer/rules/technical/https-check.rule.ts apps/seo-analyzer/test/unit/rules/technical.spec.ts
git commit -m "feat(analyzer): implement technical rules part 1 (canonical, robots, viewport, https)"
```

---

## Task 8: Technical Rules Part 2 (schema_org, http_status, url_structure, language_tag, favicon)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/schema-org.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/http-status.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/url-structure.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/language-tag.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/technical/favicon.rule.ts`
- Modify: `apps/seo-analyzer/test/unit/rules/technical.spec.ts` (append)

- [ ] **Step 1: TDD — extend technical spec with new cases**

Append to `apps/seo-analyzer/test/unit/rules/technical.spec.ts`:

```ts
import { SchemaOrgRule } from '../../../src/analyzer/rules/technical/schema-org.rule';
import { HttpStatusRule } from '../../../src/analyzer/rules/technical/http-status.rule';
import { UrlStructureRule } from '../../../src/analyzer/rules/technical/url-structure.rule';
import { LanguageTagRule } from '../../../src/analyzer/rules/technical/language-tag.rule';
import { FaviconRule } from '../../../src/analyzer/rules/technical/favicon.rule';

describe('SchemaOrgRule', () => {
  const rule = new SchemaOrgRule();
  it('PASS when JSON-LD present', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when absent', () => {
    expect(rule.check(makePageData({ schemaJsonLd: [] })).status).toBe(CheckStatus.FAIL);
  });
});

describe('HttpStatusRule', () => {
  const rule = new HttpStatusRule();
  it('PASS 200', () => {
    expect(rule.check(makePageData({ statusCode: 200 })).status).toBe(CheckStatus.PASS);
  });
  it('WARN 301/302', () => {
    expect(rule.check(makePageData({ statusCode: 301 })).status).toBe(CheckStatus.WARN);
    expect(rule.check(makePageData({ statusCode: 302 })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL 4xx/5xx', () => {
    expect(rule.check(makePageData({ statusCode: 404 })).status).toBe(CheckStatus.FAIL);
    expect(rule.check(makePageData({ statusCode: 500 })).status).toBe(CheckStatus.FAIL);
  });
});

describe('UrlStructureRule', () => {
  const rule = new UrlStructureRule();
  it('PASS short lowercase clean', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/best-laptops' })).status).toBe(CheckStatus.PASS);
  });
  it('WARN long or query params', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/search?q=laptops&sort=asc' })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL uppercase + underscores + long', () => {
    expect(rule.check(makePageData({ url: 'https://example.com/Some_VERY_Long_Path_' + 'x'.repeat(120) })).status).toBe(CheckStatus.FAIL);
  });
});

describe('LanguageTagRule', () => {
  const rule = new LanguageTagRule();
  it('PASS when present', () => {
    expect(rule.check(makePageData({ language: 'en' })).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ language: undefined })).status).toBe(CheckStatus.FAIL);
  });
});

describe('FaviconRule', () => {
  const rule = new FaviconRule();
  it('PASS when present', () => {
    expect(rule.check(makePageData()).status).toBe(CheckStatus.PASS);
  });
  it('FAIL when missing', () => {
    expect(rule.check(makePageData({ faviconUrl: undefined })).status).toBe(CheckStatus.FAIL);
  });
});
```

- [ ] **Step 2: Implement SchemaOrgRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/schema-org.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class SchemaOrgRule implements ISeoRule {
  readonly id = 'schema_org';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const count = pageData.schemaJsonLd.length;
    if (count > 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `${count} JSON-LD block(s) found`,
        suggestion: null,
        metadata: { count },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'No structured data (JSON-LD) found',
      suggestion: 'Add schema.org JSON-LD for Article, Product, FAQ, etc.',
      metadata: { count: 0 },
    };
  }
}
```

- [ ] **Step 3: Implement HttpStatusRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/http-status.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class HttpStatusRule implements ISeoRule {
  readonly id = 'http_status';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const status = pageData.statusCode;
    if (status === 200) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Page returns 200 OK',
        suggestion: null,
        metadata: { statusCode: status },
      };
    }
    if (status === 301 || status === 302) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `Page returns ${status} redirect`,
        suggestion: 'Prefer serving canonical URLs directly with 200.',
        metadata: { statusCode: status },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `Page returns ${status}`,
      suggestion: 'Fix the error so the page returns 200 OK.',
      metadata: { statusCode: status },
    };
  }
}
```

- [ ] **Step 4: Implement UrlStructureRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/url-structure.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class UrlStructureRule implements ISeoRule {
  readonly id = 'url_structure';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    let parsed: URL;
    try {
      parsed = new URL(pageData.url);
    } catch {
      return {
        status: CheckStatus.FAIL,
        score: 0,
        message: 'URL is malformed',
        suggestion: null,
        metadata: {},
      };
    }

    const path = parsed.pathname;
    const issues: string[] = [];
    if (path.length > 100) issues.push('path_too_long');
    if (parsed.search.length > 0) issues.push('query_params');
    if (/[A-Z]/.test(path)) issues.push('uppercase');
    if (/_/.test(path)) issues.push('underscores');

    if (issues.length === 0) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'URL is short, clean and lowercase',
        suggestion: null,
        metadata: { path, issues },
      };
    }
    if (issues.length <= 1) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `URL has minor issues: ${issues.join(', ')}`,
        suggestion: 'Shorten URL, use hyphens and lowercase, avoid query strings where possible.',
        metadata: { path, issues },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `URL has multiple structural issues: ${issues.join(', ')}`,
      suggestion: 'Rewrite the URL to be short, lowercase, hyphen-separated and free of query strings.',
      metadata: { path, issues },
    };
  }
}
```

- [ ] **Step 5: Implement LanguageTagRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/language-tag.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class LanguageTagRule implements ISeoRule {
  readonly id = 'language_tag';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const lang = pageData.language?.trim();
    if (lang) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `HTML lang="${lang}" declared`,
        suggestion: null,
        metadata: { lang },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'HTML lang attribute is missing',
      suggestion: 'Add lang attribute to <html> element (e.g. lang="en").',
      metadata: {},
    };
  }
}
```

- [ ] **Step 6: Implement FaviconRule**

Create `apps/seo-analyzer/src/analyzer/rules/technical/favicon.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

export class FaviconRule implements ISeoRule {
  readonly id = 'favicon';
  readonly category = IssueCategory.TECHNICAL;

  check(pageData: PageData): RuleCheckOutput {
    const favicon = pageData.faviconUrl?.trim();
    if (favicon) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: 'Favicon is declared',
        suggestion: null,
        metadata: { favicon },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: 'Favicon is missing',
      suggestion: 'Add <link rel="icon" href="/favicon.ico">.',
      metadata: {},
    };
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/rules/technical/schema-org.rule.ts apps/seo-analyzer/src/analyzer/rules/technical/http-status.rule.ts apps/seo-analyzer/src/analyzer/rules/technical/url-structure.rule.ts apps/seo-analyzer/src/analyzer/rules/technical/language-tag.rule.ts apps/seo-analyzer/src/analyzer/rules/technical/favicon.rule.ts apps/seo-analyzer/test/unit/rules/technical.spec.ts
git commit -m "feat(analyzer): implement technical rules part 2 (schema, status, url, language, favicon)"
```

---

## Task 9: Performance Rule + Rules Barrel + Registration Audit

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/rules/performance/page-size.rule.ts`
- Create: `apps/seo-analyzer/src/analyzer/rules/index.ts`
- Create: `apps/seo-analyzer/test/unit/rules/performance.spec.ts`

- [ ] **Step 1: TDD — write performance tests**

Create `apps/seo-analyzer/test/unit/rules/performance.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@repo/shared';
import { PageSizeRule } from '../../../src/analyzer/rules/performance/page-size.rule';
import { registerAllRules } from '../../../src/analyzer/rules';
import { RuleRegistry } from '../../../src/analyzer/rule-registry';
import { makePageData } from '../../../src/analyzer/test-fixtures/page-data.fixture';

const MB = 1024 * 1024;

describe('PageSizeRule', () => {
  const rule = new PageSizeRule();
  it('PASS <2MB', () => {
    expect(rule.check(makePageData({ htmlSizeBytes: 1 * MB })).status).toBe(CheckStatus.PASS);
  });
  it('WARN 2-5MB', () => {
    expect(rule.check(makePageData({ htmlSizeBytes: 3 * MB })).status).toBe(CheckStatus.WARN);
  });
  it('FAIL >5MB', () => {
    expect(rule.check(makePageData({ htmlSizeBytes: 6 * MB })).status).toBe(CheckStatus.FAIL);
  });
});

describe('registerAllRules', () => {
  it('registers all 20 SEO rules with unique ids', () => {
    const registry = new RuleRegistry();
    registerAllRules(registry);
    const all = registry.getAll();
    expect(all).toHaveLength(20);
    const ids = new Set(all.map((r) => r.id));
    expect(ids.size).toBe(20);
    // Sanity: each seeded rule name must be registered
    const expected = [
      'title_tag', 'meta_description', 'open_graph', 'twitter_card',
      'h1_tag', 'heading_hierarchy',
      'image_alt', 'image_optimization',
      'internal_links', 'external_links',
      'canonical_url', 'robots_meta', 'viewport_meta', 'https_check',
      'schema_org', 'http_status', 'url_structure', 'language_tag', 'favicon',
      'page_size',
    ];
    for (const name of expected) {
      expect(registry.get(name), `missing rule ${name}`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Implement PageSizeRule**

Create `apps/seo-analyzer/src/analyzer/rules/performance/page-size.rule.ts`:

```ts
import { CheckStatus, IssueCategory } from '@repo/shared';
import { ISeoRule, RuleCheckOutput } from '../../interfaces/seo-rule.interface';
import { PageData } from '../../interfaces/page-data.interface';

const MB = 1024 * 1024;

export class PageSizeRule implements ISeoRule {
  readonly id = 'page_size';
  readonly category = IssueCategory.PERFORMANCE;

  check(pageData: PageData): RuleCheckOutput {
    const bytes = pageData.htmlSizeBytes;
    const mb = Math.round((bytes / MB) * 100) / 100;
    if (bytes < 2 * MB) {
      return {
        status: CheckStatus.PASS,
        score: 100,
        message: `HTML size is ${mb} MB`,
        suggestion: null,
        metadata: { bytes, mb },
      };
    }
    if (bytes <= 5 * MB) {
      return {
        status: CheckStatus.WARN,
        score: 50,
        message: `HTML size is ${mb} MB (target <2 MB)`,
        suggestion: 'Compress HTML, minify, and defer non-critical scripts.',
        metadata: { bytes, mb },
      };
    }
    return {
      status: CheckStatus.FAIL,
      score: 0,
      message: `HTML size is ${mb} MB (over 5 MB limit)`,
      suggestion: 'Reduce page weight: split code, compress, remove unused assets.',
      metadata: { bytes, mb },
    };
  }
}
```

- [ ] **Step 3: Create rules barrel with registerAllRules**

Create `apps/seo-analyzer/src/analyzer/rules/index.ts`:

```ts
import { RuleRegistry } from '../rule-registry';
import { TitleTagRule } from './meta/title-tag.rule';
import { MetaDescriptionRule } from './meta/meta-description.rule';
import { OpenGraphRule } from './meta/open-graph.rule';
import { TwitterCardRule } from './meta/twitter-card.rule';
import { H1TagRule } from './headings/h1-tag.rule';
import { HeadingHierarchyRule } from './headings/heading-hierarchy.rule';
import { ImageAltRule } from './images/image-alt.rule';
import { ImageOptimizationRule } from './images/image-optimization.rule';
import { InternalLinksRule } from './links/internal-links.rule';
import { ExternalLinksRule } from './links/external-links.rule';
import { CanonicalUrlRule } from './technical/canonical-url.rule';
import { RobotsMetaRule } from './technical/robots-meta.rule';
import { ViewportMetaRule } from './technical/viewport-meta.rule';
import { HttpsCheckRule } from './technical/https-check.rule';
import { SchemaOrgRule } from './technical/schema-org.rule';
import { HttpStatusRule } from './technical/http-status.rule';
import { UrlStructureRule } from './technical/url-structure.rule';
import { LanguageTagRule } from './technical/language-tag.rule';
import { FaviconRule } from './technical/favicon.rule';
import { PageSizeRule } from './performance/page-size.rule';

export function registerAllRules(registry: RuleRegistry): void {
  registry.register(new TitleTagRule());
  registry.register(new MetaDescriptionRule());
  registry.register(new OpenGraphRule());
  registry.register(new TwitterCardRule());
  registry.register(new H1TagRule());
  registry.register(new HeadingHierarchyRule());
  registry.register(new ImageAltRule());
  registry.register(new ImageOptimizationRule());
  registry.register(new InternalLinksRule());
  registry.register(new ExternalLinksRule());
  registry.register(new CanonicalUrlRule());
  registry.register(new RobotsMetaRule());
  registry.register(new ViewportMetaRule());
  registry.register(new HttpsCheckRule());
  registry.register(new SchemaOrgRule());
  registry.register(new HttpStatusRule());
  registry.register(new UrlStructureRule());
  registry.register(new LanguageTagRule());
  registry.register(new FaviconRule());
  registry.register(new PageSizeRule());
}
```

Run `npm run test --workspace @seo/seo-analyzer` — all 20 rule suites + registry/runner/score tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/rules/performance apps/seo-analyzer/src/analyzer/rules/index.ts apps/seo-analyzer/test/unit/rules/performance.spec.ts
git commit -m "feat(analyzer): implement page_size rule and registerAllRules barrel for 20 rules"
```

---

## Task 10: AnalyzerService + gRPC AnalyzePage Controller

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/analyzer.service.ts`
- Create: `apps/seo-analyzer/src/analyzer/analyzer.controller.ts`
- Create: `apps/seo-analyzer/src/analyzer/analyzer.module.ts`
- Modify: `apps/seo-analyzer/src/app.module.ts`

- [ ] **Step 1: Implement AnalyzerService**

Create `apps/seo-analyzer/src/analyzer/analyzer.service.ts`:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CheckStatus, IssueCategory, Classification } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RuleRegistry } from './rule-registry';
import { RuleRunner, DbRule, RunnerResult } from './rule-runner';
import { ScoreCalculator, CategoryScore } from './score-calculator';
import { registerAllRules } from './rules';
import { PageData } from './interfaces/page-data.interface';

export interface AnalyzeResult {
  auditId: string;
  ruleResults: RunnerResult[];
  categoryScores: CategoryScore[];
  overallScore: number;
  classification: Classification;
}

@Injectable()
export class AnalyzerService implements OnModuleInit {
  private readonly logger = new Logger(AnalyzerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RuleRegistry,
    private readonly runner: RuleRunner,
    private readonly calc: ScoreCalculator,
  ) {}

  onModuleInit() {
    this.registry.clear();
    registerAllRules(this.registry);
    this.logger.log(`Registered ${this.registry.getAll().length} SEO rules`);
  }

  async analyze(auditId: string, pageData: PageData, targetKeyword?: string): Promise<AnalyzeResult> {
    const dbRows = await this.prisma.seoRule.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
    });
    const dbRules: DbRule[] = dbRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category as unknown as IssueCategory,
      weight: r.weight,
    }));

    const results = this.runner.runAll(pageData, dbRules, targetKeyword);

    // Persist rule_results rows
    if (results.length > 0) {
      await this.prisma.ruleResult.createMany({
        data: results.map((r) => ({
          auditId,
          ruleId: r.ruleName,
          ruleName: r.ruleName,
          category: r.category as any,
          status: r.status as any,
          score: r.score,
          weight: r.weight,
          message: r.message,
          suggestion: r.suggestion,
          metadata: r.metadata as any,
        })),
      });
    }

    const overallScore = this.calc.overall(results);
    const categoryScores = this.calc.perCategory(results);
    const classification = this.calc.classify(overallScore);

    this.logger.log(
      `Analyzed audit=${auditId} score=${overallScore} (${classification}) rules=${results.length}`,
    );

    return { auditId, ruleResults: results, categoryScores, overallScore, classification };
  }
}
```

- [ ] **Step 2: Implement gRPC AnalyzePage method**

Create `apps/seo-analyzer/src/analyzer/analyzer.controller.ts`:

```ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AnalyzerService } from './analyzer.service';
import { PageData } from './interfaces/page-data.interface';

interface ProtoRuleResult {
  rule_id: string;
  rule_name: string;
  status: string;
  score: number;
  weight: number;
  category: string;
  message: string;
  suggestion?: string;
  metadata: Record<string, string>;
}

@Controller()
export class AnalyzerController {
  constructor(private readonly analyzer: AnalyzerService) {}

  @GrpcMethod('SeoAnalyzerService', 'AnalyzePage')
  async analyzePage(req: { auditId: string; pageData: any; targetKeyword?: string }) {
    const pageData = this.mapPageData(req.pageData);
    const result = await this.analyzer.analyze(req.auditId, pageData, req.targetKeyword);

    const ruleResults: ProtoRuleResult[] = result.ruleResults.map((r) => ({
      rule_id: r.ruleId,
      rule_name: r.ruleName,
      status: r.status,
      score: r.score,
      weight: r.weight,
      category: r.category,
      message: r.message,
      suggestion: r.suggestion ?? undefined,
      metadata: Object.fromEntries(
        Object.entries(r.metadata).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
      ),
    }));

    return {
      audit_id: result.auditId,
      rule_results: ruleResults,
      category_scores: result.categoryScores.map((c) => ({
        category: c.category,
        score: c.score,
        total_rules: c.totalRules,
        passed: c.passed,
        warned: c.warned,
        failed: c.failed,
      })),
      overall_score: result.overallScore,
      classification: result.classification,
    };
  }

  private mapPageData(raw: any): PageData {
    return {
      url: raw.url,
      finalUrl: raw.finalUrl ?? raw.final_url ?? raw.url,
      statusCode: Number(raw.statusCode ?? raw.status_code ?? 200),
      responseTimeMs: Number(raw.responseTimeMs ?? raw.response_time_ms ?? 0),
      htmlSizeBytes: Number(raw.htmlSizeBytes ?? raw.html_size_bytes ?? 0),
      title: raw.title,
      metaDescription: raw.metaDescription ?? raw.meta_description,
      metaRobots: raw.metaRobots ?? raw.meta_robots,
      canonicalUrl: raw.canonicalUrl ?? raw.canonical_url,
      language: raw.language,
      faviconUrl: raw.faviconUrl ?? raw.favicon_url,
      h1Tags: raw.h1Tags ?? raw.h1_tags ?? [],
      h2Tags: raw.h2Tags ?? raw.h2_tags ?? [],
      h3Tags: raw.h3Tags ?? raw.h3_tags ?? [],
      h4Tags: raw.h4Tags ?? raw.h4_tags ?? [],
      h5Tags: raw.h5Tags ?? raw.h5_tags ?? [],
      h6Tags: raw.h6Tags ?? raw.h6_tags ?? [],
      images: raw.images ?? [],
      internalLinks: raw.internalLinks ?? raw.internal_links ?? [],
      externalLinks: raw.externalLinks ?? raw.external_links ?? [],
      schemaJsonLd: raw.schemaJsonLd ?? raw.schema_json_ld ?? [],
      openGraph: raw.openGraph ?? raw.open_graph ?? {},
      twitterCard: raw.twitterCard ?? raw.twitter_card ?? {},
      isHttps: Boolean(raw.isHttps ?? raw.is_https ?? false),
      redirectChain: raw.redirectChain ?? raw.redirect_chain ?? [],
      contentEncoding: raw.contentEncoding ?? raw.content_encoding ?? '',
      cacheControl: raw.cacheControl ?? raw.cache_control ?? '',
      viewportContent: raw.viewportContent ?? raw.viewport_content,
      textContent: raw.textContent ?? raw.text_content ?? '',
      rawHtml: raw.rawHtml ?? raw.raw_html ?? '',
    };
  }
}
```

- [ ] **Step 3: Create AnalyzerModule and wire into AppModule**

Create `apps/seo-analyzer/src/analyzer/analyzer.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyzerService } from './analyzer.service';
import { AnalyzerController } from './analyzer.controller';
import { RuleRegistry } from './rule-registry';
import { RuleRunner } from './rule-runner';
import { ScoreCalculator } from './score-calculator';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyzerController],
  providers: [RuleRegistry, RuleRunner, ScoreCalculator, AnalyzerService],
  exports: [AnalyzerService],
})
export class AnalyzerModule {}
```

Modify `apps/seo-analyzer/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AnalyzerModule } from './analyzer/analyzer.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AnalyzerModule],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/analyzer.service.ts apps/seo-analyzer/src/analyzer/analyzer.controller.ts apps/seo-analyzer/src/analyzer/analyzer.module.ts apps/seo-analyzer/src/app.module.ts
git commit -m "feat(analyzer): add AnalyzerService + gRPC AnalyzePage RPC wiring"
```

---

## Task 11: gRPC Admin RPCs (ListRules, UpdateRuleWeight, GetRulesByCategory, HealthCheck)

**Files:**
- Modify: `apps/seo-analyzer/src/analyzer/analyzer.controller.ts`

- [ ] **Step 1: Add the 4 remaining RPC methods**

Append to `AnalyzerController` in `apps/seo-analyzer/src/analyzer/analyzer.controller.ts`:

```ts
  @GrpcMethod('SeoAnalyzerService', 'ListRules')
  async listRules() {
    const rows = await this.analyzer.listAllRules();
    return { rules: rows.map(this.mapRuleToProto) };
  }

  @GrpcMethod('SeoAnalyzerService', 'GetRulesByCategory')
  async getRulesByCategory(req: { category: string }) {
    const rows = await this.analyzer.listRulesByCategory(req.category);
    return { rules: rows.map(this.mapRuleToProto) };
  }

  @GrpcMethod('SeoAnalyzerService', 'UpdateRuleWeight')
  async updateRuleWeight(req: { ruleId: string; newWeight: number }) {
    const id = req.ruleId ?? (req as any).rule_id;
    const weight = Number(req.newWeight ?? (req as any).new_weight);
    if (!Number.isInteger(weight) || weight < 1 || weight > 10) {
      throw new Error('Weight must be an integer between 1 and 10');
    }
    const row = await this.analyzer.updateRuleWeight(id, weight);
    return { rule: this.mapRuleToProto(row) };
  }

  @GrpcMethod('SeoAnalyzerService', 'HealthCheck')
  healthCheck() {
    return { healthy: true, version: process.env.npm_package_version ?? '0.0.1' };
  }

  private mapRuleToProto = (row: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: string;
    weight: number;
    isEnabled: boolean;
  }) => ({
    id: row.id,
    name: row.name,
    display_name: row.displayName,
    description: row.description,
    category: row.category,
    weight: row.weight,
    is_enabled: row.isEnabled,
  });
```

- [ ] **Step 2: Add matching AnalyzerService helpers**

Append to `AnalyzerService` in `apps/seo-analyzer/src/analyzer/analyzer.service.ts`:

```ts
  listAllRules() {
    return this.prisma.seoRule.findMany({ orderBy: { name: 'asc' } });
  }

  listRulesByCategory(category: string) {
    return this.prisma.seoRule.findMany({
      where: { category: category as any },
      orderBy: { name: 'asc' },
    });
  }

  async updateRuleWeight(ruleId: string, newWeight: number) {
    return this.prisma.seoRule.update({
      where: { id: ruleId },
      data: { weight: newWeight },
    });
  }
```

- [ ] **Step 3: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/analyzer.controller.ts apps/seo-analyzer/src/analyzer/analyzer.service.ts
git commit -m "feat(analyzer): add ListRules, GetRulesByCategory, UpdateRuleWeight and HealthCheck RPCs"
```

---

## Task 12: BullMQ Worker for analyze.start + analyze.done Event

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/analyzer.worker.ts`
- Modify: `apps/seo-analyzer/src/analyzer/analyzer.module.ts`
- Modify: `apps/seo-analyzer/src/main.ts`

- [ ] **Step 1: Create the worker processor**

Create `apps/seo-analyzer/src/analyzer/analyzer.worker.ts`:

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { BULLMQ_QUEUES, REDIS_KEYS, AuditStatus } from '@repo/shared';
import { AnalyzerService } from './analyzer.service';
import { PageData } from './interfaces/page-data.interface';

interface AnalyzeJobData {
  auditId: string;
  pageData: PageData;
  targetKeyword?: string;
}

@Processor(BULLMQ_QUEUES.ANALYZE_START)
export class AnalyzerWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyzerWorker.name);
  private readonly publisher: Redis;

  constructor(private readonly analyzer: AnalyzerService) {
    super();
    this.publisher = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    });
  }

  async process(job: Job<AnalyzeJobData>): Promise<void> {
    const { auditId, pageData, targetKeyword } = job.data;
    this.logger.log(`Processing analyze.start job ${job.id} audit=${auditId}`);

    const result = await this.analyzer.analyze(auditId, pageData, targetKeyword);

    // Cache analyze result under the shared Redis key so the orchestrator can aggregate
    await this.publisher.setex(
      REDIS_KEYS.auditAnalyzeResult(auditId),
      3600,
      JSON.stringify({
        auditId,
        overallScore: result.overallScore,
        classification: result.classification,
        ruleResults: result.ruleResults,
        categoryScores: result.categoryScores,
      }),
    );

    // Mark step complete (orchestrator uses this set to detect pipeline completion)
    await this.publisher.sadd(REDIS_KEYS.auditCompletedSteps(auditId), 'analyze');

    // Publish analyze.done event
    await this.publisher.publish(
      'analyze.done',
      JSON.stringify({
        auditId,
        status: AuditStatus.ANALYZING,
        stage: 'analyze',
        progress: 66,
        message: `Analyzer finished: score ${result.overallScore}`,
      }),
    );
  }
}
```

- [ ] **Step 2: Register BullMQ queue + worker in AnalyzerModule**

Modify `apps/seo-analyzer/src/analyzer/analyzer.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyzerService } from './analyzer.service';
import { AnalyzerController } from './analyzer.controller';
import { AnalyzerWorker } from './analyzer.worker';
import { RuleRegistry } from './rule-registry';
import { RuleRunner } from './rule-runner';
import { ScoreCalculator } from './score-calculator';
import { BULLMQ_QUEUES } from '@repo/shared';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.ANALYZE_START }),
  ],
  controllers: [AnalyzerController],
  providers: [RuleRegistry, RuleRunner, ScoreCalculator, AnalyzerService, AnalyzerWorker],
  exports: [AnalyzerService],
})
export class AnalyzerModule {}
```

- [ ] **Step 3: Ensure main.ts boots HTTP lifecycle so BullMQ worker starts**

Modify `apps/seo-analyzer/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Use a standalone application so BullMQ workers (providers) initialise
  // alongside the gRPC microservice transport.
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['analyzer.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/analyzer/v1/analyzer.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50053}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../..', 'packages/proto')],
      },
    },
  });

  await app.startAllMicroservices();
  await app.init();
  console.log(`SEO Analyzer gRPC service running on port ${process.env.GRPC_PORT || 50053}`);
  console.log(`SEO Analyzer BullMQ worker listening on queue "analyze.start"`);
}
bootstrap();
```

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/analyzer.worker.ts apps/seo-analyzer/src/analyzer/analyzer.module.ts apps/seo-analyzer/src/main.ts
git commit -m "feat(analyzer): add BullMQ worker for analyze.start queue and analyze.done event"
```

---

## Task 13: E2E Integration Test — AnalyzePage gRPC Flow

**Files:**
- Create: `apps/seo-analyzer/test/integration/analyze-page.e2e-spec.ts`

- [ ] **Step 1: Write integration test with in-memory Nest module**

Create `apps/seo-analyzer/test/integration/analyze-page.e2e-spec.ts`:

```ts
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzerModule } from '../../src/analyzer/analyzer.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AnalyzerController } from '../../src/analyzer/analyzer.controller';
import { AnalyzerService } from '../../src/analyzer/analyzer.service';
import { makePageData } from '../../src/analyzer/test-fixtures/page-data.fixture';
import { Classification, IssueCategory } from '@repo/shared';

// Mocked Prisma — returns the 20 seeded rules and captures createMany
const seededRules = [
  { id: 'r-title_tag',         name: 'title_tag',         category: 'meta',        weight: 8,  displayName: 'Title', description: '', isEnabled: true },
  { id: 'r-meta_description',  name: 'meta_description',  category: 'meta',        weight: 7,  displayName: 'Desc',  description: '', isEnabled: true },
  { id: 'r-open_graph',        name: 'open_graph',        category: 'meta',        weight: 5,  displayName: 'OG',    description: '', isEnabled: true },
  { id: 'r-twitter_card',      name: 'twitter_card',      category: 'meta',        weight: 3,  displayName: 'TW',    description: '', isEnabled: true },
  { id: 'r-h1_tag',            name: 'h1_tag',            category: 'headings',    weight: 8,  displayName: 'H1',    description: '', isEnabled: true },
  { id: 'r-heading_hierarchy', name: 'heading_hierarchy', category: 'headings',    weight: 6,  displayName: 'HH',    description: '', isEnabled: true },
  { id: 'r-image_alt',         name: 'image_alt',         category: 'images',      weight: 7,  displayName: 'Alt',   description: '', isEnabled: true },
  { id: 'r-image_optimization',name: 'image_optimization',category: 'images',      weight: 5,  displayName: 'IOpt',  description: '', isEnabled: true },
  { id: 'r-internal_links',    name: 'internal_links',    category: 'links',       weight: 5,  displayName: 'IL',    description: '', isEnabled: true },
  { id: 'r-external_links',    name: 'external_links',    category: 'links',       weight: 3,  displayName: 'EL',    description: '', isEnabled: true },
  { id: 'r-canonical_url',     name: 'canonical_url',     category: 'technical',   weight: 5,  displayName: 'Can',   description: '', isEnabled: true },
  { id: 'r-robots_meta',       name: 'robots_meta',       category: 'technical',   weight: 6,  displayName: 'Rob',   description: '', isEnabled: true },
  { id: 'r-viewport_meta',     name: 'viewport_meta',     category: 'technical',   weight: 10, displayName: 'VP',    description: '', isEnabled: true },
  { id: 'r-https_check',       name: 'https_check',       category: 'technical',   weight: 10, displayName: 'HT',    description: '', isEnabled: true },
  { id: 'r-schema_org',        name: 'schema_org',        category: 'technical',   weight: 6,  displayName: 'SO',    description: '', isEnabled: true },
  { id: 'r-http_status',       name: 'http_status',       category: 'technical',   weight: 8,  displayName: 'HS',    description: '', isEnabled: true },
  { id: 'r-url_structure',     name: 'url_structure',     category: 'technical',   weight: 4,  displayName: 'URL',   description: '', isEnabled: true },
  { id: 'r-language_tag',      name: 'language_tag',      category: 'technical',   weight: 3,  displayName: 'Lang',  description: '', isEnabled: true },
  { id: 'r-favicon',           name: 'favicon',           category: 'technical',   weight: 2,  displayName: 'Fav',   description: '', isEnabled: true },
  { id: 'r-page_size',         name: 'page_size',         category: 'performance', weight: 4,  displayName: 'PS',    description: '', isEnabled: true },
];

const prismaMock = {
  seoRule: {
    findMany: vi.fn().mockResolvedValue(seededRules),
    update: vi.fn().mockImplementation(({ where, data }) => ({
      ...seededRules.find((r) => r.id === where.id),
      ...data,
    })),
  },
  ruleResult: {
    createMany: vi.fn().mockResolvedValue({ count: 20 }),
  },
};

describe('AnalyzePage E2E', () => {
  let moduleRef: TestingModule;
  let controller: AnalyzerController;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AnalyzerModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    // Trigger onModuleInit on AnalyzerService (registers all 20 rules)
    await moduleRef.init();
    controller = moduleRef.get(AnalyzerController);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('analyzes a healthy page and returns excellent classification', async () => {
    const response = await controller.analyzePage({
      auditId: '00000000-0000-0000-0000-000000000001',
      pageData: makePageData(),
    });

    expect(response.audit_id).toBe('00000000-0000-0000-0000-000000000001');
    expect(response.rule_results.length).toBe(20);
    expect(response.category_scores.length).toBeGreaterThanOrEqual(5);
    expect(response.overall_score).toBeGreaterThanOrEqual(80);
    expect(response.classification).toBe(Classification.EXCELLENT);
    expect(prismaMock.ruleResult.createMany).toHaveBeenCalledOnce();
  });

  it('returns poor classification when page is broken', async () => {
    const bad = makePageData({
      title: undefined,
      metaDescription: undefined,
      h1Tags: [],
      images: [{ src: '/a.jpg', alt: null, sizeBytes: 800_000, format: 'jpeg' }],
      internalLinks: [],
      canonicalUrl: undefined,
      isHttps: false,
      viewportContent: undefined,
      schemaJsonLd: [],
      language: undefined,
      faviconUrl: undefined,
      htmlSizeBytes: 10 * 1024 * 1024,
      statusCode: 500,
      openGraph: {},
      twitterCard: {},
    });

    const response = await controller.analyzePage({
      auditId: '00000000-0000-0000-0000-000000000002',
      pageData: bad,
    });

    expect(response.overall_score).toBeLessThan(40);
    expect(response.classification).toBe(Classification.POOR);
  });

  it('ListRules returns 20 rules', async () => {
    const res = await controller.listRules();
    expect(res.rules).toHaveLength(20);
  });

  it('GetRulesByCategory filters correctly', async () => {
    prismaMock.seoRule.findMany.mockResolvedValueOnce(
      seededRules.filter((r) => r.category === 'meta'),
    );
    const res = await controller.getRulesByCategory({ category: IssueCategory.META });
    expect(res.rules.every((r) => r.category === 'meta')).toBe(true);
  });

  it('UpdateRuleWeight rejects out-of-range weight', async () => {
    await expect(
      controller.updateRuleWeight({ ruleId: 'r-title_tag', newWeight: 42 }),
    ).rejects.toThrow(/between 1 and 10/);
  });

  it('HealthCheck returns healthy', () => {
    const res = controller.healthCheck();
    expect(res.healthy).toBe(true);
    expect(typeof res.version).toBe('string');
  });
});
```

- [ ] **Step 2: Run full test suite**

```bash
cd apps/seo-analyzer && npm test
```

Expected: All unit suites (registry, runner, score-calculator, 6 rule suites) + the integration suite pass. Total ~50+ specs, 0 failures.

- [ ] **Step 3: Commit**

```bash
git add apps/seo-analyzer/test/integration/analyze-page.e2e-spec.ts
git commit -m "test(analyzer): add AnalyzePage E2E covering 20-rule pipeline, admin RPCs, health"
```

---

## Verification Checklist

After completing all 13 tasks, verify:

- [ ] `cd apps/seo-analyzer && npm test` — all unit + integration suites pass, 0 failures
- [ ] `cd apps/seo-analyzer && npm run check-types` — no TypeScript errors
- [ ] `cd apps/seo-analyzer && npm run lint` — no lint errors
- [ ] `registerAllRules` registers exactly 20 rules, matching the 20 rows in `seo_rules` table
- [ ] Every seeded rule name has a corresponding `ISeoRule` implementation (registry lookup returns defined)
- [ ] `ScoreCalculator.overall()` uses weighted average and matches the spec formula
- [ ] `AnalyzerController` exposes all 5 RPCs: AnalyzePage, ListRules, UpdateRuleWeight, GetRulesByCategory, HealthCheck
- [ ] `AnalyzerWorker` is a `@Processor(BULLMQ_QUEUES.ANALYZE_START)` that calls `AnalyzerService.analyze()` and publishes to Redis channel `analyze.done`
- [ ] `main.ts` boots both the gRPC microservice and the BullMQ worker via `NestFactory.create` + `connectMicroservice` + `startAllMicroservices`
- [ ] `AnalyzerService.analyze()` persists `RuleResult` rows via `prisma.ruleResult.createMany`
- [ ] Running `docker compose up -d redis analyzer-db` and `cd apps/seo-analyzer && npm run dev` starts the service without errors
- [ ] Manual gRPC smoke test (grpcurl) against `AnalyzePage` with a sample `PageData` returns overall score + 20 rule results

---

## What Comes Next

This plan produces a **fully functional SEO Analyzer microservice**. Downstream plans depend on it as follows:

| Next Plan | What it consumes from this plan |
|-----------|---------------------------------|
| Plan 3: Crawler Service | Produces the `PageData` that Analyzer consumes via BullMQ `analyze.start` |
| Plan 2: Gateway Service | Calls Analyzer gRPC `ListRules` / `UpdateRuleWeight` from admin endpoints; enqueues `analyze.start` jobs |
| Plan 6: Report Service | Reads the cached `audit:{auditId}:analyze_result` Redis key (or queries `rule_results` table) to build final PDF/JSON reports |
| Plan 7: Integration | Wires the full pipeline (crawl.done → analyze.start → analyze.done → report.start), runs end-to-end smoke tests with real Redis + Postgres + 5 services |

**Known follow-ups** (out of scope for this plan, to be handled later):
- Caching per-rule configurations (`checkConfig` JSON field on `SeoRule`) — currently rules hard-code thresholds. A future task can wire thresholds through `SeoRule.checkConfig` so admins can tune them without a deploy.
- Metrics/telemetry — add Prometheus counters for rule pass/warn/fail rates per audit.
- Locking — add a distributed lock per `auditId` so concurrent analyses cannot double-insert `rule_results`.
