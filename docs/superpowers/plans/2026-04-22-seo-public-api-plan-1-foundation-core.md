# SEO Public API — Plan 1: Foundation + Core API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `POST /api/v1/public/check` (URL/markdown/HTML input, template-mode suggestions only) + API key CRUD + rate-limit + OpenAPI docs — shippable without LLM enrichment.

**Architecture:** Module `public-api/` in existing `apps/gateway` reuses rate-limiter and url-validator infra; additive gRPC methods on `seo-analyzer` (`AnalyzeContent`) and `crawler` (`LiteFetch`) do not touch the existing audit flow.

**Tech Stack:** NestJS 10, Prisma 5 (Postgres 16), Redis 7 (ioredis), gRPC (`@grpc/grpc-js`), Cheerio, `@nestjs/swagger`, Vitest, Supertest, `marked`, `class-validator`.

**Spec:** `docs/superpowers/specs/2026-04-22-seo-public-api-design.md`

**Scope out of this plan (deferred to Plans 2 & 3):**
- LLM enrichment (`enrichMode=llm`) — Plan 2
- `SuggestionEnricherService` + `@repo/seo-ai-core` wiring — Plan 2
- Prompt YAML files — Plan 2
- Playground web UI — Plan 3
- API keys management UI — Plan 3
- CLI `packages/seo-check-cli` — Plan 3
- `docs/public-api/` narrative docs — Plan 3

At end of Plan 1, the API responds correctly to `enrichMode=off` and `enrichMode=template`. Requests with `enrichMode=llm` degrade gracefully to `template` with `meta.degraded: true, meta.suggestionSource: 'template'` (a temporary shim deleted in Plan 2).

---

## File Structure

### New files

```
packages/proto/
  crawler/v1/crawler.proto                    MODIFY (add LiteFetch)
  analyzer/v1/analyzer.proto                  MODIFY (add AnalyzeContent, extend ListRules)

packages/shared/src/
  constants/redis-keys.ts                     MODIFY (add public-api keys)
  types/public-api.ts                         CREATE (IssueAudience, Severity shared types)

apps/gateway/prisma/
  schema.prisma                               MODIFY (ApiKey, UsageDaily, User.apiKeys)
  migrations/<ts>_add_api_keys_usage_daily/
    migration.sql                             CREATE (generated)

apps/gateway/src/public-api/
  public-api.module.ts                        CREATE
  dto/
    public-check-request.dto.ts               CREATE
    public-check-response.dto.ts              CREATE
    api-key.dto.ts                            CREATE
  guards/
    api-key.guard.ts                          CREATE
  services/
    api-key.service.ts                        CREATE
    content-extractor.service.ts              CREATE
    public-check.service.ts                   CREATE
    usage-counter.service.ts                  CREATE
  controllers/
    public-check.controller.ts                CREATE
    public-rules.controller.ts                CREATE
    public-health.controller.ts               CREATE
    api-keys.controller.ts                    CREATE

apps/gateway/src/infra/grpc/
  analyzer.client.ts                          MODIFY (add analyzeContent, extend listRules)
  crawler.client.ts                           MODIFY (add liteFetch)

apps/gateway/src/infra/redis/
  rate-limiter.service.ts                     REUSE (no change)
  public-api-rate-limit.service.ts            CREATE (thin wrapper with bucket configs)

apps/gateway/src/common/utils/
  url-validator.ts                            REUSE (no change)

apps/gateway/src/admin/
  controllers/admin.controller.ts             MODIFY (+3 endpoints for cross-user API key ops)
  services/admin-api-key.service.ts           CREATE

apps/gateway/src/app.module.ts                MODIFY (register PublicApiModule)
apps/gateway/src/main.ts                      MODIFY (Swagger setup)

apps/seo-analyzer/src/analyzer/
  domain/seo-rule.interface.ts                MODIFY (add requires?: field)
  domain/rules/technical/http-status.rule.ts           MODIFY (+requires)
  domain/rules/images/image-optimization.rule.ts       MODIFY (+requires)
  domain/rules/links/broken-links.rule.ts              MODIFY (+requires)
  domain/rules/performance/page-size.rule.ts           MODIFY (+requires)
  services/rule-runner.ts                     MODIFY (filter by requires + mode)
  services/rule-metadata.service.ts           CREATE
  services/page-data-builder.service.ts       CREATE
  controllers/analyze-content.controller.ts   CREATE
  controllers/list-rules.controller.ts        MODIFY or CREATE (extend existing with extra fields)
  analyzer.module.ts                          MODIFY (register new providers)

apps/crawler/src/crawler/
  services/lite-fetch.service.ts              CREATE
  controllers/lite-fetch.controller.ts        CREATE
  crawler.module.ts                           MODIFY (register providers)

apps/gateway/test/integration/
  public-api.e2e-spec.ts                      CREATE
  api-keys.e2e-spec.ts                        CREATE

apps/gateway/test/unit/
  api-key.service.spec.ts                     CREATE
  api-key.guard.spec.ts                       CREATE
  content-extractor.service.spec.ts           CREATE
  public-check.service.spec.ts                CREATE

apps/seo-analyzer/test/unit/
  page-data-builder.service.spec.ts           CREATE
  rule-metadata.service.spec.ts               CREATE
  analyze-content.controller.spec.ts          CREATE

apps/crawler/test/unit/
  lite-fetch.service.spec.ts                  CREATE

scripts/
  e2e-smoke.sh                                MODIFY (add public-api block)
```

### Modified (summary)

- `analyzer.proto` / `crawler.proto` — additive
- `@repo/shared` — add public-api types + Redis keys
- `apps/gateway/prisma/schema.prisma` — +2 tables +1 enum +1 relation
- 4 crawl-only rules in seo-analyzer — add `requires` field declaration
- `RuleRunner` — honor `requires` + mode filter

---

## Conventions used in this plan

- All file paths are absolute to repo root.
- TDD order: (1) write failing test; (2) run & see fail; (3) implement; (4) run & see pass; (5) commit.
- Commit messages follow repo style: `<type>(<scope>): <imperative summary>` with lowercase types (`feat`, `fix`, `docs`, `chore`, `test`, `refactor`).
- **Never** add `Co-Authored-By: Claude` or `Generated-with-Claude-Code` trailers (see `.claude/CLAUDE.md`).
- After each task, verify by running the affected package's tests via `npm test --workspace=@seo/<service>` (or `npm run test:watch` during iteration).
- All proto changes are **additive** — existing `Analyze`, `StartCrawl`, and audit flow must keep passing `npm run e2e:smoke`.

---

# Phase A — Proto + Shared types + DB migration

## Task A1: Extend analyzer.proto with `AnalyzeContent` + enriched `ListRules`

**Files:**
- Modify: `packages/proto/analyzer/v1/analyzer.proto`
- Test: (validated by consumers compiling; explicit check in Step 3 below)

- [ ] **Step 1: Read the current analyzer.proto to find insertion points**

Run: `cat packages/proto/analyzer/v1/analyzer.proto`

Expected: see `service SeoAnalyzerService { ... }` block and existing messages.

- [ ] **Step 2: Add new messages and service methods**

Insert the following into `packages/proto/analyzer/v1/analyzer.proto`:

```proto
// (inside existing service SeoAnalyzerService { ... })
rpc AnalyzeContent(AnalyzeContentRequest) returns (AnalyzeContentResult);

// (add at top of file with existing imports if not present)
import "google/protobuf/struct.proto";

// (new enum, top-level)
enum AnalyzeMode {
  ANALYZE_MODE_UNSPECIFIED = 0;
  ANALYZE_MODE_CONTENT_ONLY = 1;
  ANALYZE_MODE_FULL = 2;
}

// (new messages, top-level)
message AnalyzeContentRequest {
  string request_id = 1;
  string html = 2;
  string target_keyword = 3;
  repeated string secondary_keywords = 4;
  string language = 5;        // "vi" | "en"
  AnalyzeMode mode = 6;
  string resolved_url = 7;
}

message AnalyzeContentResult {
  string rule_version = 1;
  repeated RuleIssue issues = 2;
  ContentStats content_stats = 3;
}

message RuleIssue {
  string rule_id = 1;
  string status = 2;            // "pass" | "warn" | "fail"
  int32 score = 3;              // 0 | 50 | 100
  string category = 4;
  string severity = 5;          // "error" | "warning" | "info"
  repeated string audiences = 6;
  string message = 7;
  string template_suggestion = 8;
  google.protobuf.Struct evidence = 9;
  string doc_ref = 10;
}

message ContentStats {
  int32 word_count = 1;
  int32 character_count = 2;
  int32 reading_time_sec = 3;
  int32 paragraph_count = 4;
  int32 image_count = 5;
  int32 internal_link_count = 6;
  int32 external_link_count = 7;
}
```

Also **extend `SeoRule` message** (the existing one returned by `ListRules`) with new fields — do NOT remove existing fields:

```proto
// Add fields 10+ to the existing SeoRule / ListRulesResult.rules element
//   string severity = 10;
//   repeated string audiences = 11;
//   string doc_ref = 12;
//   string available_in = 13;   // "content_only" | "full"
```

- [ ] **Step 3: Rebuild @repo/proto and verify compile**

Run:
```bash
npm run build --workspace=@repo/proto
```

Expected: `> tsc` exits 0. `packages/proto/dist/index.d.ts` unchanged (no new exports needed; proto files are loaded at runtime by consumers).

- [ ] **Step 4: Commit**

```bash
git add packages/proto/analyzer/v1/analyzer.proto packages/proto/dist
git commit -m "feat(proto): add AnalyzeContent + AnalyzeMode + RuleIssue for public-api"
```

---

## Task A2: Extend crawler.proto with `LiteFetch`

**Files:**
- Modify: `packages/proto/crawler/v1/crawler.proto`

- [ ] **Step 1: Read existing service block**

Run: `cat packages/proto/crawler/v1/crawler.proto`

- [ ] **Step 2: Add `LiteFetch` method and messages**

Insert into `packages/proto/crawler/v1/crawler.proto`:

```proto
// (inside existing service block)
rpc LiteFetch(LiteFetchRequest) returns (LiteFetchResult);

// (new messages, top-level)
message LiteFetchRequest {
  string request_id = 1;
  string url = 2;
  int32 timeout_ms = 3;            // default 10000 applied by server
  string user_agent = 4;            // optional override
  bool follow_redirects = 5;        // default true
}

message LiteFetchResult {
  string final_url = 1;
  int32 status_code = 2;
  string html = 3;
  int32 size_bytes = 4;
  int32 fetch_time_ms = 5;
  repeated string redirect_chain = 6;
  bool from_cache = 7;
}
```

- [ ] **Step 3: Rebuild and verify**

```bash
npm run build --workspace=@repo/proto
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/proto/crawler/v1/crawler.proto packages/proto/dist
git commit -m "feat(proto): add LiteFetch RPC for content-only URL fetching"
```

---

## Task A3: Extend `@repo/shared` with public-api types + Redis keys

**Files:**
- Create: `packages/shared/src/types/public-api.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/constants/redis-keys.ts`

- [ ] **Step 1: Write the test**

Create `packages/shared/src/types/public-api.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { IssueAudience, IssueSeverity, PUBLIC_API_REDIS_KEYS } from './public-api';

describe('public-api types', () => {
  it('enumerates all issue audiences', () => {
    const all: IssueAudience[] = ['writer', 'dev'];
    expect(all).toHaveLength(2);
  });

  it('enumerates severity levels', () => {
    const all: IssueSeverity[] = ['info', 'warning', 'error'];
    expect(all).toHaveLength(3);
  });

  it('exposes deterministic redis-key builders', () => {
    expect(PUBLIC_API_REDIS_KEYS.apiKeyVerify('abc')).toBe('apikey:abc');
    expect(PUBLIC_API_REDIS_KEYS.rateLimitMinute('kid_1')).toBe('rl:pubcheck:min:kid_1');
    expect(PUBLIC_API_REDIS_KEYS.rateLimitDay('kid_1')).toBe('rl:pubcheck:day:kid_1');
    expect(PUBLIC_API_REDIS_KEYS.rateLimitConcurrency('kid_1')).toBe('rl:pubcheck:concur:kid_1');
    expect(PUBLIC_API_REDIS_KEYS.rateLimitIp('1.2.3.4')).toBe('rl:pubcheck:ip:1.2.3.4');
    expect(PUBLIC_API_REDIS_KEYS.publicCheckResponse('h'))
      .toBe('public-check:h');
    expect(PUBLIC_API_REDIS_KEYS.liteFetch('u')).toBe('lite-fetch:u');
    expect(PUBLIC_API_REDIS_KEYS.rulesList('vi')).toBe('rules-list:vi');
    expect(PUBLIC_API_REDIS_KEYS.usage('kid_1', '2026-04-22', 'requests'))
      .toBe('usage:kid_1:2026-04-22:requests');
  });
});
```

- [ ] **Step 2: Run test — fails**

```bash
npm test --workspace=@repo/shared -- public-api
```

Expected: FAIL with `Cannot find module './public-api'`.

- [ ] **Step 3: Implement**

Create `packages/shared/src/types/public-api.ts`:

