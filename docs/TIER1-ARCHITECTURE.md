# Tier 1 — Architecture Lock-in

> Phase 1 output (WORKFLOW-LARGE / THIET KE). Locks down schema, queue topology, shared-package changes, and rollout sequence for all 5 Tier-1 features before any code is written. Upstream: `docs/TIER1-BRAINSTORM.md`. Date: 2026-04-17.

## Scope lock

| ID | Feature | Service touched | DB touched | Shared-pkg touched |
|---|---|---|---|---|
| F1 | Site-wide crawl | crawler, gateway | gateway | yes |
| F2 | Scheduled audits | gateway | gateway | yes |
| F3 | Readability rule | seo-analyzer | seo-analyzer (seed only) | yes (enum) |
| F4 | Broken links | crawler, seo-analyzer | (JSON in existing row) | yes |
| F5 | Dual Lighthouse | crawler | gateway (10 cols) | yes (interface) |

**Out of scope for Tier 1**: backlink analysis, SERP data, rank tracking, multi-tenant, white-label. Those are Tier 2/3.

## Forcing-escalation audit (CLAUDE.md)

- `@repo/shared` **does** change (enum + interfaces + queue constants) → MEDIUM minimum.
- Prisma schema **does** change in 2 services (gateway) → MEDIUM minimum.
- `packages/proto/**` **does NOT** change → **proto-breaking protocol not needed**.
- ≥2 `apps/*` touched → MEDIUM minimum.

Verdict: aggregates to **LARGE**. Apply WORKFLOW-LARGE end-to-end. No emergency exceptions.

## Sub-phase sequencing (dependency graph)

```
Sub-phase 1 (week 1)  │ F3 Readability  (rule engine only, no migration)
                      │ F5 Dual Lighthouse  (crawler + 10 cols migration)
Sub-phase 2 (wk 2-3)  │ F1 Site-wide Crawl  (big; new BullMQ topology + 2 tables)
Sub-phase 3 (week 4)  │ F4 Broken Links  (reuses F1 crawl cycle)
Sub-phase 4 (week 5)  │ F2 Scheduled Audits  (reuses F1 audit pipeline)
```

Each sub-phase runs its own CHIA-NHO → CODE → KIEM-DINH → SHIP. Ship incrementally; no single mega-PR.

## Prisma schema — final plan

All 5 features fold into **one gateway migration** per sub-phase (never bundled across sub-phases). Only gateway DB changes; seo-analyzer + report DB are untouched.

### Sub-phase 1 migration (F3 + F5)

`apps/gateway/prisma/migrations/<timestamp>_tier1_sp1_dual_lighthouse/migration.sql`:

```sql
ALTER TABLE "Audit"
  ADD COLUMN "mobileScore"        INTEGER,
  ADD COLUMN "mobileLcpMs"        INTEGER,
  ADD COLUMN "mobileFcpMs"        INTEGER,
  ADD COLUMN "mobileClsScore"     DOUBLE PRECISION,
  ADD COLUMN "mobileInpMs"        INTEGER,
  ADD COLUMN "desktopScore"       INTEGER,
  ADD COLUMN "desktopLcpMs"       INTEGER,
  ADD COLUMN "desktopFcpMs"       INTEGER,
  ADD COLUMN "desktopClsScore"    DOUBLE PRECISION,
  ADD COLUMN "desktopInpMs"       INTEGER;
```

F3 adds 1 seed row in **seo-analyzer** `prisma/seed.ts` only; no schema change.

### Sub-phase 2 migration (F1 Site-wide)

```sql
-- Enum
CREATE TYPE "AuditMode" AS ENUM ('SINGLE', 'SITE');
ALTER TABLE "Audit" ADD COLUMN "mode" "AuditMode" NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "Audit" ADD COLUMN "discoveredUrlsCount" INTEGER;
ALTER TABLE "Audit" ADD COLUMN "auditedUrlsCount" INTEGER;

-- New table
CREATE TABLE "PageAudit" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditId     UUID NOT NULL REFERENCES "Audit"(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  score       INTEGER NOT NULL,
  issues      JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetchedAt   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "PageAudit_auditId_idx" ON "PageAudit"(auditId);
CREATE INDEX "PageAudit_score_idx"   ON "PageAudit"(score);
```

### Sub-phase 3 migration (F4 Broken Links)

```sql
ALTER TABLE "Audit" ADD COLUMN "brokenLinks" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "PageAudit" ADD COLUMN "brokenLinks" JSONB DEFAULT '[]'::jsonb;
```

