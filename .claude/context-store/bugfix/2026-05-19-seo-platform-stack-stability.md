---
id: ctx-bugfix-001
title: "SEO Platform stack stability — 9 bugs from static checks → e2e dogfood"
type: bugfix
tags: [monorepo, nestjs, prisma, redis, bullmq, dev-experience, hot-reload, choreography]
severity: high
confidence: verified
reuse_count: 0
related_files:
  - apps/web/src/components/ui/badge.tsx
  - apps/web/src/components/playground/issue-card.tsx
  - apps/web/src/components/playground/score-card.tsx
  - apps/web/src/components/playground/monaco-editor.tsx
  - "apps/web/src/app/(app)/settings/api-keys/page.tsx"
  - apps/web/src/app/layout.tsx
  - apps/web/package.json
  - packages/seo-ai-core/src/chains/base.chain.ts
  - packages/seo-ai-core/src/errors/index.ts
  - packages/seo-ai-core/src/guardrails/output-parser.ts
  - packages/seo-ai-core/src/index.ts
  - packages/seo-ai-core/src/llm/adapters/anthropic.adapter.ts
  - packages/seo-ai-core/src/llm/types.ts
  - packages/seo-ai-core/src/observability/logger.ts
  - packages/seo-ai-core/package.json
  - packages/seo-ai-core/vitest.config.ts
  - apps/gateway/src/audits/services/audits.service.ts
  - apps/gateway/src/auth/controllers/auth.controller.ts
  - apps/gateway/src/main.ts
  - apps/gateway/src/public-api/prompts/suggest-fix-seo/v1.0.0.prompt.yaml
  - apps/gateway/.env
  - apps/gateway/prisma/seed.ts
  - apps/seo-analyzer/src/analyzer/services/analyzer.service.ts
  - apps/seo-analyzer/src/analyzer/controllers/analyzer.worker.ts
  - apps/seo-analyzer/prisma/schema.prisma
  - apps/seo-analyzer/prisma/seed.ts
  - apps/report/src/report/services/wait-for-both.service.ts
  - apps/report/.env
  - apps/keyword-analyzer/.env
  - turbo.json
  - docker-compose.yml
related_errors:
  - "error TS2322: Type '\"default\" | \"secondary\"' is not assignable to type '\"muted\" | \"warn\" | ...'"
  - "error TS2459: Module '@/components/ui/badge' declares 'badgeVariants' locally, but it is not exported"
  - "error TS2307: Cannot find module '@monaco-editor/react'"
  - "TypeError: BaseChain is not a constructor"
  - "ReferenceError: exports is not defined in ES module scope"
  - "ERR_PACKAGE_PATH_NOT_EXPORTED: No \"exports\" main defined"
  - "Failed to call useTranslations because the context from NextIntlClientProvider was not found"
  - "PromptError: Prompt suggest-fix-seo@1.0.0: \"variables\" must be an array"
  - "Type '\"content\"' is not assignable to type 'RuleCategory'"
  - "WRONGTYPE Operation against a key holding the wrong kind of value"
  - "ChainError: Chain seo-suggest failed: analyze.ruleResults is not iterable"
  - "ECONNREFUSED 127.0.0.1:6379 (Redis OOM, exit 137)"
  - "EADDRINUSE: address already in use :::3000"
related_skills:
  - backend
  - frontend
  - database
  - testing
  - deployment
created_at: 2026-05-19
updated_at: 2026-05-19
---

## Symptoms

Sau khi checkout branch `improve/main` từ main và chạy static checks (`turbo check-types/lint/test`) rồi muốn dogfood toàn stack:

- `turbo check-types`: 11/12 pass — `@seo/web` fail với 12 TS errors (Badge variants, missing dep, missing export).
- `turbo test`: 6/7 pass — `@repo/seo-ai-core` fail 9/82 tests (2 stale spec files + smoke test ESM load error).
- Khi bật stack (Gateway + Web + DB + Redis): web 500 vì layout/i18n duplication; gateway crash `ERR_PACKAGE_PATH_NOT_EXPORTED` vì CJS/ESM drift.
- Khi bật full pipeline (5 BE) + tạo audit: audit kẹt ở "Hàng chờ 0%" mãi mãi vì Redis WRONGTYPE → analyze.ruleResults is not iterable → report.start fail vĩnh viễn.
- Redis container chết exit 137 (OOM) giữa session, kéo theo cả 5 services mất kết nối.