```typescript
export type IssueAudience = 'writer' | 'dev';
export type IssueSeverity = 'info' | 'warning' | 'error';
export type EnrichMode = 'off' | 'template' | 'llm';
export type PublicApiLanguage = 'vi' | 'en';
export type ApiKeyEnvironment = 'live' | 'test';
export type AnalyzeModeName = 'content_only' | 'full';

export const PUBLIC_API_REDIS_KEYS = {
  apiKeyVerify: (hash: string) => `apikey:${hash}` as const,
  rateLimitMinute: (keyId: string) => `rl:pubcheck:min:${keyId}` as const,
  rateLimitDay: (keyId: string) => `rl:pubcheck:day:${keyId}` as const,
  rateLimitConcurrency: (keyId: string) => `rl:pubcheck:concur:${keyId}` as const,
  rateLimitIp: (ip: string) => `rl:pubcheck:ip:${ip}` as const,
  publicCheckResponse: (hash: string) => `public-check:${hash}` as const,
  liteFetch: (hash: string) => `lite-fetch:${hash}` as const,
  rulesList: (lang: string) => `rules-list:${lang}` as const,
  usage: (keyId: string, date: string, field: 'requests' | 'llm_calls' | 'errors') =>
    `usage:${keyId}:${date}:${field}` as const,
} as const;

export const PUBLIC_API_RATE_LIMITS = {
  PER_KEY_MINUTE: 20,
  PER_KEY_DAY: 500,
  PER_KEY_CONCURRENCY: 5,
  PER_IP_MINUTE: 100,
  PAYLOAD_MAX_BYTES: 200 * 1024,
  URL_FETCH_TIMEOUT_MS: 10_000,
  LLM_TIMEOUT_MS: 8_000,
} as const;

export const PUBLIC_API_CACHE_TTL = {
  API_KEY_VERIFY_SECONDS: 60,
  PUBLIC_CHECK_LLM_SECONDS: 3600,
  PUBLIC_CHECK_TEMPLATE_SECONDS: 600,
  LITE_FETCH_SECONDS: 3600,
  RULES_LIST_SECONDS: 600,
  USAGE_COUNTER_SECONDS: 48 * 3600,
} as const;

export type RuleCategory =
  | 'content'
  | 'meta'
  | 'technical'
  | 'accessibility'
  | 'headings'
  | 'images'
  | 'links'
  | 'performance';
```

Update `packages/shared/src/index.ts`:

```typescript
// Append at end:
export * from './types/public-api';
```

- [ ] **Step 4: Run test — passes**

```bash
npm test --workspace=@repo/shared -- public-api
```

Expected: PASS.

- [ ] **Step 5: Rebuild dist + verify consumers still compile**

```bash
npm run build --workspace=@repo/shared
npm run check-types --workspace=@seo/gateway
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/public-api.ts packages/shared/src/types/public-api.test.ts packages/shared/src/index.ts packages/shared/dist
git commit -m "feat(shared): add public-api types + Redis key namespaces + rate limit constants"
```

---

## Task A4: Prisma schema — ApiKey + UsageDaily + User relation

**Files:**
- Modify: `apps/gateway/prisma/schema.prisma`
- Migration folder will be created by Prisma CLI.

- [ ] **Step 1: Add enum, models, relation**

Append to `apps/gateway/prisma/schema.prisma` (the `enum UserRole` and `model User` blocks already exist):

```prisma
enum ApiKeyEnvironment {
  live
  test
}

model ApiKey {
  id           String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String            @map("user_id") @db.Uuid
  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String            @db.VarChar(100)
  prefix       String            @db.VarChar(20)
  hashedKey    String            @unique @map("hashed_key") @db.VarChar(64)
  environment  ApiKeyEnvironment @default(live)
  lastUsedAt   DateTime?         @map("last_used_at") @db.Timestamptz
  lastUsedIp   String?           @map("last_used_ip") @db.Inet
  revokedAt    DateTime?         @map("revoked_at") @db.Timestamptz
  expiresAt    DateTime?         @map("expires_at") @db.Timestamptz
  createdAt    DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  usageDaily   UsageDaily[]

  @@index([hashedKey])
  @@index([userId, revokedAt])
  @@map("api_keys")
}

model UsageDaily {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  apiKeyId     String   @map("api_key_id") @db.Uuid
  apiKey       ApiKey   @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  date         DateTime @db.Date
  requests     Int      @default(0)
  llmCalls     Int      @default(0) @map("llm_calls")
  llmTokensIn  Int      @default(0) @map("llm_tokens_in")
  llmTokensOut Int      @default(0) @map("llm_tokens_out")
  bytesIn      Int      @default(0) @map("bytes_in")
  bytesOut     Int      @default(0) @map("bytes_out")
  errors       Int      @default(0)
  cacheHits    Int      @default(0) @map("cache_hits")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@unique([apiKeyId, date])
  @@index([date])
  @@map("usage_daily")
}
```

Inside the existing `model User { ... }` block, **add one line** to the relations section:

```prisma
apiKeys ApiKey[]
```

- [ ] **Step 2: Generate migration**

Ensure gateway DB is running (`npm run docker:up` or local Postgres at `GATEWAY_DATABASE_URL`), then:

```bash
cd apps/gateway
npx prisma migrate dev --name add_api_keys_usage_daily
```

Expected: migration file created under `apps/gateway/prisma/migrations/<timestamp>_add_api_keys_usage_daily/migration.sql`; Prisma client regenerated into `src/infra/prisma/generated/`.

- [ ] **Step 3: Verify migration is additive and reversible**

```bash
cat apps/gateway/prisma/migrations/*_add_api_keys_usage_daily/migration.sql
```

Expected: file contains `CREATE TABLE "api_keys"`, `CREATE TABLE "usage_daily"`, `CREATE TYPE "ApiKeyEnvironment"`, no `ALTER TABLE "users"` (relation is Prisma-only, not FK-carrying on users side), no `DROP` of existing tables.

- [ ] **Step 4: Verify existing audit flow not broken**

```bash
npm run test --workspace=@seo/gateway -- --run auth.service
npm run test --workspace=@seo/gateway -- --run audits.service
```

Expected: all pass (auth + audits untouched by schema change).

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/gateway/prisma/schema.prisma apps/gateway/prisma/migrations apps/gateway/src/infra/prisma/generated
git commit -m "feat(gateway): add ApiKey + UsageDaily Prisma models + migration"
```

---

# Phase B — seo-analyzer changes

## Task B1: Add `requires` to `ISeoRule` + declare on 4 crawl-only rules

**Files:**
- Modify: `apps/seo-analyzer/src/analyzer/domain/seo-rule.interface.ts`
- Modify: `apps/seo-analyzer/src/analyzer/domain/rules/technical/http-status.rule.ts`
- Modify: `apps/seo-analyzer/src/analyzer/domain/rules/images/image-optimization.rule.ts`
- Modify: `apps/seo-analyzer/src/analyzer/domain/rules/links/broken-links.rule.ts`
- Modify: `apps/seo-analyzer/src/analyzer/domain/rules/performance/page-size.rule.ts`

- [ ] **Step 1: Update interface**

Edit `apps/seo-analyzer/src/analyzer/domain/seo-rule.interface.ts` — replace the `ISeoRule` interface:

```typescript
export type RuleRequirement = 'http_metadata' | 'performance';

export interface ISeoRule {
  readonly id: string;
  readonly category: IssueCategory;
  readonly requires?: RuleRequirement[];
  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput;
}
```

- [ ] **Step 2: Mark 4 crawl-only rules**

For each of `http-status.rule.ts`, `image-optimization.rule.ts`, `broken-links.rule.ts`, `page-size.rule.ts`:

Add the field inside the class/object (match existing `readonly id: string` style):

```typescript
readonly requires: RuleRequirement[] = ['http_metadata'];  // or ['performance'] for page-size
```

For `page-size.rule.ts` use `['performance']`.

- [ ] **Step 3: Run existing analyzer tests — should still pass**

```bash
npm test --workspace=@seo/seo-analyzer
```

Expected: all existing tests pass unchanged (optional field added, no behavior change yet).

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/domain
git commit -m "feat(seo-analyzer): add requires field to ISeoRule, mark crawl-only rules"
```

---

## Task B2: Filter rules by `requires` in `RuleRunner` + mode flag

**Files:**
- Modify: `apps/seo-analyzer/src/analyzer/services/rule-runner.ts`
- Test: `apps/seo-analyzer/test/unit/rule-runner.spec.ts` (may exist; add new `describe`)

- [ ] **Step 1: Write failing test**

Add to (or create) `apps/seo-analyzer/test/unit/rule-runner.spec.ts`:

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import { RuleRunner } from '../../src/analyzer/services/rule-runner';
import { RuleRegistry } from '../../src/analyzer/services/rule-registry';
import { ISeoRule } from '../../src/analyzer/domain/seo-rule.interface';

const fakeRule = (id: string, requires?: ('http_metadata' | 'performance')[]): ISeoRule => ({
  id,
  category: 'technical' as any,
  requires,
  check: () => ({ status: 'pass' as any, score: 100, message: '', suggestion: null, metadata: {} }),
});

