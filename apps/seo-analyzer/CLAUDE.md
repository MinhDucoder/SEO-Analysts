# @seo/seo-analyzer — SEO Rule Engine

Chạy 20 SEO rule trên PageData (crawl output) → per-rule score + category scores + overall score + classification (excellent/good/fair/poor). Persist rule_results vào Postgres.

## Architecture (DDD)

```
src/analyzer/
├── analyzer.module.ts
├── controllers/    # analyzer.controller (gRPC), analyzer.worker (BullMQ)
├── services/       # analyzer.service, rule-registry, rule-runner, score-calculator
└── domain/
    ├── seo-rule.interface.ts      # ISeoRule contract
    ├── page-data.interface.ts
    └── rules/                     # 20 rules organized by IssueCategory
        ├── meta/          # title-tag, meta-description, open-graph, twitter-card
        ├── headings/      # h1-tag, heading-hierarchy
        ├── images/        # image-alt, image-optimization
        ├── links/         # internal-links, external-links
        ├── performance/   # page-size
        └── technical/     # canonical, robots, viewport, https, schema, etc. (9)

src/infra/prisma/  # prisma.service, prisma.module, generated/ (Prisma client)
```

## Public API

| Channel | Method / Queue | Purpose |
|---|---|---|
| gRPC `:50053` | `AnalyzerService.AnalyzeRules` | Sync analyze (admin / on-demand) |
| gRPC `:50053` | `AnalyzerService.ListRules` / `UpdateRuleWeight` | Admin rule management |
| gRPC `:50053` | `AnalyzerService.HealthCheck` | Liveness |
| BullMQ `analyze.start` | Job processor (AnalyzerWorker) | **Main pipeline step** — consumed after crawl |
| Redis pub | `analyze.done` | Published on completion → Report service picks up |

Proto: `packages/proto/analyzer/v1/analyzer.proto`

## Rule contract

```ts
interface ISeoRule {
  readonly id: string;
  readonly category: IssueCategory;
  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput;
}
```
Registered at startup via `registerAllRules(registry)` in `domain/rules/index.ts`.

## Dependencies

- **Postgres** (Prisma) — `SeoRule` (rule weights/enabled) + `RuleResult` (persisted per audit)
- **Redis** — BullMQ consumer
- Prisma output: `src/infra/prisma/generated` (committed, regenerated via `npx prisma generate`)

## Testing

- Unit: rule-registry, rule-runner, score-calculator, 6 rule category specs (performance, technical, meta, headings, images, links)
- Integration: `test/integration/analyze-page.e2e-spec.ts` — wires registry + runner + calc with mocked Prisma (20 seeded rules)
- Fixtures: `test/fixtures/page-data.fixture.ts`
- Current: 81 tests / 10 files

## Entrypoint

- Dockerfile runs `docker-entrypoint.sh` → `prisma migrate deploy` → seed → `node dist/main.js`
- Config env: `ANALYZER_DATABASE_URL`, `REDIS_URL`, `GRPC_PORT` (50053)
- Seed: `prisma/seed.ts` loads 20 default rules into DB on first boot