### Sub-phase 4 migration (F2 Scheduled)

```sql
CREATE TYPE "AlertType" AS ENUM ('SCORE_DROP', 'NEW_ISSUES', 'SITE_DOWN');

CREATE TABLE "ScheduledAudit" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId      UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  cron        TEXT NOT NULL,
  mode        "AuditMode" NOT NULL DEFAULT 'SINGLE',
  lastRunAt   TIMESTAMP,
  lastScore   INTEGER,
  isActive    BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "ScheduledAudit_userId_idx" ON "ScheduledAudit"(userId);

CREATE TABLE "AuditAlert" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditId     UUID NOT NULL REFERENCES "Audit"(id) ON DELETE CASCADE,
  type        "AlertType" NOT NULL,
  deltaScore  INTEGER,
  message     TEXT NOT NULL,
  sentAt      TIMESTAMP,
  createdAt   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "AuditAlert_auditId_idx" ON "AuditAlert"(auditId);
```

## BullMQ queue topology — final plan

### Existing queues (unchanged)

- `crawl.start`, `analyze.start`, `keyword.start`, `report.start`

### New queues (added incrementally per sub-phase)

| Sub-phase | Queue | Purpose |
|---|---|---|
| SP2 | `site-crawl.start` | Entry point for site-wide audit |
| SP2 | `site-crawl.url-audit` | Per-URL sub-audit (fan-out) |
| SP2 | `site-crawl.aggregate` | Collect fan-in → trigger report |
| SP4 | `scheduled-audit.tick` | Job Scheduler target (BullMQ v5+) |
| SP4 | `alert.send` | Alert dispatch queue |

Registered in `packages/shared/src/constants/bullmq.ts` under key `BULLMQ_QUEUES.siteCrawl.*` and `BULLMQ_QUEUES.scheduled.*`.

## `@repo/shared` changes — final list

Additive only — no breaking renames or deletes.

### Enum additions

```typescript
// packages/shared/src/index.ts
export enum IssueCategory {
  META = 'meta',
  HEADINGS = 'headings',
  IMAGES = 'images',
  LINKS = 'links',
  PERFORMANCE = 'performance',
  TECHNICAL = 'technical',
  CONTENT = 'content',         // ← F3
}

export enum AuditMode {          // ← F1
  SINGLE = 'single',
  SITE   = 'site',
}

export enum FormFactor {         // ← F5
  MOBILE  = 'mobile',
  DESKTOP = 'desktop',
}

export enum AlertType {          // ← F2
  SCORE_DROP  = 'score_drop',
  NEW_ISSUES  = 'new_issues',
  SITE_DOWN   = 'site_down',
}
```

### Interface additions

```typescript
export interface LighthouseScoreSet {
  score: number;
  lcpMs: number;
  fcpMs: number;
  clsScore: number;
  inpMs: number;
}

export interface DualLighthouse {
  mobile: LighthouseScoreSet;
  desktop: LighthouseScoreSet;
}

export interface LinkCheckResult {
  href: string;
  status: number;
  redirectChain: string[];
  isBroken: boolean;
  reason?: 'HTTP_4XX' | 'HTTP_5XX' | 'NETWORK' | 'TIMEOUT' | 'TOO_MANY_REDIRECTS';
}

export interface PageAuditSummary {
  url: string;
  score: number;
  issueCount: number;
}
```

### Constant additions

```typescript
// packages/shared/src/constants/bullmq.ts
export const BULLMQ_QUEUES = {
  // existing...
  siteCrawl: {
    start:     'site-crawl.start',
    urlAudit:  'site-crawl.url-audit',
    aggregate: 'site-crawl.aggregate',
  },
  scheduled: {
    tick: 'scheduled-audit.tick',
  },
  alert: {
    send: 'alert.send',
  },
};
```

## gRPC contract — no changes

Proto files in `packages/proto/**` are **not** touched. All new data flows through BullMQ payloads and Prisma, not synchronous gRPC.

Rationale: adding Lighthouse desktop/mobile scores, readability metric, broken-link results, and PageAudit rows does not require changing request/response shapes between services — gateway polls the same Audit row it always has.

## Data flow — unchanged for single-mode; site-mode is additive

### Single-mode (existing, Tier 0)

```
POST /audits → crawl.start → crawler → [analyze.start, keyword.start] 
            → both done → report.start → Audit completed
```

### Site-mode (new, Tier 1 SP2+)