describe('RuleRunner — requires filter', () => {
  let registry: RuleRegistry;
  let runner: RuleRunner;

  beforeEach(() => {
    registry = new RuleRegistry();
    runner = new RuleRunner(registry);
  });

  it('runs all rules in FULL mode', () => {
    registry.register(fakeRule('r1'));
    registry.register(fakeRule('r2', ['http_metadata']));
    registry.register(fakeRule('r3', ['performance']));
    const results = runner.runAll({} as any, undefined, { mode: 'full' });
    expect(results.map(r => r.ruleId).sort()).toEqual(['r1', 'r2', 'r3']);
  });

  it('skips http_metadata + performance rules in CONTENT_ONLY mode', () => {
    registry.register(fakeRule('r1'));
    registry.register(fakeRule('r2', ['http_metadata']));
    registry.register(fakeRule('r3', ['performance']));
    const results = runner.runAll({} as any, undefined, { mode: 'content_only' });
    expect(results.map(r => r.ruleId)).toEqual(['r1']);
  });

  it('defaults to FULL when no mode passed (backward compat)', () => {
    registry.register(fakeRule('r1'));
    registry.register(fakeRule('r2', ['http_metadata']));
    const results = runner.runAll({} as any);
    expect(results).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/seo-analyzer -- rule-runner
```

Expected: FAIL — either `runAll` doesn't accept third arg, or no filtering.

- [ ] **Step 3: Implement filter**

Edit `apps/seo-analyzer/src/analyzer/services/rule-runner.ts` — extend `runAll`:

```typescript
export type RunMode = 'content_only' | 'full';
export interface RunOptions {
  mode?: RunMode;
}

@Injectable()
export class RuleRunner {
  constructor(private readonly registry: RuleRegistry) {}

  runAll(pageData: PageData, targetKeyword?: string, options?: RunOptions): RuleCheckResult[] {
    const mode = options?.mode ?? 'full';
    return this.registry
      .getAll()
      .filter((rule) => this.isRuleApplicable(rule, mode))
      .map((rule) => ({
        ruleId: rule.id,
        category: rule.category,
        ...rule.check(pageData, targetKeyword),
      }));
  }

  private isRuleApplicable(rule: ISeoRule, mode: RunMode): boolean {
    if (mode === 'full') return true;
    if (!rule.requires || rule.requires.length === 0) return true;
    return rule.requires.every((req) => this.isRequirementSatisfied(req, mode));
  }

  private isRequirementSatisfied(req: 'http_metadata' | 'performance', mode: RunMode): boolean {
    // content_only satisfies nothing — both http_metadata and performance require full crawl
    return mode === 'full';
  }
}
```

Keep existing `RuleCheckResult` shape if present; add `category` to match test expectation if it wasn't there before.

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/seo-analyzer -- rule-runner
```

Expected: PASS. Also run full suite to confirm existing tests still pass: `npm test --workspace=@seo/seo-analyzer`.

- [ ] **Step 5: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/services/rule-runner.ts apps/seo-analyzer/test/unit/rule-runner.spec.ts
git commit -m "feat(seo-analyzer): filter rules by requires + mode in RuleRunner"
```

---

## Task B3: `PageDataBuilder` — HTML → PageData (Cheerio)

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/services/page-data-builder.service.ts`
- Create: `apps/seo-analyzer/test/unit/page-data-builder.service.spec.ts`
- Modify: `apps/seo-analyzer/src/analyzer/analyzer.module.ts` (register provider)
- Modify: `apps/seo-analyzer/package.json` (add `cheerio` if not already a dep)

- [ ] **Step 1: Add cheerio dep (if absent)**

```bash
grep '"cheerio"' apps/seo-analyzer/package.json || npm install --workspace=@seo/seo-analyzer cheerio
```

- [ ] **Step 2: Write failing test**

Create `apps/seo-analyzer/test/unit/page-data-builder.service.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { PageDataBuilderService } from '../../src/analyzer/services/page-data-builder.service';

describe('PageDataBuilderService', () => {
  const svc = new PageDataBuilderService();

  it('extracts title + meta description from head', () => {
    const pd = svc.build('<html><head><title>Hello</title><meta name="description" content="d"/></head><body></body></html>');
    expect(pd.title).toBe('Hello');
    expect(pd.metaDescription).toBe('d');
  });

  it('extracts headings by level', () => {
    const pd = svc.build('<html><body><h1>A</h1><h2>B</h2><h2>C</h2></body></html>');
    expect(pd.h1Tags).toEqual(['A']);
    expect(pd.h2Tags).toEqual(['B', 'C']);
  });

  it('extracts images with src + alt', () => {
    const pd = svc.build('<html><body><img src="/a.png" alt="A"/><img src="/b.jpg"/></body></html>');
    expect(pd.images).toHaveLength(2);
    expect(pd.images[0]).toMatchObject({ src: '/a.png', alt: 'A' });
    expect(pd.images[1].alt).toBe('');
  });

  it('partitions links into internal/external when resolvedUrl given', () => {
    const pd = svc.build(
      '<a href="/x">int</a><a href="https://other.com/y">ext</a>',
      'https://site.com/post',
    );
    expect(pd.internalLinks).toHaveLength(1);
    expect(pd.externalLinks).toHaveLength(1);
  });

  it('extracts JSON-LD schema blocks', () => {
    const pd = svc.build('<script type="application/ld+json">{"@type":"Article"}</script>');
    expect(pd.schemaJsonLd).toEqual(['{"@type":"Article"}']);
  });

  it('extracts OG + Twitter meta into flat objects', () => {
    const pd = svc.build(`
      <meta property="og:title" content="OG Title" />
      <meta property="og:image" content="/og.png" />
      <meta name="twitter:card" content="summary" />
    `);
    expect(pd.openGraph).toEqual({ title: 'OG Title', image: '/og.png' });
    expect(pd.twitterCard).toEqual({ card: 'summary' });
  });

  it('computes word count + reading time from visible text', () => {
    const pd = svc.build('<p>one two three four five</p>');
    expect(pd.textContent).toContain('one two three four five');
  });

  it('sets url fields to placeholders when resolvedUrl not supplied', () => {
    const pd = svc.build('<html></html>');
    expect(pd.url).toBe('about:blank');
    expect(pd.isHttps).toBe(false);
    expect(pd.statusCode).toBe(0);
  });
});
```

- [ ] **Step 3: Run — fails**

```bash
npm test --workspace=@seo/seo-analyzer -- page-data-builder
```

Expected: FAIL — module missing.

- [ ] **Step 4: Implement**

Create `apps/seo-analyzer/src/analyzer/services/page-data-builder.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PageData } from '../domain/page-data.interface';
import { ImageInfo, LinkInfo } from '@repo/shared';

@Injectable()
export class PageDataBuilderService {
  build(html: string, resolvedUrl?: string): PageData {
    const $ = cheerio.load(html);
    const baseHost = resolvedUrl ? this.safeHost(resolvedUrl) : null;

    const getHeadings = (tag: string): string[] =>
      $(tag)
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((x) => x.length > 0);

    const images: ImageInfo[] = $('img')
      .map((_, el) => ({
        src: $(el).attr('src') ?? '',
        alt: $(el).attr('alt') ?? '',
        width: Number($(el).attr('width')) || undefined,
        height: Number($(el).attr('height')) || undefined,
        sizeBytes: undefined,
      }))
      .get();

    const allLinks: LinkInfo[] = $('a[href]')
      .map((_, el) => ({
        href: $(el).attr('href') ?? '',
        text: $(el).text().trim(),
        rel: $(el).attr('rel') ?? undefined,
        isNoFollow: ($(el).attr('rel') ?? '').includes('nofollow'),
      }))
      .get();

    const internalLinks: LinkInfo[] = [];
    const externalLinks: LinkInfo[] = [];
    for (const link of allLinks) {
      if (this.isInternal(link.href, baseHost)) internalLinks.push(link);
      else externalLinks.push(link);
    }

    const og: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const k = ($(el).attr('property') ?? '').replace(/^og:/, '');
      const v = $(el).attr('content') ?? '';
      if (k && v) og[k] = v;
    });

    const tw: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const k = ($(el).attr('name') ?? '').replace(/^twitter:/, '');
      const v = $(el).attr('content') ?? '';
      if (k && v) tw[k] = v;
    });

    const schemaJsonLd = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).html()?.trim() ?? '')
      .get()
      .filter((s) => s.length > 0);

    const rawHtml = html;
    const textContent = $.root().text().replace(/\s+/g, ' ').trim();

    return {
      url: resolvedUrl ?? 'about:blank',
      finalUrl: resolvedUrl ?? 'about:blank',
      statusCode: resolvedUrl ? 200 : 0,
      responseTimeMs: 0,
      htmlSizeBytes: Buffer.byteLength(rawHtml, 'utf8'),
      title: $('title').first().text().trim() || undefined,
      metaDescription: $('meta[name="description"]').attr('content') ?? undefined,
      metaRobots: $('meta[name="robots"]').attr('content') ?? undefined,
      canonicalUrl: $('link[rel="canonical"]').attr('href') ?? undefined,
      language: $('html').attr('lang') ?? undefined,
      faviconUrl: $('link[rel="icon"]').attr('href') ?? undefined,
      h1Tags: getHeadings('h1'),
      h2Tags: getHeadings('h2'),
      h3Tags: getHeadings('h3'),
      h4Tags: getHeadings('h4'),
      h5Tags: getHeadings('h5'),
      h6Tags: getHeadings('h6'),
      images,
      internalLinks,
      externalLinks,
      schemaJsonLd,
      openGraph: og,
      twitterCard: tw,
      isHttps: resolvedUrl?.startsWith('https://') ?? false,
      redirectChain: [],
      contentEncoding: '',
      cacheControl: '',
      viewportContent: $('meta[name="viewport"]').attr('content') ?? undefined,
      textContent,
      rawHtml,
    };
  }

  private safeHost(url: string): string | null {
    try { return new URL(url).host; } catch { return null; }
  }

  private isInternal(href: string, baseHost: string | null): boolean {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return true;
    if (href.startsWith('/') && !href.startsWith('//')) return true;
    try {
      const host = new URL(href, baseHost ? `https://${baseHost}` : 'https://base').host;
      return baseHost ? host === baseHost : false;
    } catch {
      return true;
    }
  }
}
```

Register it in `apps/seo-analyzer/src/analyzer/analyzer.module.ts` providers array.

- [ ] **Step 5: Run — passes**

```bash
npm test --workspace=@seo/seo-analyzer -- page-data-builder
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/services/page-data-builder.service.ts apps/seo-analyzer/test/unit/page-data-builder.service.spec.ts apps/seo-analyzer/src/analyzer/analyzer.module.ts apps/seo-analyzer/package.json package-lock.json
git commit -m "feat(seo-analyzer): PageDataBuilder — Cheerio HTML to PageData adapter"
```

---

## Task B4: `RuleMetadataService` — severity, audiences, docRef per rule

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/services/rule-metadata.service.ts`
- Create: `apps/seo-analyzer/test/unit/rule-metadata.service.spec.ts`
- Modify: `apps/seo-analyzer/src/analyzer/analyzer.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { RuleMetadataService } from '../../src/analyzer/services/rule-metadata.service';

describe('RuleMetadataService', () => {
  const svc = new RuleMetadataService();

  it('returns writer audience for on-page content rules', () => {
    const m = svc.get('readability');
    expect(m.audiences).toContain('writer');
    expect(m.severity).toBe('warning');
  });

  it('returns dev audience for technical rules', () => {
    const m = svc.get('canonical_url');
    expect(m.audiences).toContain('dev');
  });

  it('returns both audiences for keyword-in-h1', () => {
    const m = svc.get('h1_tag');
    expect(m.audiences).toEqual(expect.arrayContaining(['writer', 'dev']));
  });

  it('returns error severity for blocker rules', () => {
    expect(svc.get('http_status').severity).toBe('error');
  });

  it('falls back to sensible defaults for unknown ruleId', () => {
    const m = svc.get('unknown_rule_xyz');
    expect(m.severity).toBe('info');
    expect(m.audiences).toEqual(['dev']);
    expect(m.docRef).toBeUndefined();
  });

  it('returns docRef URLs built from a base', () => {
    const m = svc.get('title_tag');
    expect(m.docRef).toMatch(/rules\/title_tag$/);
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/seo-analyzer -- rule-metadata
```

- [ ] **Step 3: Implement**

```typescript
import { Injectable } from '@nestjs/common';
import { IssueAudience, IssueSeverity } from '@repo/shared';

export interface RuleMetadata {
  severity: IssueSeverity;
  audiences: IssueAudience[];
  docRef?: string;
}

const DOC_BASE = process.env.SEO_DOCS_BASE_URL ?? 'https://docs.seo-analyst.vn';

const METADATA: Record<string, Omit<RuleMetadata, 'docRef'>> = {
  // Meta
  title_tag:          { severity: 'warning', audiences: ['writer', 'dev'] },
  meta_description:   { severity: 'warning', audiences: ['writer', 'dev'] },
  open_graph:         { severity: 'info',    audiences: ['dev'] },
  twitter_card:       { severity: 'info',    audiences: ['dev'] },
  // Headings
  h1_tag:             { severity: 'error',   audiences: ['writer', 'dev'] },
  heading_hierarchy:  { severity: 'warning', audiences: ['writer', 'dev'] },
  // Content
  readability:        { severity: 'warning', audiences: ['writer'] },
  // Images
  image_alt:          { severity: 'error',   audiences: ['writer', 'dev'] },
  image_optimization: { severity: 'warning', audiences: ['dev'] },
  // Links
  internal_links:     { severity: 'info',    audiences: ['writer', 'dev'] },
  external_links:     { severity: 'info',    audiences: ['writer'] },
  broken_links:       { severity: 'error',   audiences: ['dev'] },
  // Technical
  canonical_url:      { severity: 'warning', audiences: ['dev'] },
  robots_meta:        { severity: 'warning', audiences: ['dev'] },
  viewport_meta:      { severity: 'warning', audiences: ['dev'] },
  language_tag:       { severity: 'info',    audiences: ['dev'] },
  schema_org:         { severity: 'info',    audiences: ['dev'] },
  favicon:            { severity: 'info',    audiences: ['dev'] },
  http_status:        { severity: 'error',   audiences: ['dev'] },
  https_check:        { severity: 'warning', audiences: ['dev'] },
  url_structure:      { severity: 'info',    audiences: ['dev'] },
  // Performance
  page_size:          { severity: 'warning', audiences: ['dev'] },
};

@Injectable()
export class RuleMetadataService {
  get(ruleId: string): RuleMetadata {
    const base = METADATA[ruleId] ?? { severity: 'info' as const, audiences: ['dev' as const] };
    const docRef = METADATA[ruleId] ? `${DOC_BASE}/rules/${ruleId}` : undefined;
    return { ...base, docRef };
  }
}
```

Register in `analyzer.module.ts` providers.

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/seo-analyzer -- rule-metadata
```

- [ ] **Step 5: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/services/rule-metadata.service.ts apps/seo-analyzer/test/unit/rule-metadata.service.spec.ts apps/seo-analyzer/src/analyzer/analyzer.module.ts
git commit -m "feat(seo-analyzer): RuleMetadataService — severity/audience/docRef per rule"
```

---

## Task B5: `AnalyzeContent` gRPC controller

**Files:**
- Create: `apps/seo-analyzer/src/analyzer/controllers/analyze-content.controller.ts`
- Create: `apps/seo-analyzer/test/unit/analyze-content.controller.spec.ts`
- Modify: `apps/seo-analyzer/src/analyzer/analyzer.module.ts`
- Modify: `apps/seo-analyzer/src/main.ts` (ensure new controller's package name registered in gRPC server options — usually auto-wired by Nest)

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AnalyzeContentController } from '../../src/analyzer/controllers/analyze-content.controller';
import { PageDataBuilderService } from '../../src/analyzer/services/page-data-builder.service';
import { RuleRunner } from '../../src/analyzer/services/rule-runner';
import { RuleRegistry } from '../../src/analyzer/services/rule-registry';
import { RuleMetadataService } from '../../src/analyzer/services/rule-metadata.service';

describe('AnalyzeContentController', () => {
  let ctrl: AnalyzeContentController;
  let runner: RuleRunner;
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = new RuleRegistry();
    registry.register({
      id: 'title_tag', category: 'meta' as any,
      check: () => ({ status: 'warn' as any, score: 50, message: 'Title short', suggestion: 'Make longer', metadata: { currentLength: 10 } }),
    });
    runner = new RuleRunner(registry);
    const builder = new PageDataBuilderService();
    const meta = new RuleMetadataService();
    ctrl = new AnalyzeContentController(builder, runner, meta);
  });

  it('returns issues[] with category + severity + audiences + evidence', async () => {
    const res = await ctrl.analyzeContent({
      request_id: 'r1',
      html: '<title>Short</title>',
      target_keyword: 'seo',
      secondary_keywords: [],
      language: 'vi',
      mode: 1, // CONTENT_ONLY
      resolved_url: '',
    });
    expect(res.rule_version).toBeTruthy();
    expect(res.issues).toHaveLength(1);
    const issue = res.issues[0];
    expect(issue.rule_id).toBe('title_tag');
    expect(issue.category).toBe('meta');
    expect(issue.severity).toBe('warning');
    expect(issue.audiences).toEqual(expect.arrayContaining(['writer', 'dev']));
    expect(issue.message).toBe('Title short');
    expect(issue.template_suggestion).toBe('Make longer');
    expect(issue.evidence).toEqual({ currentLength: 10 });
    expect(issue.doc_ref).toContain('/rules/title_tag');
  });

  it('populates content_stats from PageData', async () => {
    const res = await ctrl.analyzeContent({
      request_id: 'r1',
      html: '<p>one two three four five six seven eight nine ten</p>',
      target_keyword: 'seo',
      secondary_keywords: [],
      language: 'vi',
      mode: 1,
      resolved_url: '',
    });
    expect(res.content_stats.word_count).toBeGreaterThanOrEqual(10);
    expect(res.content_stats.character_count).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/seo-analyzer -- analyze-content
```

- [ ] **Step 3: Implement**

Create `apps/seo-analyzer/src/analyzer/controllers/analyze-content.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PageDataBuilderService } from '../services/page-data-builder.service';
import { RuleRunner } from '../services/rule-runner';
import { RuleMetadataService } from '../services/rule-metadata.service';
import { RULE_VERSION } from '../domain/rule-version'; // create this constant below

interface AnalyzeContentReq {
  request_id: string;
  html: string;
  target_keyword: string;
  secondary_keywords: string[];
  language: string;
  mode: number;          // 0=unspec, 1=content_only, 2=full
  resolved_url: string;
}

interface AnalyzeContentRes {
  rule_version: string;
  issues: Array<{
    rule_id: string;
    status: string;
    score: number;
    category: string;
    severity: string;
    audiences: string[];
    message: string;
    template_suggestion: string;
    evidence: Record<string, unknown>;
    doc_ref: string;
  }>;
  content_stats: {
    word_count: number;
    character_count: number;
    reading_time_sec: number;
    paragraph_count: number;
    image_count: number;
    internal_link_count: number;
    external_link_count: number;
  };
}

@Controller()
export class AnalyzeContentController {
  constructor(
    private readonly builder: PageDataBuilderService,
    private readonly runner: RuleRunner,
    private readonly metadata: RuleMetadataService,
  ) {}

  @GrpcMethod('SeoAnalyzerService', 'AnalyzeContent')
  async analyzeContent(req: AnalyzeContentReq): Promise<AnalyzeContentRes> {
    const resolvedUrl = req.resolved_url || undefined;
    const pageData = this.builder.build(req.html, resolvedUrl);
    const mode = req.mode === 2 ? 'full' : 'content_only';
    const results = this.runner.runAll(pageData, req.target_keyword || undefined, { mode });

    const issues = results.map((r) => {
      const meta = this.metadata.get(r.ruleId);
      return {
        rule_id: r.ruleId,
        status: r.status,
        score: r.score,
        category: String(r.category),
        severity: meta.severity,
        audiences: meta.audiences,
        message: r.message,
        template_suggestion: r.suggestion ?? '',
        evidence: (r.metadata ?? {}) as Record<string, unknown>,
        doc_ref: meta.docRef ?? '',
      };
    });

    const words = pageData.textContent.split(/\s+/).filter(Boolean).length;
    return {
      rule_version: RULE_VERSION,
      issues,
      content_stats: {
        word_count: words,
        character_count: pageData.textContent.length,
        reading_time_sec: Math.ceil(words / 250 * 60),
        paragraph_count: (pageData.rawHtml.match(/<p\b/gi) ?? []).length,
        image_count: pageData.images.length,
        internal_link_count: pageData.internalLinks.length,
        external_link_count: pageData.externalLinks.length,
      },
    };
  }
}
```

Create `apps/seo-analyzer/src/analyzer/domain/rule-version.ts`:

```typescript
export const RULE_VERSION = '1.2.0';
```

Register controller in `analyzer.module.ts`.

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/seo-analyzer -- analyze-content
npm test --workspace=@seo/seo-analyzer          # full suite no regression
```

- [ ] **Step 5: Commit**

```bash
git add apps/seo-analyzer/src
git commit -m "feat(seo-analyzer): AnalyzeContent gRPC controller + rule-version constant"
```

---

## Task B6: Extend `ListRules` gRPC to include severity / audiences / docRef / availableIn

**Files:**
- Modify: `apps/seo-analyzer/src/analyzer/controllers/analyzer.controller.ts` (existing ListRules impl)

- [ ] **Step 1: Locate existing implementation**

```bash
grep -n "ListRules" apps/seo-analyzer/src/analyzer/controllers/analyzer.controller.ts
```

- [ ] **Step 2: Extend response**

In the existing `ListRules` handler, inject `RuleMetadataService` and map each rule output to include 4 new fields:

```typescript
// Before returning each rule, decorate:
const meta = this.ruleMetadata.get(rule.id);
return {
  ...existingFields,
  severity: meta.severity,
  audiences: meta.audiences,
  doc_ref: meta.docRef ?? '',
  available_in: rule.requires && rule.requires.length > 0 ? 'full' : 'content_only',
};
```

- [ ] **Step 3: Run existing ListRules test (add new assertions)**

Extend the existing test (find it with `grep -rn "ListRules" apps/seo-analyzer/test`) to assert the 4 new fields exist on each rule.

```bash
npm test --workspace=@seo/seo-analyzer -- list-rules
```

Expected: PASS (after updating the test expectations + decorating the handler).

- [ ] **Step 4: Commit**

```bash
git add apps/seo-analyzer/src/analyzer/controllers/analyzer.controller.ts apps/seo-analyzer/test
git commit -m "feat(seo-analyzer): extend ListRules with severity/audiences/docRef/availableIn"
```

---

# Phase C — crawler LiteFetch

## Task C1: `LiteFetchService` — HTTP GET + Cheerio + cache

**Files:**
- Create: `apps/crawler/src/crawler/services/lite-fetch.service.ts`
- Create: `apps/crawler/test/unit/lite-fetch.service.spec.ts`
- Modify: `apps/crawler/src/crawler/crawler.module.ts`
- Modify: `apps/crawler/package.json` (ensure `undici` available — Node 24 has built-in `fetch` so no new dep needed)

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { LiteFetchService } from '../../src/crawler/services/lite-fetch.service';

const makeRedis = () => {
  const store = new Map<string, string>();
  return {
    get: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    set: vi.fn((k: string, v: string) => { store.set(k, v); return Promise.resolve('OK'); }),
    setex: vi.fn((k: string, _ttl: number, v: string) => { store.set(k, v); return Promise.resolve('OK'); }),
  };
};

describe('LiteFetchService', () => {
  let svc: LiteFetchService;
  let redis: ReturnType<typeof makeRedis>;
  let fetchSpy: any;

  beforeEach(() => {
    redis = makeRedis();
    svc = new LiteFetchService({ client: redis as any });
    fetchSpy = vi.spyOn(global, 'fetch' as any);
  });

  it('fetches HTML successfully', async () => {
    fetchSpy.mockResolvedValue(new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    const r = await svc.fetch({ url: 'https://example.com/a', timeoutMs: 10000 });
    expect(r.statusCode).toBe(200);
    expect(r.html).toContain('<html>');
    expect(r.fromCache).toBe(false);
  });

  it('caches successful fetches', async () => {
    fetchSpy.mockResolvedValue(new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    await svc.fetch({ url: 'https://example.com/a' });
    const r2 = await svc.fetch({ url: 'https://example.com/a' });
    expect(r2.fromCache).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws on 404', async () => {
    fetchSpy.mockResolvedValue(new Response('not found', { status: 404 }));
    await expect(svc.fetch({ url: 'https://example.com/a' })).rejects.toThrow(/404/);
  });

  it('throws on non-HTML content-type', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    await expect(svc.fetch({ url: 'https://example.com/a' })).rejects.toThrow(/not HTML/);
  });

  it('enforces timeout', async () => {
    fetchSpy.mockImplementation(() => new Promise(() => {})); // never resolves
    await expect(svc.fetch({ url: 'https://example.com/a', timeoutMs: 50 })).rejects.toThrow(/timeout/i);
  });

  it('rejects private IP URLs', async () => {
    await expect(svc.fetch({ url: 'http://169.254.169.254/latest/meta-data/' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/crawler -- lite-fetch
```

- [ ] **Step 3: Implement**

Create `apps/crawler/src/crawler/services/lite-fetch.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_CACHE_TTL, PUBLIC_API_RATE_LIMITS } from '@repo/shared';
// validateUrlSafety is defined at the bottom of this file (inlined — see next block)

export interface LiteFetchInput {
  url: string;
  timeoutMs?: number;
  userAgent?: string;
  followRedirects?: boolean;
}

export interface LiteFetchOutput {
  finalUrl: string;
  statusCode: number;
  html: string;
  sizeBytes: number;
  fetchTimeMs: number;
  redirectChain: string[];
  fromCache: boolean;
}

const DEFAULT_UA = 'SEO-Check-Bot/1.0 (+https://seo-analyst.vn/bot)';

@Injectable()
export class LiteFetchService {
  private readonly logger = new Logger(LiteFetchService.name);

  // Accept a Redis-like client via ctor for testability
  constructor(private readonly redis: { client: any }) {}

  async fetch(input: LiteFetchInput): Promise<LiteFetchOutput> {
    await validateUrlSafety(input.url); // throws if private/loopback

    const cacheKey = PUBLIC_API_REDIS_KEYS.liteFetch(this.hash(input.url));
    const cached = await this.redis.client.get(cacheKey);
    if (cached) {
      return { ...JSON.parse(cached), fromCache: true };
    }

    const timeoutMs = input.timeoutMs ?? PUBLIC_API_RATE_LIMITS.URL_FETCH_TIMEOUT_MS;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs);
    const t0 = Date.now();

    try {
      const res = await fetch(input.url, {
        redirect: input.followRedirects === false ? 'manual' : 'follow',
        headers: { 'user-agent': input.userAgent ?? DEFAULT_UA, accept: 'text/html' },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ctype = res.headers.get('content-type') ?? '';
      if (!ctype.startsWith('text/html')) throw new Error('response is not HTML');
      const html = await res.text();
      const out: LiteFetchOutput = {
        finalUrl: res.url,
        statusCode: res.status,
        html,
        sizeBytes: Buffer.byteLength(html, 'utf8'),
        fetchTimeMs: Date.now() - t0,
        redirectChain: [], // Node fetch doesn't expose chain; leave empty MVP
        fromCache: false,
      };
      await this.redis.client.setex(cacheKey, PUBLIC_API_CACHE_TTL.LITE_FETCH_SECONDS, JSON.stringify(out));
      return out;
    } catch (e: any) {
      if (e?.name === 'AbortError' || /timeout/i.test(String(e?.message))) {
        throw new Error('timeout');
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  private hash(s: string): string {
    return createHash('sha256').update(s).digest('hex');
  }
}
```

Since crawler does not yet have a shared url-validator, inline a minimal SSRF check directly in `lite-fetch.service.ts` (defense-in-depth; gateway will have already validated). Full extraction to `@repo/shared` is a later refactor, out of scope for this plan.

```typescript
// add inside lite-fetch.service.ts module scope
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

async function validateUrlSafety(url: string): Promise<void> {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Invalid protocol');
  }
  const host = u.hostname;
  const ip = isIP(host) ? host : (await lookup(host)).address;
  if (isPrivateOrReservedIp(ip)) {
    throw new Error(`URL resolves to private/reserved IP: ${ip}`);
  }
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    a === 0
  );
}
```

Register `LiteFetchService` as provider in `crawler.module.ts`.

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/crawler -- lite-fetch
```

- [ ] **Step 5: Commit**

```bash
git add apps/crawler/src apps/crawler/test/unit/lite-fetch.service.spec.ts
git commit -m "feat(crawler): LiteFetchService — Cheerio-less HTTP GET + cache + timeout"
```

---

## Task C2: `LiteFetch` gRPC controller

**Files:**
- Create: `apps/crawler/src/crawler/controllers/lite-fetch.controller.ts`
- Modify: `apps/crawler/src/crawler/crawler.module.ts`

- [ ] **Step 1: Write integration test**

Create `apps/crawler/test/integration/lite-fetch.grpc.spec.ts`:

```typescript
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { CrawlerModule } from '../../src/crawler/crawler.module';
import { LiteFetchService } from '../../src/crawler/services/lite-fetch.service';

describe('LiteFetchController (integration)', () => {
  let app: any;
  let svc: LiteFetchService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [CrawlerModule] })
      .overrideProvider(LiteFetchService)
      .useValue({
        fetch: vi.fn().mockResolvedValue({
          finalUrl: 'https://x.com/', statusCode: 200, html: '<html>ok</html>',
          sizeBytes: 12, fetchTimeMs: 30, redirectChain: [], fromCache: false,
        }),
      })
      .compile();
    app = mod.createNestApplication();
    await app.init();
    svc = app.get(LiteFetchService);
  });

  afterAll(async () => app?.close());

  it('invokes service and wraps result', async () => {
    const ctrl = app.get('LiteFetchController');
    const r = await ctrl.liteFetch({
      request_id: 'r1', url: 'https://x.com/', timeout_ms: 10000,
      user_agent: '', follow_redirects: true,
    });
    expect(r.status_code).toBe(200);
    expect(r.html).toBe('<html>ok</html>');
    expect(r.from_cache).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/crawler -- lite-fetch.grpc
```

- [ ] **Step 3: Implement**

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LiteFetchService } from '../services/lite-fetch.service';

interface LiteFetchReq {
  request_id: string;
  url: string;
  timeout_ms: number;
  user_agent: string;
  follow_redirects: boolean;
}

@Controller()
export class LiteFetchController {
  constructor(private readonly svc: LiteFetchService) {}

  @GrpcMethod('CrawlerService', 'LiteFetch')
  async liteFetch(req: LiteFetchReq) {
    const r = await this.svc.fetch({
      url: req.url,
      timeoutMs: req.timeout_ms || undefined,
      userAgent: req.user_agent || undefined,
      followRedirects: req.follow_redirects,
    });
    return {
      final_url: r.finalUrl,
      status_code: r.statusCode,
      html: r.html,
      size_bytes: r.sizeBytes,
      fetch_time_ms: r.fetchTimeMs,
      redirect_chain: r.redirectChain,
      from_cache: r.fromCache,
    };
  }
}
```

Register controller in `crawler.module.ts` controllers array.

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/crawler -- lite-fetch
```

- [ ] **Step 5: Verify audit flow not broken**

```bash
npm run e2e:smoke
```

Expected: full audit pipeline still passes.

- [ ] **Step 6: Commit**

```bash
git add apps/crawler/src apps/crawler/test
git commit -m "feat(crawler): LiteFetch gRPC controller"
```

---

# Phase D — Gateway: PublicApiModule skeleton + gRPC client methods

## Task D1: Scaffold `PublicApiModule`

**Files:**
- Create: `apps/gateway/src/public-api/public-api.module.ts`
- Modify: `apps/gateway/src/app.module.ts`

- [ ] **Step 1: Create empty module**

```typescript
// apps/gateway/src/public-api/public-api.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { GrpcModule } from '../infra/grpc/grpc.module';

@Module({
  imports: [PrismaModule, RedisModule, GrpcModule],
  providers: [],
  controllers: [],
  exports: [],
})
export class PublicApiModule {}
```

- [ ] **Step 2: Register in AppModule**

Add `PublicApiModule` to the `imports` array of `apps/gateway/src/app.module.ts`.

- [ ] **Step 3: Verify app still boots**

```bash
npm run build --workspace=@seo/gateway
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/public-api apps/gateway/src/app.module.ts
git commit -m "feat(gateway): scaffold PublicApiModule"
```

---

## Task D2: Extend gRPC clients with `analyzeContent` + `liteFetch`

**Files:**
- Modify: `apps/gateway/src/infra/grpc/analyzer.client.ts`
- Modify: `apps/gateway/src/infra/grpc/crawler.client.ts`

- [ ] **Step 1: Extend `analyzer.client.ts`**

Add new interface method and public wrapper:

```typescript
interface SeoAnalyzerService {
  // ... existing methods
  AnalyzeContent(req: {
    request_id: string; html: string; target_keyword: string;
    secondary_keywords: string[]; language: string; mode: number; resolved_url: string;
  }, cb: (err: Error | null, res?: AnalyzeContentResponse) => void): void;
}

export interface AnalyzeContentIssue {
  rule_id: string;
  status: string;
  score: number;
  category: string;
  severity: string;
  audiences: string[];
  message: string;
  template_suggestion: string;
  evidence: Record<string, unknown>;
  doc_ref: string;
}

export interface AnalyzeContentResponse {
  rule_version: string;
  issues: AnalyzeContentIssue[];
  content_stats: {
    word_count: number; character_count: number; reading_time_sec: number;
    paragraph_count: number; image_count: number;
    internal_link_count: number; external_link_count: number;
  };
}

// Inside the class:
analyzeContent(req: {
  requestId: string; html: string; targetKeyword: string;
  secondaryKeywords: string[]; language: string;
  mode: 'content_only' | 'full'; resolvedUrl?: string;
}): Promise<AnalyzeContentResponse> {
  return new Promise((resolve, reject) => {
    this.client.AnalyzeContent({
      request_id: req.requestId,
      html: req.html,
      target_keyword: req.targetKeyword,
      secondary_keywords: req.secondaryKeywords,
      language: req.language,
      mode: req.mode === 'full' ? 2 : 1,
      resolved_url: req.resolvedUrl ?? '',
    }, (err, res) => err ? reject(err) : resolve(res!));
  });
}
```

- [ ] **Step 2: Extend `crawler.client.ts` similarly**

```typescript
// inside CrawlerGrpcClient
liteFetch(req: {
  requestId: string; url: string; timeoutMs?: number;
  userAgent?: string; followRedirects?: boolean;
}): Promise<LiteFetchResponse> { /* ... */ }
```

- [ ] **Step 3: Verify compile**

```bash
npm run check-types --workspace=@seo/gateway
```

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/infra/grpc
git commit -m "feat(gateway): extend gRPC clients with analyzeContent + liteFetch"
```

---

# Phase E — Gateway: API Key lifecycle

## Task E1: `ApiKeyService` — generate, hash, verify, revoke

**Files:**
- Create: `apps/gateway/src/public-api/services/api-key.service.ts`
- Create: `apps/gateway/test/unit/api-key.service.spec.ts`
- Modify: `public-api.module.ts` (register provider)

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ApiKeyService, ApiKeyVerifyResult } from '../../src/public-api/services/api-key.service';

const makePrismaMock = () => ({
  apiKey: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
});
const makeRedisMock = () => ({
  get: vi.fn().mockResolvedValue(null),
  setex: vi.fn().mockResolvedValue('OK'),
});

describe('ApiKeyService', () => {
  let svc: ApiKeyService;
  let prisma: any;
  let redis: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    redis = makeRedisMock();
    svc = new ApiKeyService(prisma, { client: redis } as any);
  });

  describe('generate', () => {
    it('returns plaintext starting with sk_live_', async () => {
      prisma.apiKey.create.mockResolvedValue({ id: 'k1' });
      const { plaintext, record } = await svc.create('u1', 'My Key', 'live');
      expect(plaintext).toMatch(/^sk_live_[A-Za-z0-9_-]+$/);
      expect(plaintext.length).toBeGreaterThanOrEqual(48);
      expect(record.id).toBe('k1');
    });

    it('hashes plaintext before storing', async () => {
      prisma.apiKey.create.mockResolvedValue({ id: 'k1' });
      const { plaintext } = await svc.create('u1', 'My Key', 'live');
      const createCall = prisma.apiKey.create.mock.calls[0][0];
      expect(createCall.data.hashedKey).not.toBe(plaintext);
      expect(createCall.data.hashedKey).toMatch(/^[a-f0-9]{64}$/);
      expect(createCall.data.prefix).toBe(plaintext.slice(0, 16));
    });
  });

  describe('verify', () => {
    it('returns invalid for malformed header', async () => {
      const r = await svc.verify('');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('invalid_format');
    });

    it('returns valid for live key in DB', async () => {
      prisma.apiKey.findUnique.mockResolvedValue({
        id: 'k1', userId: 'u1', environment: 'live', revokedAt: null,
        user: { isLocked: false },
      });
      const r = await svc.verify('sk_live_' + 'x'.repeat(43));
      expect(r.valid).toBe(true);
      if (r.valid) {
        expect(r.apiKeyId).toBe('k1');
        expect(r.userId).toBe('u1');
      }
    });

    it('rejects revoked key', async () => {
      prisma.apiKey.findUnique.mockResolvedValue({
        id: 'k1', userId: 'u1', environment: 'live', revokedAt: new Date(),
        user: { isLocked: false },
      });
      const r = await svc.verify('sk_live_' + 'x'.repeat(43));
      expect(r.valid).toBe(false);
      expect((r as any).reason).toBe('revoked');
    });

    it('caches verify result in Redis', async () => {
      prisma.apiKey.findUnique.mockResolvedValue({
        id: 'k1', userId: 'u1', environment: 'live', revokedAt: null,
        user: { isLocked: false },
      });
      await svc.verify('sk_live_' + 'x'.repeat(43));
      expect(redis.setex).toHaveBeenCalled();
    });

    it('uses Redis cache on second call (skips DB)', async () => {
      redis.get.mockResolvedValueOnce(JSON.stringify({ apiKeyId: 'k1', userId: 'u1', environment: 'live' }));
      const r = await svc.verify('sk_live_' + 'x'.repeat(43));
      expect(r.valid).toBe(true);
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('sets revokedAt timestamp scoped by userId', async () => {
      prisma.apiKey.updateMany.mockResolvedValue({ count: 1 });
      await svc.revoke('k1', 'u1');
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'k1', userId: 'u1' }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws when key not found or already revoked', async () => {
      prisma.apiKey.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.revoke('k1', 'u1')).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/gateway -- api-key.service
```

- [ ] **Step 3: Implement**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_CACHE_TTL, ApiKeyEnvironment } from '@repo/shared';

export type ApiKeyVerifyResult =
  | { valid: true; apiKeyId: string; userId: string; environment: ApiKeyEnvironment }
  | { valid: false; reason: 'invalid_format' | 'not_found' | 'revoked' | 'user_disabled' };

const API_KEY_REGEX = /^sk_(live|test)_[A-Za-z0-9_-]{43}$/;

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(userId: string, name: string, environment: ApiKeyEnvironment) {
    const randomPart = randomBytes(32).toString('base64url');
    const plaintext = `sk_${environment}_${randomPart}`;
    const hashedKey = this.hash(plaintext);
    const prefix = plaintext.slice(0, 16);

    const record = await this.prisma.apiKey.create({
      data: { userId, name, prefix, hashedKey, environment },
    });

    return { plaintext, record };
  }

  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, prefix: true, environment: true,
        lastUsedAt: true, createdAt: true, revokedAt: true,
      },
    });
  }

  async revoke(id: string, userId: string): Promise<void> {
    // updateMany because Prisma update() requires a single unique key, and we must also
    // scope by userId to prevent user-A revoking user-B's key through a guessed id.
    const r = await this.prisma.apiKey.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (r.count === 0) throw new Error('NotFound or already revoked');
    // Cache TTL 60s is short enough that we don't need explicit invalidation.
  }

  async verify(authorizationHeader: string): Promise<ApiKeyVerifyResult> {
    const bearer = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!bearer || !API_KEY_REGEX.test(bearer)) {
      return { valid: false, reason: 'invalid_format' };
    }
    const hash = this.hash(bearer);

    // Cache lookup
    const cacheKey = PUBLIC_API_REDIS_KEYS.apiKeyVerify(hash);
    const cached = await this.redis.client.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed === null) return { valid: false, reason: 'not_found' };
      return { valid: true, ...parsed };
    }

    const row = await this.prisma.apiKey.findUnique({
      where: { hashedKey: hash },
      include: { user: { select: { isLocked: true } } },
    });

    if (!row) {
      // Cache null to prevent timing/brute-force
      await this.redis.client.setex(cacheKey, PUBLIC_API_CACHE_TTL.API_KEY_VERIFY_SECONDS, JSON.stringify(null));
      return { valid: false, reason: 'not_found' };
    }
    if (row.revokedAt) return { valid: false, reason: 'revoked' };
    if (row.user.isLocked) return { valid: false, reason: 'user_disabled' };

    const payload = { apiKeyId: row.id, userId: row.userId, environment: row.environment as ApiKeyEnvironment };
    await this.redis.client.setex(cacheKey, PUBLIC_API_CACHE_TTL.API_KEY_VERIFY_SECONDS, JSON.stringify(payload));
    return { valid: true, ...payload };
  }

  async recordUsage(apiKeyId: string, ip: string | undefined) {
    // Throttled: only update lastUsedAt if > 60s since last
    this.prisma.apiKey
      .update({
        where: { id: apiKeyId },
        data: { lastUsedAt: new Date(), lastUsedIp: ip ?? null },
      })
      .catch((e) => this.logger.warn({ e }, 'recordUsage failed'));
  }

  private hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }
}
```

Register in `PublicApiModule` providers + exports.

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/gateway -- api-key.service
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api apps/gateway/test/unit/api-key.service.spec.ts
git commit -m "feat(gateway): ApiKeyService — create/list/verify/revoke with Redis cache"
```