## Root Cause

Hệ thống có **nhiều bug architectural độc lập** che dấu lẫn nhau:

### A. UI: Badge component refactor không update consumers (12 TS errors)
Badge refactored từ shadcn variants (`default/secondary/outline/destructive/warning`) sang design-token variants (`muted/warn/info/error/success`). 4 consumer files vẫn pass variant cũ. Plus `badgeVariants` không exported. Plus `@monaco-editor/react` không có trong package.json dù playground page import nó.

### B. seo-ai-core API drift bị stale dist .d.ts che dấu
Commits `9a2a24c` + `b8ce12c` (Apr 23) viết spec-first cho class-based API (`BaseChain`, `ZodOutputParser`, `ILLM` type) — **chưa bao giờ implement trong src**. v0.1.0 (Apr 19) chỉ ship factory API (`createBaseChain`, `parseStructured`, `ILLMProvider`). `apps/gateway/.../seo-suggest-chain.factory.ts` consume class API — chỉ pass tsc vì dist `.d.ts` (Apr 23 cũ) còn lưu class shape. Rebuild dist → API gap surface.

### C. CJS/ESM mismatch giữa seo-ai-core (ESM) và gateway (CJS)
seo-ai-core `package.json` có `"type": "module"` và `exports.import` only → gateway CJS `require()` fail với `ERR_PACKAGE_PATH_NOT_EXPORTED`. Trước fix hoạt động vì dist cũ là CJS (built trước khi src refactor sang ESM).

### D. Choreography key collision (analyzer ↔ report)
`analyzer.worker.ts` ghi key `audit:<id>:completed_steps` bằng **SADD** (Set type); `report/wait-for-both.service.ts` increment cùng key bằng **INCR** (String type). Khi analyze done trước, key thành Set → INCR fail `WRONGTYPE Operation against a key holding the wrong kind of value`. Lệnh `sadd` là dead code từ orchestrator-polling pattern bỏ.

### E. Listener overwrite full payload với event payload
Analyzer worker ghi FULL result (gồm `ruleResults`, `overallScore`, ...) vào `auditAnalyzeResult` key. Sau đó publish `analyze.done` event chỉ chứa `{auditId, status, stage, progress, message}`. Report's `AnalyzeDoneListener` nhận event → gọi `WaitForBothService.recordAnalyzeDone()` → **setex cùng key với event payload slim** → overwrites result. ReportWorker.aggregate đọc lại → `analyze.ruleResults is not iterable`. Same bug cho keyword.

### F. Schema gap — readability rule thêm category 'content' nhưng enum thiếu
F3 (readability rule) thêm dòng `category: 'content'` vào seed nhưng Prisma `RuleCategory` enum chưa có value `content` → seed type-check fail.

### G. Multiple config drifts (port, env path, prompt YAML)
- `apps/gateway/.env` PORT=3010, web `.env.local` expect :3000 → API calls fail.
- `apps/gateway/prisma/seed.ts` import `../src/generated/prisma` nhưng schema output `../src/infra/prisma/generated`. Same bug ở analyzer seed.
- `apps/gateway/.../suggest-fix-seo/v1.0.0.prompt.yaml` thiếu `variables` array → loader.render reject với PromptError.

### H. Redis OOM under site-mode load
Docker-compose Redis limited 256MB không đủ cho site-mode audit (nhiều BullMQ jobs + AOF growth). Docker SIGKILL container (exit 137) → 5 services ECONNREFUSED đồng loạt.

### I. nest --watch không restart child process
Nest `--watch` recompile TS thành dist OK nhưng KHÔNG restart node process — module-in-memory vẫn là code cũ. Fix WaitForBoth không có effect cho tới khi `pkill -f apps/report` để parent watcher respawn.

### J. Next.js root layout shadow [locale] layout
`app/layout.tsx` (root) wrap `<Providers>` (chứa `AccountLockedModal` dùng `useTranslations`); `app/[locale]/layout.tsx` mới wrap `NextIntlClientProvider`. Root layout render trước → `useTranslations` fail vì NO provider context.