```
POST /audits?mode=site → site-crawl.start 
                      → crawler sitemap-discovery → N URLs
                      → fan-out N × site-crawl.url-audit 
                      → each runs existing single-URL pipeline (analyze + keyword + partial report)
                      → counter fan-in → site-crawl.aggregate 
                      → final report.start (aggregated)
```

### Scheduled-mode (new, Tier 1 SP4)

```
BullMQ Job Scheduler (cron tick) → scheduled-audit.tick 
                                → enqueue normal crawl.start (single OR site)
                                → existing pipeline
                                → worker 'completed' event 
                                → regression-detector → alert.send if drop > threshold
```

## Edge case register (locked decisions)

| # | Case | Decision |
|---|---|---|
| 1 | Sitemap > 50k URLs | Read first 5000, store "truncated=true" flag in Audit metadata |
| 2 | Sitemap index nesting > 2 levels | Respect 2 levels only, skip deeper (warn) |
| 3 | robots.txt forbids crawl of root | Abort with user-visible error: "Site blocks crawlers" |
| 4 | Lighthouse timeout on 1 formFactor | Store partial scores, mark missing side null |
| 5 | Language not English | Readability rule skips cleanly (PASS with "not applicable") |
| 6 | Text < 30 words | Readability rule skips (too little data) |
| 7 | Broken link returns 429 | Retry with exponential backoff, mark as TIMEOUT if still 429 |
| 8 | Redirect loop (A→B→A) | Detect via visited set, mark as TOO_MANY_REDIRECTS |
| 9 | Scheduled cron in user's timezone | Store UTC-cron only; future feature: per-user TZ |
| 10 | User deletes account with active schedules | CASCADE delete ScheduledAudit rows + `removeJobScheduler` on each |
| 11 | Redis flushall / restart | Gateway `onApplicationBootstrap` re-registers all active schedulers |
| 12 | Dual-Lighthouse insufficient RAM | `LIGHTHOUSE_PARALLEL=false` env flag forces sequential |

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Site-wide crawl gets rate-limited / IP banned | High | Audit fails mid-flight | Polite fetcher: 4 concurrent, 1.5s delay, respect robots crawl-delay, proper User-Agent |
| Scheduled audits accumulate zombie jobs in Redis | Medium | Memory bloat | Re-register on boot + prune SCAN for schedulers whose DB row is gone |
| Lighthouse OOM on 1GB Railway instance | Medium | Service crash | Sequential mode default; parallel only when `LIGHTHOUSE_PARALLEL=true` + RAM check |
| Broken-link checker looks like DDoS to target | Low | Legal / reputation | Per-host concurrency cap 2, User-Agent identifies bot, 5s timeout |
| Readability false-positive on Vietnamese sites | Medium | User confusion | Skip cleanly when `lang != en`; do not score VN text with English formula |
| Large sitemaps eat disk (JSON blob) | Low | DB growth | Cap discoveredUrls at 5000; truncated flag |

## Testing strategy per sub-phase

| Sub-phase | Unit | Integration | E2E |
|---|---|---|---|
| SP1 (F3+F5) | Flesch formula against 10 known texts; Lighthouse config object shape | Run crawler against `test-fixtures/example.html` twice (mobile + desktop) | `e2e:smoke` passes (regression check) |
| SP2 (F1) | Sitemap XML parser; URL canonicalizer; robots parser | Polite fetcher against local server; 20-URL site crawl | Extended `e2e:smoke:site` |
| SP3 (F4) | Status code matrix; redirect chain counter | Page with 50 links of mixed status | Extended smoke |
| SP4 (F2) | Cron parser; regression threshold logic | `upsertJobScheduler` roundtrip; manual tick simulation | Manual scheduled-run check |

## Gates (WORKFLOW-LARGE KIEM DINH per sub-phase)

Each sub-phase must pass **all** of:

1. `turbo run check-types` — 0 errors
2. `turbo run test` — 100% passing, no skipped
3. `turbo run build` — 0 errors
4. `turbo run lint` — 0 errors
5. `npm run e2e:smoke` — full pipeline passes
6. `/review` — staff-eng review
7. `/cso` — OWASP Top 10 check
8. `/qa` — only for sub-phases touching UI (none in Tier 1 until frontend scaffolded)

## Sign-off

Architecture is frozen. Any deviation mid-execution triggers WORKFLOW-LARGE "scope escalation" protocol: STOP → re-open this doc → update → re-run `/plan-eng-review`.

Next step: Phase 2 CHIA-NHO for Sub-phase 1 (F3 + F5). See `docs/TIER1-SUBPHASE1-PLAN.md`.