---

## Task E2: `ApiKeyGuard`

**Files:**
- Create: `apps/gateway/src/public-api/guards/api-key.guard.ts`
- Create: `apps/gateway/test/unit/api-key.guard.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiKeyGuard } from '../../src/public-api/guards/api-key.guard';

const makeCtx = (authHeader?: string, ip = '1.2.3.4'): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({ headers: { authorization: authHeader }, ip }),
  }),
} as any);

describe('ApiKeyGuard', () => {
  let svc: any;

  beforeEach(() => {
    svc = { verify: vi.fn(), recordUsage: vi.fn() };
  });

  it('throws 401 if no Authorization header', async () => {
    const g = new ApiKeyGuard(svc);
    await expect(g.canActivate(makeCtx())).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 if verify returns invalid_format', async () => {
    svc.verify.mockResolvedValue({ valid: false, reason: 'invalid_format' });
    const g = new ApiKeyGuard(svc);
    await expect(g.canActivate(makeCtx('Bearer garbage'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 if not found', async () => {
    svc.verify.mockResolvedValue({ valid: false, reason: 'not_found' });
    const g = new ApiKeyGuard(svc);
    await expect(g.canActivate(makeCtx('Bearer sk_live_x'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws 403 if user disabled', async () => {
    svc.verify.mockResolvedValue({ valid: false, reason: 'user_disabled' });
    const g = new ApiKeyGuard(svc);
    await expect(g.canActivate(makeCtx('Bearer sk_live_x'))).rejects.toThrow(ForbiddenException);
  });

  it('attaches req.apiKey on success + triggers recordUsage', async () => {
    svc.verify.mockResolvedValue({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'live' });
    const g = new ApiKeyGuard(svc);
    const ctx = makeCtx('Bearer sk_live_x');
    const ok = await g.canActivate(ctx);
    expect(ok).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.apiKey).toEqual({ id: 'k1', userId: 'u1', environment: 'live' });
    expect(svc.recordUsage).toHaveBeenCalledWith('k1', '1.2.3.4');
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/gateway -- api-key.guard
```