## Solution

### Wave 1 — Static check-types (commit `7881ae1`)
**File: `apps/web/src/components/ui/badge.tsx`** — `export const badgeVariants` (was non-exported).
**4 consumers**: remap variant strings (`destructive→error, warning→warn, outline/secondary/default→muted, info severity→info, live env→info`).
**File: `apps/web/package.json`** — add `"@monaco-editor/react": "^4.6.0"`.
Verified: `npm --workspace @seo/web run check-types` passes 0 errors.

### Wave 2 — seo-ai-core test failures + API drift (commit `debec15`)
**File: `packages/seo-ai-core/src/chains/base.chain.ts`** — add `BaseChain` class wrapping `createBaseChain` semantics + new `BaseChainRunOptions` with `timeoutMs` via `AbortController`; retry only on `LLMError.retriable === true`; ChainError wrap with cause preserved; `logger.child({ traceId })` forwarding.
**File: `packages/seo-ai-core/src/guardrails/output-parser.ts`** — add `ZodOutputParser<S>` class wrapping `parseStructured`.
**File: `packages/seo-ai-core/src/llm/types.ts`** — add minimal `ILLM` interface (`{providerId, modelId, invoke}`); `ILLMProvider extends ILLM` adds `name/model/stream/countTokens`.
**File: `packages/seo-ai-core/src/llm/adapters/anthropic.adapter.ts`** — add `providerId`/`modelId` getters mirroring `name`/`model`; pass `retriable: true` on connect errors.
**File: `packages/seo-ai-core/src/errors/index.ts`** — add `retriable?: boolean` to `AiCoreErrorOptions` + readonly field on `AiCoreError`.
**File: `packages/seo-ai-core/src/observability/logger.ts`** — add optional `child(ctx: LogContext): Logger` method.
**File: `packages/seo-ai-core/src/index.ts`** — export new symbols.
**File: `packages/seo-ai-core/vitest.config.ts`** — alias `@repo/seo-ai-core` → `src/index.ts` so smoke tests bypass dist freshness.
**File: `apps/gateway/.../suggest-fix-seo/v1.0.0.prompt.yaml`** — add `variables: [targetKeyword, secondaryKeywords, language, contentExcerpt, issueCount, issues]`.
**File: `turbo.json`** — `check-types.dependsOn` += `^build` so consumers always type-check fresh dist (durable fix for the stale-dist trap).
Deleted `test/llm.anthropic.adapter.spec.ts` (asserts mapper details that don't match shipped `_mappers.ts`).
Restored `test/chains.base.chain.spec.ts` as contract test for new BaseChain class.

### Wave 3 — Lint cleanup (commit `07a650a`)
4 unused vars + 1 unused eslint-disable + ANTHROPIC_API_KEY → `turbo.json` globalEnv. 112 → 105 warnings (rest are `no-explicit-any` in test mocks — low value to mechanically fix).

### Wave 4 — Runtime hotfixes during manual test (uncommitted)
**File: `apps/gateway/.env`** — PORT 3010 → 3000 (match docs + web `.env.local`).
**File: `packages/seo-ai-core/package.json`** — remove `"type": "module"`, change `exports.import` → `exports.default` to consumable from CJS (rebuilt dist as CJS).
**File: `apps/gateway/prisma/seed.ts` + `apps/seo-analyzer/prisma/seed.ts`** — import path `../src/generated/prisma` → `../src/infra/prisma/generated`.
**File: `apps/web/src/app/layout.tsx`** — minimal pass-through `<>{children}</>` (no html/body/Providers); locale layout self-contained.
**File: `apps/seo-analyzer/prisma/schema.prisma`** — add `content` to `enum RuleCategory` + prisma migrate dev.
**File: `apps/seo-analyzer/src/analyzer/controllers/analyzer.worker.ts`** — delete dead `await this.publisher.sadd(REDIS_KEYS.auditCompletedSteps(...), 'analyze')` (orchestrator polling pattern bỏ — gây WRONGTYPE collide với report's INCR).
**File: `apps/report/src/report/services/wait-for-both.service.ts`** — `recordAnalyzeDone()` + `recordKeywordDone()`: remove setex (worker already wrote full payload; listener role is just bump counter via `maybeTrigger`).
**File: `docker-compose.yml`** — Redis: `command: ... --maxmemory 768mb --maxmemory-policy allkeys-lru`, mem limit 256M → 1G (LRU evict before docker SIGKILL).
**Workaround for nest --watch không restart**: `pkill -f "apps/<service>"` to force parent watcher respawn.

Verified end-to-end: audit `3dd018fb-dbf7-46a6-b769-cf92900f4661` for `https://200lab.io/blog/dbt-la-gi` ran crawl → analyze (score 77, "good") → keyword → report.aggregate → DB write → `audit.completed` published. Report row persisted: `final_score=77.00, classification=good, total_issues=4, critical_issues=1`.

## Prevention

1. **Choreography key naming convention**: never reuse same Redis key cho 2 data types. Use suffixed pattern (`<purpose>:<datatype>`). Add lint rule grep `sadd|incr|hset` cùng key.
2. **dist freshness**: `turbo check-types.dependsOn += ^build` đã enforce. Đối với vitest, alias workspace package → src để tests luôn chạy current code.
3. **Spec-first pattern phải đi đôi implementation**: nếu commit test cho API chưa implement, tag `[wip]` hoặc skip test. PR review nên block "test file imports non-existent symbol".
4. **CJS/ESM consistency check**: monorepo có CJS gateway → mọi shared package phải xuất CJS hoặc dual. CI nên có job `node -e "require('@repo/seo-ai-core')"` smoke test.
5. **Listener payload contract**: cấm listener viết Redis key mà worker đang own. Pattern: worker writes payload + publishes event with metadata only; listener reads (not writes) the payload.
6. **Prisma seed import path lint**: schema generator output là source of truth; seed phải import từ đó. Add codegen hook check.
7. **Next.js App Router layout rule**: chỉ root `app/layout.tsx` chứa `<html>/<body>`; locale layout NỘI thêm provider, KHÔNG html/body. ESLint plugin `@next/next/no-html-link-for-pages` không catch — cần custom rule.
8. **Redis memory boundary**: `maxmemory` luôn < docker memory limit (leave 25% headroom cho AOF rewrite peaks). Default 256MB không đủ cho site-mode audit + BullMQ + AOF.
9. **nest --watch in-place reload**: tài liệu hoá rằng dev mode đôi khi cần manual restart sau structural change. Hoặc switch sang `tsc-watch + node --watch` pattern.
10. **Health check tolerance**: gateway gRPC HealthCheck phải có warm-up retry (3 attempts, exponential backoff) thay vì single call → tránh false `crawler:false` lúc cold start.

## Lessons Learned

- **Stale build artifacts là kẻ thù số 1**: `dist/index.d.ts` cũ có thể che dấu API drift hàng tuần. CI/CD phải clean rebuild trước check-types. Trong workspace dev, alias trực tiếp src.
- **Pub/sub events là metadata, không phải data**: payload phải nhỏ, đủ identify (auditId + status). Data nằm ở Redis key/Postgres row được worker ghi trước. Listener KHÔNG được overwrite key đã có data.
- **Choreography collision không bao giờ là cosmetic**: WRONGTYPE im lặng dừng pipeline mà không log clear root cause. Code review phải grep mọi `sadd/incr/lpush/hset` cùng key prefix.
- **Site-mode resource estimation**: 1 site audit = N pages × (cheerio + lighthouse + 22 rules + tokenize) → memory burst lớn. Set budget rõ cho mọi resource cap (Redis, Docker, Playwright pool).
- **Dev hot-reload không phải production restart**: tin cậy quá vào hot-reload sẽ debug nhầm "tôi đã fix nhưng vẫn fail". Workflow: edit → `pkill` → restart, không tin cậy watcher.
- **Discovery qua dogfood mới expose architectural gap**: static checks (types, lint, unit test) pass đầy đủ — bug E + bug D chỉ surface khi chạy thật end-to-end với data thật. Mỗi project lớn cần ít nhất 1 vòng `docker:up` + e2e dogfood trước merge.