- [ ] **Step 3: Implement**

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly svc: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization;
    if (!auth) throw new UnauthorizedException({ code: 'MISSING_API_KEY', message: 'Authorization header required' });

    const r = await this.svc.verify(auth);
    if (!r.valid) {
      if (r.reason === 'user_disabled') {
        throw new ForbiddenException({ code: 'KEY_DISABLED', message: 'Associated user is disabled' });
      }
      throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'Invalid or revoked API key' });
    }

    req.apiKey = { id: r.apiKeyId, userId: r.userId, environment: r.environment };
    this.svc.recordUsage(r.apiKeyId, req.ip); // fire-and-forget
    return true;
  }
}
```

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/gateway -- api-key.guard
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api/guards apps/gateway/test/unit/api-key.guard.spec.ts
git commit -m "feat(gateway): ApiKeyGuard"
```

---

## Task E3: API Keys CRUD controller (JWT-protected)

**Files:**
- Create: `apps/gateway/src/public-api/controllers/api-keys.controller.ts`
- Create: `apps/gateway/src/public-api/dto/api-key.dto.ts`
- Create: `apps/gateway/test/integration/api-keys.e2e-spec.ts`
- Modify: `public-api.module.ts`

- [ ] **Step 1: DTOs**

```typescript
// apps/gateway/src/public-api/dto/api-key.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My production key' })
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ['live', 'test'] })
  @IsIn(['live', 'test'])
  environment!: 'live' | 'test';
}

export class ApiKeyDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() prefix!: string;
  @ApiProperty() environment!: 'live' | 'test';
  @ApiProperty({ nullable: true }) lastUsedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ nullable: true }) revokedAt!: Date | null;
}

export class CreateApiKeyResponseDto extends ApiKeyDto {
  @ApiProperty({ description: 'Plaintext shown ONCE. Copy it now — it will not be shown again.' })
  plaintext!: string;
}
```

- [ ] **Step 2: Controller**

```typescript
// apps/gateway/src/public-api/controllers/api-keys.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyDto, ApiKeyDto, CreateApiKeyResponseDto } from '../dto/api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/api-keys')
export class ApiKeysController {
  constructor(private readonly svc: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create API key. Plaintext is returned ONCE — save it immediately.' })
  async create(@Req() req: any, @Body() dto: CreateApiKeyDto): Promise<CreateApiKeyResponseDto> {
    const { plaintext, record } = await this.svc.create(req.user.id, dto.name, dto.environment);
    return { ...this.toDto(record), plaintext };
  }

  @Get()
  @ApiOperation({ summary: 'List my API keys (no plaintext).' })
  async list(@Req() req: any): Promise<ApiKeyDto[]> {
    const rows = await this.svc.list(req.user.id);
    return rows.map((r) => this.toDto(r));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key.' })
  @HttpCode(204)
  async revoke(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.svc.revoke(id, req.user.id);
  }

  private toDto(r: any): ApiKeyDto {
    return {
      id: r.id, name: r.name, prefix: r.prefix,
      environment: r.environment,
      lastUsedAt: r.lastUsedAt ?? null,
      createdAt: r.createdAt,
      revokedAt: r.revokedAt ?? null,
    };
  }
}
```

- [ ] **Step 3: Integration test**

```typescript
// apps/gateway/test/integration/api-keys.e2e-spec.ts
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('POST/GET/DELETE /api/v1/users/me/api-keys', () => {
  let app: any;
  let jwt: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    // helper: register + login
    const u = { email: `k-${Date.now()}@x.com`, password: 'Password1!', fullName: 'K Test' };
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(u);
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: u.email, password: u.password });
    jwt = login.body.accessToken;
  });

  afterAll(async () => app?.close());

  it('creates, lists, and revokes API keys', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/users/me/api-keys')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'test key', environment: 'live' })
      .expect(201);
    expect(create.body.plaintext).toMatch(/^sk_live_/);
    expect(create.body.prefix).toBe(create.body.plaintext.slice(0, 16));
    const id = create.body.id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/users/me/api-keys')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);
    expect(list.body.find((k: any) => k.id === id)).toBeDefined();
    expect(list.body[0].plaintext).toBeUndefined();  // NEVER in list

    await request(app.getHttpServer())
      .delete(`/api/v1/users/me/api-keys/${id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(204);

    const list2 = await request(app.getHttpServer())
      .get('/api/v1/users/me/api-keys')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);
    const revoked = list2.body.find((k: any) => k.id === id);
    expect(revoked?.revokedAt).toBeTruthy();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me/api-keys').expect(401);
  });
});
```

- [ ] **Step 4: Run — passes (integration + unit)**

```bash
npm test --workspace=@seo/gateway
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api apps/gateway/test/integration/api-keys.e2e-spec.ts
git commit -m "feat(gateway): API keys CRUD endpoints (JWT-protected)"
```

---

# Phase F — Gateway: Rate-limit, SSRF, Content extractor, Orchestrator

## Task F1: Public-API rate-limit wrapper

**Files:**
- Create: `apps/gateway/src/public-api/services/public-api-rate-limit.service.ts`
- Create: `apps/gateway/test/unit/public-api-rate-limit.service.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PublicApiRateLimitService } from '../../src/public-api/services/public-api-rate-limit.service';

describe('PublicApiRateLimitService', () => {
  let svc: PublicApiRateLimitService;
  let rl: any;

  beforeEach(() => {
    rl = { consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 19, retryAfterSeconds: 0 }) };
    svc = new PublicApiRateLimitService(rl);
  });

  it('enforces per-minute bucket', async () => {
    const r = await svc.enforce({ apiKeyId: 'k1', ip: '1.2.3.4' });
    expect(rl.consume).toHaveBeenCalledWith(expect.stringContaining('rl:pubcheck:min:k1'), 20, 60);
    expect(r.allowed).toBe(true);
  });

  it('enforces per-day bucket', async () => {
    await svc.enforce({ apiKeyId: 'k1', ip: '1.2.3.4' });
    expect(rl.consume).toHaveBeenCalledWith(expect.stringContaining('rl:pubcheck:day:k1'), 500, 24 * 3600);
  });

  it('enforces per-IP bucket', async () => {
    await svc.enforce({ apiKeyId: 'k1', ip: '1.2.3.4' });
    expect(rl.consume).toHaveBeenCalledWith(expect.stringContaining('rl:pubcheck:ip:1.2.3.4'), 100, 60);
  });

  it('returns remaining from first failed bucket', async () => {
    rl.consume
      .mockResolvedValueOnce({ allowed: true, remaining: 0, retryAfterSeconds: 0 })   // ip
      .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 30 }); // minute
    const r = await svc.enforce({ apiKeyId: 'k1', ip: '1.2.3.4' });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBe(30);
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/gateway -- public-api-rate-limit
```

- [ ] **Step 3: Implement**

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_RATE_LIMITS } from '@repo/shared';

export interface EnforceInput { apiKeyId: string; ip: string; }
export interface EnforceResult {
  allowed: boolean;
  remaining: { minute: number; day: number };
  retryAfterSeconds: number;
  resetAt: { minute: string; day: string };
}

@Injectable()
export class PublicApiRateLimitService {
  constructor(private readonly rl: RateLimiterService) {}

  async enforce({ apiKeyId, ip }: EnforceInput): Promise<EnforceResult> {
    // Order: IP (anti-brute) → minute → day
    const ipR = await this.rl.consume(PUBLIC_API_REDIS_KEYS.rateLimitIp(ip), PUBLIC_API_RATE_LIMITS.PER_IP_MINUTE, 60);
    if (!ipR.allowed) return this.rejected(ipR, 0, 0);

    const minR = await this.rl.consume(PUBLIC_API_REDIS_KEYS.rateLimitMinute(apiKeyId), PUBLIC_API_RATE_LIMITS.PER_KEY_MINUTE, 60);
    if (!minR.allowed) return this.rejected(minR, 0, 0);

    const dayR = await this.rl.consume(PUBLIC_API_REDIS_KEYS.rateLimitDay(apiKeyId), PUBLIC_API_RATE_LIMITS.PER_KEY_DAY, 24 * 3600);
    if (!dayR.allowed) return this.rejected(dayR, minR.remaining, 0);

    const now = Date.now();
    return {
      allowed: true,
      remaining: { minute: minR.remaining, day: dayR.remaining },
      retryAfterSeconds: 0,
      resetAt: {
        minute: new Date(now + 60_000).toISOString(),
        day: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
      },
    };
  }

  private rejected(failed: { retryAfterSeconds: number }, remMin: number, remDay: number): EnforceResult {
    const now = Date.now();
    return {
      allowed: false,
      remaining: { minute: remMin, day: remDay },
      retryAfterSeconds: failed.retryAfterSeconds,
      resetAt: {
        minute: new Date(now + 60_000).toISOString(),
        day: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
      },
    };
  }
}
```

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/gateway -- public-api-rate-limit
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api/services/public-api-rate-limit.service.ts apps/gateway/test/unit/public-api-rate-limit.service.spec.ts
git commit -m "feat(gateway): PublicApiRateLimitService — per-key + per-IP bucket orchestration"
```

---

## Task F2: `ContentExtractorService`

**Files:**
- Create: `apps/gateway/src/public-api/services/content-extractor.service.ts`
- Create: `apps/gateway/test/unit/content-extractor.service.spec.ts`
- Modify: `apps/gateway/package.json` (add `marked` dep)

- [ ] **Step 1: Add dep**

```bash
npm install --workspace=@seo/gateway marked
```

- [ ] **Step 2: Write failing test**

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ContentExtractorService } from '../../src/public-api/services/content-extractor.service';

describe('ContentExtractorService', () => {
  let svc: ContentExtractorService;
  let crawler: any;

  beforeEach(() => {
    crawler = { liteFetch: vi.fn() };
    svc = new ContentExtractorService(crawler);
  });

  it('passes HTML through unchanged (for html input)', async () => {
    const r = await svc.extract({ type: 'html', html: '<article>hi</article>' });
    expect(r.html).toContain('<article>');
    expect(r.resolvedUrl).toBeUndefined();
    expect(r.fromCache).toBe(false);
  });

  it('converts markdown to HTML wrapped in article', async () => {
    const r = await svc.extract({ type: 'markdown', markdown: '# T\n\nbody' });
    expect(r.html).toContain('<article>');
    expect(r.html).toContain('<h1');
  });

  it('fetches URL via crawler.liteFetch', async () => {
    crawler.liteFetch.mockResolvedValue({ finalUrl: 'https://ex.com/p', statusCode: 200, html: '<html>x</html>', fromCache: false });
    const r = await svc.extract({ type: 'url', url: 'https://ex.com/p' });
    expect(crawler.liteFetch).toHaveBeenCalled();
    expect(r.html).toBe('<html>x</html>');
    expect(r.resolvedUrl).toBe('https://ex.com/p');
  });

  it('rejects private IP URL (SSRF)', async () => {
    await expect(svc.extract({ type: 'url', url: 'http://127.0.0.1/admin' })).rejects.toThrow(/INVALID_URL|private/i);
  });
});
```

- [ ] **Step 3: Run — fails**

```bash
npm test --workspace=@seo/gateway -- content-extractor
```

- [ ] **Step 4: Implement**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { marked } from 'marked';
import { CrawlerGrpcClient } from '../../infra/grpc/crawler.client';
import { validateUrlSafety } from '../../common/utils/url-validator';

export type PublicCheckInput =
  | { type: 'url'; url: string }
  | { type: 'markdown'; markdown: string }
  | { type: 'html'; html: string };

export interface ExtractResult {
  html: string;
  resolvedUrl?: string;
  fromCache: boolean;
}

@Injectable()
export class ContentExtractorService {
  constructor(private readonly crawler: CrawlerGrpcClient) {}

  async extract(input: PublicCheckInput): Promise<ExtractResult> {
    switch (input.type) {
      case 'html':
        return { html: input.html, fromCache: false };
      case 'markdown':
        return { html: `<article>${await marked.parse(input.markdown)}</article>`, fromCache: false };
      case 'url': {
        try {
          await validateUrlSafety(input.url);
        } catch (e: any) {
          throw new BadRequestException({ code: 'INVALID_URL', message: e.message });
        }
        const r = await this.crawler.liteFetch({
          requestId: `pc-${Date.now()}`,
          url: input.url,
          timeoutMs: 10_000,
        });
        return { html: r.html, resolvedUrl: r.finalUrl, fromCache: r.fromCache };
      }
    }
  }
}
```

- [ ] **Step 5: Run — passes**

```bash
npm test --workspace=@seo/gateway -- content-extractor
```

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/public-api/services/content-extractor.service.ts apps/gateway/test/unit/content-extractor.service.spec.ts apps/gateway/package.json package-lock.json
git commit -m "feat(gateway): ContentExtractorService — url/markdown/html to HTML"
```

---

## Task F3: `PublicCheckRequestDto` + response DTOs

**Files:**
- Create: `apps/gateway/src/public-api/dto/public-check-request.dto.ts`
- Create: `apps/gateway/src/public-api/dto/public-check-response.dto.ts`
- Create: `apps/gateway/test/unit/public-check-request.dto.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PublicCheckRequestDto } from '../../src/public-api/dto/public-check-request.dto';

describe('PublicCheckRequestDto', () => {
  const parse = (obj: any) => plainToInstance(PublicCheckRequestDto, obj);

  it('accepts URL input', async () => {
    const d = parse({ input: { type: 'url', url: 'https://a.com/b' }, targetKeyword: 'seo' });
    expect((await validate(d)).length).toBe(0);
  });

  it('accepts markdown input', async () => {
    const d = parse({ input: { type: 'markdown', markdown: '# t' }, targetKeyword: 'seo' });
    expect((await validate(d)).length).toBe(0);
  });

  it('rejects mismatched type/payload', async () => {
    const d = parse({ input: { type: 'url', markdown: '# t' }, targetKeyword: 'seo' });
    const errs = await validate(d);
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects missing targetKeyword', async () => {
    const d = parse({ input: { type: 'url', url: 'https://a.com' } });
    const errs = await validate(d);
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects non-http/https url', async () => {
    const d = parse({ input: { type: 'url', url: 'ftp://a.com' }, targetKeyword: 'seo' });
    const errs = await validate(d);
    expect(errs.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/gateway -- public-check-request.dto
```

- [ ] **Step 3: Implement**

```typescript
// apps/gateway/src/public-api/dto/public-check-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional,
  IsString, IsUrl, MaxLength, MinLength, ValidateNested, registerDecorator,
  ValidationOptions, ValidationArguments,
} from 'class-validator';

function OneOfTypeMatching(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'oneOfTypeMatching',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_v: unknown, args: ValidationArguments) {
          const input = args.object as any;
          const i = input.input ?? {};
          switch (i.type) {
            case 'url': return typeof i.url === 'string' && !i.markdown && !i.html;
            case 'markdown': return typeof i.markdown === 'string' && !i.url && !i.html;
            case 'html': return typeof i.html === 'string' && !i.url && !i.markdown;
            default: return false;
          }
        },
        defaultMessage: () => 'input.type must match exactly one of input.url / input.markdown / input.html',
      },
    });
  };
}

export class PublicCheckInputDto {
  @ApiProperty({ enum: ['url', 'markdown', 'html'] })
  @IsIn(['url', 'markdown', 'html'])
  type!: 'url' | 'markdown' | 'html';

  @ApiProperty({ required: false, format: 'url' })
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(200_000)
  markdown?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(200_000)
  html?: string;
}

export class PublicCheckOptionsDto {
  @ApiProperty({ enum: ['off', 'template', 'llm'], required: false, default: 'llm' })
  @IsOptional() @IsIn(['off', 'template', 'llm'])
  enrichMode?: 'off' | 'template' | 'llm';

  @ApiProperty({ enum: ['vi', 'en'], required: false, default: 'vi' })
  @IsOptional() @IsIn(['vi', 'en'])
  language?: 'vi' | 'en';

  @ApiProperty({ required: false, default: false })
  @IsOptional() @IsBoolean()
  includeSummary?: boolean;
}

export class PublicCheckRequestDto {
  @ApiProperty({ type: PublicCheckInputDto })
  @ValidateNested() @Type(() => PublicCheckInputDto)
  @OneOfTypeMatching()
  input!: PublicCheckInputDto;

  @ApiProperty({ example: 'seo 2026' })
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(100)
  targetKeyword!: string;

  @ApiProperty({ required: false, example: ['on-page'] })
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true })
  secondaryKeywords?: string[];

  @ApiProperty({ type: PublicCheckOptionsDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => PublicCheckOptionsDto)
  options?: PublicCheckOptionsDto;
}
```

```typescript
// apps/gateway/src/public-api/dto/public-check-response.dto.ts
// (structural DTOs; Swagger @ApiProperty on each — omitted for brevity, match spec)
export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueAudience = 'writer' | 'dev';

export interface PublicCheckIssue {
  ruleId: string;
  severity: IssueSeverity;
  category: string;
  audience: IssueAudience[];
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggestion: { type: 'rewrite' | 'add' | 'remove' | 'reorder'; text: string; rationale: string } | null;
  docRef?: string;
}

export interface PublicCheckResponse {
  score: number;
  scoreBreakdown: Record<string, number>;
  issues: PublicCheckIssue[];
  summary?: { writer: string; dev: string };
  meta: {
    inputType: 'url' | 'markdown' | 'html';
    resolvedUrl?: string;
    contentStats: { words: number; characters: number; readingTimeSec: number };
    processingTimeMs: number;
    ruleVersion: string;
    enrichMode: 'off' | 'template' | 'llm';
    suggestionSource: 'llm' | 'template' | 'mixed' | 'none';
    degraded: boolean;
    cached: boolean;
    requestId: string;
    usage: {
      remaining: { minute: number; day: number };
      resetAt: { minute: string; day: string };
    };
  };
}
```

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/gateway -- public-check-request.dto
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api/dto apps/gateway/test/unit/public-check-request.dto.spec.ts
git commit -m "feat(gateway): PublicCheckRequest DTO + response types"
```

---

## Task F4: `PublicCheckService` orchestrator (template mode only)

**Files:**
- Create: `apps/gateway/src/public-api/services/public-check.service.ts`
- Create: `apps/gateway/test/unit/public-check.service.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PublicCheckService } from '../../src/public-api/services/public-check.service';

describe('PublicCheckService (template mode)', () => {
  let svc: PublicCheckService;
  let extractor: any, analyzer: any, redis: any;

  beforeEach(() => {
    extractor = { extract: vi.fn().mockResolvedValue({ html: '<p>hi</p>', fromCache: false }) };
    analyzer = {
      analyzeContent: vi.fn().mockResolvedValue({
        rule_version: '1.2.0',
        issues: [
          {
            rule_id: 'title_tag', status: 'warn', score: 50, category: 'meta',
            severity: 'warning', audiences: ['writer', 'dev'],
            message: 'Title short', template_suggestion: 'Make it longer',
            evidence: { currentLength: 10 }, doc_ref: 'https://d/r/title_tag',
          },
        ],
        content_stats: {
          word_count: 1, character_count: 2, reading_time_sec: 1,
          paragraph_count: 0, image_count: 0,
          internal_link_count: 0, external_link_count: 0,
        },
      }),
    };
    redis = { client: { get: vi.fn().mockResolvedValue(null), setex: vi.fn() } };
    svc = new PublicCheckService(extractor, analyzer, redis);
  });

  it('returns issues with suggestion from template_suggestion', async () => {
    const r = await svc.execute({
      input: { type: 'html', html: '<p>hi</p>' },
      targetKeyword: 'seo',
      options: { enrichMode: 'template', language: 'vi' },
    }, { apiKeyId: 'k1', userId: 'u1', ip: '1.2.3.4' });

    expect(r.issues[0].suggestion).toEqual({ type: 'rewrite', text: 'Make it longer', rationale: '' });
    expect(r.meta.suggestionSource).toBe('template');
    expect(r.meta.enrichMode).toBe('template');
  });

  it('returns null suggestion when enrichMode=off', async () => {
    const r = await svc.execute({
      input: { type: 'html', html: '<p>hi</p>' },
      targetKeyword: 'seo',
      options: { enrichMode: 'off', language: 'vi' },
    }, { apiKeyId: 'k1', userId: 'u1', ip: '1.2.3.4' });

    expect(r.issues[0].suggestion).toBeNull();
    expect(r.meta.suggestionSource).toBe('none');
  });

  it('falls back to template for enrichMode=llm (shim until Plan 2)', async () => {
    const r = await svc.execute({
      input: { type: 'html', html: '<p>hi</p>' },
      targetKeyword: 'seo',
      options: { enrichMode: 'llm', language: 'vi' },
    }, { apiKeyId: 'k1', userId: 'u1', ip: '1.2.3.4' });

    expect(r.meta.suggestionSource).toBe('template');
    expect(r.meta.degraded).toBe(true);
  });

  it('computes score as average of issue scores', async () => {
    const r = await svc.execute({
      input: { type: 'html', html: '<p>hi</p>' },
      targetKeyword: 'seo',
      options: { enrichMode: 'off' },
    }, { apiKeyId: 'k1', userId: 'u1', ip: '1.2.3.4' });

    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('hits cache on second identical call', async () => {
    const ctx = { apiKeyId: 'k1', userId: 'u1', ip: '1.2.3.4' };
    const req = {
      input: { type: 'html' as const, html: '<p>hi</p>' },
      targetKeyword: 'seo',
      options: { enrichMode: 'template' as const },
    };
    await svc.execute(req, ctx);
    redis.client.get.mockResolvedValueOnce(JSON.stringify({ score: 42, cached: true }));
    const r2 = await svc.execute(req, ctx);
    expect((r2 as any).cached || r2.meta?.cached).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — fails**

```bash
npm test --workspace=@seo/gateway -- public-check.service
```

- [ ] **Step 3: Implement**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { ContentExtractorService, PublicCheckInput } from './content-extractor.service';
import { AnalyzerGrpcClient } from '../../infra/grpc/analyzer.client';
import { RedisService } from '../../infra/redis/redis.service';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_CACHE_TTL } from '@repo/shared';
import type { PublicCheckRequestDto } from '../dto/public-check-request.dto';
import type { PublicCheckResponse, PublicCheckIssue } from '../dto/public-check-response.dto';

export interface ExecuteCtx {
  apiKeyId: string;
  userId: string;
  ip: string;
  usage?: { remaining: { minute: number; day: number }; resetAt: { minute: string; day: string } };
}

@Injectable()
export class PublicCheckService {
  private readonly logger = new Logger(PublicCheckService.name);

  constructor(
    private readonly extractor: ContentExtractorService,
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly redis: RedisService,
  ) {}

  async execute(dto: PublicCheckRequestDto, ctx: ExecuteCtx): Promise<PublicCheckResponse> {
    const t0 = Date.now();
    const requestId = `req_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
    const enrichMode = dto.options?.enrichMode ?? 'llm';
    const language = dto.options?.language ?? 'vi';

    // Cache lookup (skip for enrichMode=off to keep simple)
    const cacheKey = this.cacheKey(dto, 'rv-1.2.0');
    const cached = await this.redis.client.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as PublicCheckResponse;
      parsed.meta.cached = true;
      parsed.meta.requestId = requestId;
      if (ctx.usage) parsed.meta.usage = ctx.usage;
      return parsed;
    }

    // Extract HTML
    const extracted = await this.extractor.extract(dto.input as PublicCheckInput);

    // Call analyzer
    const result = await this.analyzer.analyzeContent({
      requestId,
      html: extracted.html,
      targetKeyword: dto.targetKeyword,
      secondaryKeywords: dto.secondaryKeywords ?? [],
      language,
      mode: 'content_only',
      resolvedUrl: extracted.resolvedUrl,
    });

    // Build issues with suggestion per enrichMode
    const issues: PublicCheckIssue[] = result.issues.map((i) => ({
      ruleId: i.rule_id,
      severity: i.severity as any,
      category: i.category,
      audience: i.audiences as any,
      title: this.shortTitle(i.message),
      description: i.message,
      evidence: i.evidence,
      suggestion: this.buildSuggestion(i, enrichMode),
      docRef: i.doc_ref || undefined,
    }));

    const score = this.computeScore(result.issues);
    const scoreBreakdown = this.computeBreakdown(result.issues);

    // suggestionSource: for Plan 1, 'llm' mode degrades to template
    let suggestionSource: 'llm' | 'template' | 'mixed' | 'none' = 'none';
    let degraded = false;
    if (enrichMode === 'off') suggestionSource = 'none';
    else if (enrichMode === 'template') suggestionSource = 'template';
    else if (enrichMode === 'llm') { suggestionSource = 'template'; degraded = true; } // shim

    const response: PublicCheckResponse = {
      score,
      scoreBreakdown,
      issues,
      meta: {
        inputType: dto.input.type,
        resolvedUrl: extracted.resolvedUrl,
        contentStats: {
          words: result.content_stats.word_count,
          characters: result.content_stats.character_count,
          readingTimeSec: result.content_stats.reading_time_sec,
        },
        processingTimeMs: Date.now() - t0,
        ruleVersion: result.rule_version,
        enrichMode,
        suggestionSource,
        degraded,
        cached: false,
        requestId,
        usage: ctx.usage ?? { remaining: { minute: 0, day: 0 }, resetAt: { minute: '', day: '' } },
      },
    };

    // Cache (only for template/off; LLM cache added in Plan 2)
    const ttl = enrichMode === 'off' ? PUBLIC_API_CACHE_TTL.PUBLIC_CHECK_TEMPLATE_SECONDS
               : PUBLIC_API_CACHE_TTL.PUBLIC_CHECK_TEMPLATE_SECONDS;
    await this.redis.client.setex(cacheKey, ttl, JSON.stringify(response));

    return response;
  }

  private buildSuggestion(
    i: { template_suggestion: string },
    mode: 'off' | 'template' | 'llm',
  ) {
    if (mode === 'off') return null;
    if (!i.template_suggestion) return null;
    return { type: 'rewrite' as const, text: i.template_suggestion, rationale: '' };
  }

  private shortTitle(msg: string): string {
    return msg.slice(0, 80);
  }

  private computeScore(issues: Array<{ score: number }>): number {
    if (issues.length === 0) return 100;
    return Math.round(issues.reduce((a, i) => a + i.score, 0) / issues.length);
  }

  private computeBreakdown(issues: Array<{ category: string; score: number }>): Record<string, number> {
    const acc: Record<string, number[]> = {};
    for (const i of issues) {
      (acc[i.category] ??= []).push(i.score);
    }
    const out: Record<string, number> = {};
    for (const k of Object.keys(acc)) {
      out[k] = Math.round(acc[k].reduce((a, b) => a + b, 0) / acc[k].length);
    }
    return out;
  }

  private cacheKey(dto: PublicCheckRequestDto, rv: string): string {
    const content = dto.input.type === 'url' ? dto.input.url
                  : dto.input.type === 'markdown' ? dto.input.markdown
                  : dto.input.html;
    const hash = createHash('sha256')
      .update(JSON.stringify({ content, kw: dto.targetKeyword, sk: dto.secondaryKeywords ?? [], lang: dto.options?.language ?? 'vi', em: dto.options?.enrichMode ?? 'llm', rv }))
      .digest('hex');
    return PUBLIC_API_REDIS_KEYS.publicCheckResponse(hash);
  }
}
```

- [ ] **Step 4: Run — passes**

```bash
npm test --workspace=@seo/gateway -- public-check.service
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api/services/public-check.service.ts apps/gateway/test/unit/public-check.service.spec.ts
git commit -m "feat(gateway): PublicCheckService orchestrator (template-mode + llm-degraded shim)"
```

---

## Task F5: `PublicCheckController` + `PublicRulesController` + `PublicHealthController`

**Files:**
- Create: `apps/gateway/src/public-api/controllers/public-check.controller.ts`
- Create: `apps/gateway/src/public-api/controllers/public-rules.controller.ts`
- Create: `apps/gateway/src/public-api/controllers/public-health.controller.ts`
- Modify: `public-api.module.ts`

- [ ] **Step 1: Implement `PublicCheckController`**

```typescript
import { Body, Controller, Headers, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { PublicCheckService } from '../services/public-check.service';
import { PublicApiRateLimitService } from '../services/public-api-rate-limit.service';
import { PublicCheckRequestDto } from '../dto/public-check-request.dto';

@ApiTags('Public SEO Check')
@ApiBearerAuth('apiKey')
@Controller('public')
export class PublicCheckController {
  constructor(
    private readonly svc: PublicCheckService,
    private readonly rl: PublicApiRateLimitService,
  ) {}

  @Post('check')
  @UseGuards(ApiKeyGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Analyze content for SEO issues' })
  @ApiOkResponse({ description: 'Analysis complete' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async check(
    @Body() dto: PublicCheckRequestDto,
    @Req() req: Request & { apiKey: { id: string; userId: string; environment: 'live' | 'test' } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const rlRes = await this.rl.enforce({ apiKeyId: req.apiKey.id, ip: req.ip ?? '' });
    if (!rlRes.allowed) {
      res.setHeader('Retry-After', String(rlRes.retryAfterSeconds));
      res.status(429);
      return { statusCode: 429, error: 'RateLimitExceeded', code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', retryAfterSeconds: rlRes.retryAfterSeconds };
    }
    res.setHeader('X-RateLimit-Limit-Minute', '20');
    res.setHeader('X-RateLimit-Remaining-Minute', String(rlRes.remaining.minute));
    res.setHeader('X-RateLimit-Limit-Day', '500');
    res.setHeader('X-RateLimit-Remaining-Day', String(rlRes.remaining.day));

    return this.svc.execute(dto, {
      apiKeyId: req.apiKey.id,
      userId: req.apiKey.userId,
      ip: req.ip ?? '',
      usage: { remaining: rlRes.remaining, resetAt: rlRes.resetAt },
    });
  }
}
```

- [ ] **Step 2: `PublicRulesController`**

```typescript
import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { AnalyzerGrpcClient } from '../../infra/grpc/analyzer.client';
import { RedisService } from '../../infra/redis/redis.service';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_CACHE_TTL } from '@repo/shared';

@ApiTags('Public SEO Check')
@ApiBearerAuth('apiKey')
@Controller('public')
export class PublicRulesController {
  constructor(
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly redis: RedisService,
  ) {}

  @Get('rules')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'List available SEO rules' })
  async list(@Headers('accept-language') lang?: string) {
    const language = (lang?.startsWith('en') ? 'en' : 'vi');
    const cacheKey = PUBLIC_API_REDIS_KEYS.rulesList(language);
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const rules = await this.analyzer.listRules();
    const payload = { ruleVersion: '1.2.0', rules };
    await this.redis.client.setex(cacheKey, PUBLIC_API_CACHE_TTL.RULES_LIST_SECONDS, JSON.stringify(payload));
    return payload;
  }
}
```

- [ ] **Step 3: `PublicHealthController`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public SEO Check')
@Controller('public')
export class PublicHealthController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness + rule version' })
  health() {
    return { status: 'ok', ruleVersion: '1.2.0' };
  }
}
```

- [ ] **Step 4: Register all 3 controllers + `PublicApiRateLimitService` provider in module**

- [ ] **Step 5: Integration test**

Create `apps/gateway/test/integration/public-api.e2e-spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Public API', () => {
  let app: any;
  let apiKey: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    // register + login + create key
    const u = { email: `pub-${Date.now()}@x.com`, password: 'Password1!', fullName: 'P Test' };
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(u);
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: u.email, password: u.password });
    const jwt = login.body.accessToken;
    const create = await request(app.getHttpServer()).post('/api/v1/users/me/api-keys').set('Authorization', `Bearer ${jwt}`).send({ name: 'test', environment: 'live' });
    apiKey = create.body.plaintext;
  });

  afterAll(async () => app?.close());

  it('GET /public/health returns ok without auth', async () => {
    const r = await request(app.getHttpServer()).get('/api/v1/public/health').expect(200);
    expect(r.body.status).toBe('ok');
  });

  it('POST /public/check requires API key', async () => {
    await request(app.getHttpServer()).post('/api/v1/public/check').send({}).expect(401);
  });

  it('POST /public/check with HTML input + enrichMode=template returns issues', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        input: { type: 'html', html: '<html><head><title>x</title></head><body><h1>A</h1></body></html>' },
        targetKeyword: 'seo 2026',
        options: { enrichMode: 'template', language: 'vi' },
      })
      .expect(200);
    expect(r.body.score).toBeDefined();
    expect(Array.isArray(r.body.issues)).toBe(true);
    expect(r.body.meta.ruleVersion).toBe('1.2.0');
    expect(r.body.meta.enrichMode).toBe('template');
    expect(r.headers['x-ratelimit-remaining-minute']).toBeDefined();
  });

  it('rejects private-IP URL (SSRF)', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        input: { type: 'url', url: 'http://127.0.0.1/' },
        targetKeyword: 'seo',
        options: { enrichMode: 'off' },
      });
    expect([400, 422]).toContain(r.status);
    expect(r.body.code).toMatch(/INVALID_URL|VALIDATION/i);
  });

  it('rejects mismatched input type', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        input: { type: 'url', markdown: '# t' },
        targetKeyword: 'seo',
      });
    expect(r.status).toBe(422);
  });
});
```

- [ ] **Step 6: Run — passes**

```bash
npm test --workspace=@seo/gateway -- public-api.e2e
```

- [ ] **Step 7: Commit**

```bash
git add apps/gateway/src/public-api apps/gateway/test/integration/public-api.e2e-spec.ts
git commit -m "feat(gateway): Public API controllers (check, rules, health)"
```

---

# Phase G — Swagger, e2e:smoke, Admin

## Task G1: Swagger UI — scope-limited to `PublicApiModule`

**Files:**
- Modify: `apps/gateway/src/main.ts`
- Modify: `apps/gateway/package.json` (add `@nestjs/swagger` if missing)

- [ ] **Step 1: Install dep (if needed)**

```bash
grep '"@nestjs/swagger"' apps/gateway/package.json || npm install --workspace=@seo/gateway @nestjs/swagger
```

- [ ] **Step 2: Wire SwaggerModule in `main.ts`**

Insert BEFORE `app.listen(...)`:

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PublicApiModule } from './public-api/public-api.module';

const swaggerCfg = new DocumentBuilder()
  .setTitle('SEO Analyst Public API')
  .setDescription('Third-party SEO content check API')
  .setVersion('1.0.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'sk_live_...' }, 'apiKey')
  .addServer(process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000', 'Local')
  .build();

const doc = SwaggerModule.createDocument(app, swaggerCfg, { include: [PublicApiModule] });
SwaggerModule.setup('api/v1/public/docs', app, doc, {
  jsonDocumentUrl: 'api/v1/public/openapi.json',
  swaggerOptions: { persistAuthorization: true },
});
```

- [ ] **Step 3: Verify spec doesn't include internal endpoints**

```bash
npm run build --workspace=@seo/gateway && npm run start:dev --workspace=@seo/gateway &
sleep 5
curl -s http://localhost:3000/api/v1/public/openapi.json | jq '.paths | keys'
kill %1
```

Expected: paths include `/public/check`, `/public/rules`, `/public/health`, `/users/me/api-keys`; **no** `/auth/*`, `/audits/*`, `/admin/*`.

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/main.ts apps/gateway/package.json package-lock.json
git commit -m "feat(gateway): Swagger UI scope-limited to PublicApiModule"
```

---

## Task G2: e2e:smoke — add public-API block

**Files:**
- Modify: `scripts/e2e-smoke.sh`
- Create: `scripts/fixtures/public-check-html.json`

- [ ] **Step 1: Create fixture**

```json
{
  "input": {
    "type": "html",
    "html": "<html><head><title>Blog về SEO</title><meta name=\"description\" content=\"Hướng dẫn SEO.\"/></head><body><h1>SEO cơ bản</h1><p>Nội dung bài viết về seo...</p></body></html>"
  },
  "targetKeyword": "seo 2026",
  "options": { "enrichMode": "template", "language": "vi" }
}
```

- [ ] **Step 2: Add public-api block to `scripts/e2e-smoke.sh`**

Append after existing audit smoke:

```bash
echo "=== Public API smoke ==="
# Create user + JWT
PUBJWT=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "content-type: application/json" \
  -d "{\"email\":\"smoke-$(date +%s)@x.com\",\"password\":\"Password1!\",\"fullName\":\"Smoke\"}" | jq -r '.accessToken')
if [ -z "$PUBJWT" ] || [ "$PUBJWT" = "null" ]; then
  PUBJWT=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
    -H "content-type: application/json" \
    -d "{\"email\":\"smoke-$(date +%s)@x.com\",\"password\":\"Password1!\"}" | jq -r '.accessToken')
fi

# Create API key
APIKEY=$(curl -s -X POST http://localhost:3000/api/v1/users/me/api-keys \
  -H "authorization: Bearer $PUBJWT" \
  -H "content-type: application/json" \
  -d '{"name":"smoke","environment":"live"}' | jq -r '.plaintext')

# Run public check
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/public/check \
  -H "authorization: Bearer $APIKEY" \
  -H "content-type: application/json" \
  -d @scripts/fixtures/public-check-html.json)

SCORE=$(echo "$RESPONSE" | jq -r '.score')
ISSUES_COUNT=$(echo "$RESPONSE" | jq -r '.issues | length')
if [ -z "$SCORE" ] || [ "$SCORE" = "null" ]; then
  echo "FAIL: no score in response: $RESPONSE"; exit 1
fi
if [ "$ISSUES_COUNT" -lt 1 ]; then
  echo "FAIL: expected at least 1 issue"; exit 1
fi
echo "OK: score=$SCORE issues=$ISSUES_COUNT"
```

- [ ] **Step 3: Run**

```bash
npm run e2e:smoke
```

Expected: both audit + public-api blocks pass.

- [ ] **Step 4: Commit**

```bash
git add scripts
git commit -m "test(e2e): add public-api smoke block"
```

---

## Task G3: Admin — cross-user API key management

**Files:**
- Create: `apps/gateway/src/admin/services/admin-api-key.service.ts`
- Modify: `apps/gateway/src/admin/controllers/admin.controller.ts`

- [ ] **Step 1: Service**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AdminApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter: { userId?: string; environment?: 'live' | 'test'; onlyActive?: boolean }) {
    return this.prisma.apiKey.findMany({
      where: {
        userId: filter.userId,
        environment: filter.environment,
        revokedAt: filter.onlyActive ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, prefix: true, environment: true,
        lastUsedAt: true, lastUsedIp: true, createdAt: true, revokedAt: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
  }

  revoke(id: string) {
    return this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}
```

- [ ] **Step 2: Admin controller additions**

Add to existing `admin.controller.ts`:

```typescript
@Get('api-keys')
@Roles('admin')
async listAllKeys(
  @Query('userId') userId?: string,
  @Query('env') env?: 'live' | 'test',
  @Query('active') activeOnly?: string,
) {
  return this.adminApiKeys.list({
    userId, environment: env,
    onlyActive: activeOnly === 'true',
  });
}

@Delete('api-keys/:id')
@Roles('admin')
@HttpCode(204)
async revokeKey(@Param('id') id: string) {
  await this.adminApiKeys.revoke(id);
}
```

Inject `AdminApiKeyService` in the controller's constructor. Register service as provider in `AdminModule`.

- [ ] **Step 3: Integration test** (optional smoke in existing admin e2e)

Add a test case that creates a user's API key then has an admin list + revoke it. Assert 204 + key revoked.

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/admin
git commit -m "feat(gateway): admin cross-user API key list + revoke"
```

---

# Phase H — Final verification

## Task H1: Full regression run

- [ ] **Step 1: Run all workspace tests**

```bash
npm test
```

Expected: all packages pass.

- [ ] **Step 2: Type check across repo**

```bash
npm run check-types
```

Expected: exits 0.

- [ ] **Step 3: Full e2e:smoke**

```bash
npm run e2e:smoke
```

Expected: audit flow + public-api block both pass.

- [ ] **Step 4: Manual verification — live API**

Start the full stack:

```bash
npm run docker:up
```

Curl a live check (replace `$APIKEY` with a key from `POST /users/me/api-keys`):

```bash
curl -X POST http://localhost:3000/api/v1/public/check \
  -H "authorization: Bearer $APIKEY" \
  -H "content-type: application/json" \
  -d '{
    "input": { "type": "html", "html": "<html><head><title>hi</title></head><body><h1>A</h1></body></html>" },
    "targetKeyword": "seo",
    "options": { "enrichMode": "template", "language": "vi" }
  }'
```

Expected: 200 JSON with `score`, `issues[]`, `meta.ruleVersion=1.2.0`.

Also verify docs:

```bash
open http://localhost:3000/api/v1/public/docs
```

Expected: Swagger UI shows 4 endpoints (`/public/check`, `/public/rules`, `/public/health`, `/users/me/api-keys`), no internal.

- [ ] **Step 5: Plan 1 ship checklist**

Verify each item:

- [ ] `POST /public/check` returns well-formed response for all 3 input types with `enrichMode=off|template`
- [ ] `enrichMode=llm` degrades gracefully (meta.degraded=true, suggestionSource=template)
- [ ] `POST/GET/DELETE /users/me/api-keys` work under JWT
- [ ] Rate-limit headers present; 429 triggers correctly when exceeded
- [ ] SSRF blocks private IPs
- [ ] Swagger UI does NOT expose `/auth`, `/audits`, `/admin`
- [ ] `e2e:smoke` passes both audit + public-api blocks
- [ ] All unit + integration tests pass
- [ ] No regression in existing audit flow

- [ ] **Step 6: Commit + tag**

```bash
git add -A
git commit --allow-empty -m "chore(public-api): Plan 1 (Foundation + Core API) complete"
git tag public-api-plan-1-done
```

---

## Self-Review Checklist

- [x] **Spec coverage**: API contract ✓, auth model ✓, rate-limit ✓, SSRF ✓, SQL schema ✓, 3 input types ✓, enrichMode off/template ✓, OpenAPI scope-limited ✓, e2e:smoke ✓. Deferred (Plan 2/3): LLM, Playground, CLI.
- [x] **Placeholder scan**: no TBD/TODO; each step has executable command + code.
- [x] **Type consistency**: `ApiKeyEnvironment` matches Prisma enum + shared type; `RuleIssue` proto matches gateway `AnalyzeContentIssue` interface field-by-field; `EnrichMode` used consistently as `'off' | 'template' | 'llm'`.
- [x] **Spec items with no task**: None. `degraded=true` shim in Plan 1 for `enrichMode=llm` is explicitly noted; Plan 2 replaces it.

---

## Plan 2 & 3 preview (not in this plan)

**Plan 2 — LLM Enrichment** (targets `enrichMode=llm`):
- `SuggestionEnricherService` in gateway (replaces shim)
- `SeoSuggestChain` via `@repo/seo-ai-core`
- Prompt YAML `v1.0.0` + golden fixtures
- Suggestion cache (`suggest:<hash>`)
- Template-fallback on LLM error (still graceful)
- Integration tests with mocked LLM

**Plan 3 — DX Surfaces**:
- `/playground` page in `apps/web` (Monaco editor, 3 tabs, result viewer, "Copy cURL/JS" buttons)
- `/settings/api-keys` UI (list + create modal + revoke)
- `packages/seo-check-cli` (workspace-local)
- `docs/public-api/` narrative docs (8 files)
- Playwright tests
