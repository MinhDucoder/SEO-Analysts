# .claude System Brain

> Bộ não trung tâm của .claude folder. Mọi context, rules, workflows, skills được tham chiếu từ đây.

## Tổng quan hệ thống

```
.claude/
├── claude.md            → FILE NÀY - system brain
├── commands/            → Slash commands (/done, /knowledge, /vi)
├── skills/              → Domain skills (7 chuyên biệt)
│   ├── backend/         → NestJS modules, guards, pipes, BullMQ, Socket.IO
│   ├── frontend/        → Next.js 14, TanStack Query, shadcn/ui
│   ├── database/        → PostgreSQL, Prisma ORM, Redis caching
│   ├── crawler/         → Cheerio, Playwright, robots.txt, data extraction
│   ├── seo-rules/       → SEO rule engine, analyzers, weighted scoring
│   ├── testing/         → Vitest, Testing Library, Playwright E2E
│   └── deployment/      → Docker, Vercel, Railway, Supabase, CI/CD
├── context/             → Project knowledge base
│   ├── index.md         → Quick reference + key paths
│   ├── architecture.md  → System architecture + module structure
│   ├── tech-stack.md    → Dependencies + versions
│   └── data-flow.md     → Request flows + data pipelines
├── agents/              → Specialized AI agents
└── settings.local.json  → Permissions + hooks + sandbox
```

## Quy tắc vận hành

1. **Ngôn ngữ**: Trả lời bằng tiếng Việt (trừ từ chuyên môn). Code comments bằng tiếng Anh.
1a. **Commit messages**: TUYỆT ĐỐI KHÔNG thêm `Co-Authored-By: Claude ...` / `🤖 Generated with Claude Code` / bất kỳ attribution nào cho Claude/Claude Code vào commit hoặc PR body. Commit messages phải giữ sạch như do người viết.
2. **Context-first**: Đọc `context/` trước khi bắt đầu task phức tạp
3. **Skill-driven**: Sử dụng `skills/` cho domain-specific patterns
4. **NestJS-first**: Backend luôn dùng NestJS patterns (modules, decorators, DI, guards, pipes)

## Graph-first exploration (code-review-graph)

Dự án có persistent knowledge graph. **Luôn ưu tiên MCP tools** (`detect_changes_tool`, `get_impact_radius_tool`, `query_graph_tool`, `semantic_search_nodes_tool`, `get_architecture_overview_tool`, `get_minimal_context_tool`) thay vì Grep/Glob/Read cho câu hỏi structural. Chi tiết tool catalog + decision tree + limitations: xem `CLAUDE.md` (project root).

## Thứ tự ưu tiên khi xử lý task

0. **Graph-first** (nếu câu hỏi là structural: callers, impact, coverage, architecture) → dùng code-review-graph MCP tools, KHÔNG Grep/Read để trace.
1. Kiểm tra `context/` → hiểu hệ thống (business/domain)
2. Kiểm tra `skills/` → có domain knowledge sẵn không
3. Kiểm tra auto memory → đã giải quyết vấn đề tương tự chưa
4. Thực hiện task → tuân thủ patterns trong skills
5. Cập nhật memory nếu có insight mới

## Skills Quick Reference

| Skill | Trigger Keywords | Applies to |
|-------|-----------------|--------|
| backend | NestJS, module, guard, pipe, interceptor, BullMQ, Socket.IO, **gRPC**, **proto**, **service boundary**, **choreography** | All 5 services |
| frontend | Next.js, React, TanStack Query, shadcn/ui, Tailwind, App Router, `@repo/ui` | (pending apps/web) |
| database | PostgreSQL, Prisma, Redis, migration, query, caching, transaction, **3-DB boundary** | gateway, seo-analyzer, report |
| crawler | web crawler, Playwright, Cheerio, robots.txt, crawl, scrape, Lighthouse | crawler only |
| seo-rules | SEO rule, analyzer, score, issue, audit, Core Web Vitals | seo-analyzer only |
| testing | Vitest, unit test, E2E, **e2e:smoke**, Playwright test, mock, coverage | All services |
| deployment | Docker, **docker-compose**, Vercel, Railway, Supabase, CI/CD, GitHub Actions, **Turborepo** | Monorepo root |

## Commands Quick Reference

| Command | Mô tả |
|---------|--------|
| `/done [task-name]` | Tổng kết task → file summary + Notion API |
| `/knowledge [topic]` | Deep dive kiến thức → file + Notion API |
| `/vi [instruction]` | Trợ lý tiếng Việt với project context |

## Project Overview

- **Dự án**: SEO Analysis Platform (Đồ Án)
- **Mục tiêu**: Công cụ phân tích SEO cho URL, thay thế Ahrefs/SEMrush ở mức cá nhân
- **Kiến trúc**: Monorepo (Turborepo) — **5 NestJS microservices** với DDD per service
  - `gateway` (3000 HTTP, 50051 gRPC) — public API, auth, orchestrator
  - `crawler` (50052 gRPC) — Playwright + Cheerio + Lighthouse
  - `seo-analyzer` (50053 gRPC) — 20 SEO rules + Prisma
  - `keyword-analyzer` (50054 gRPC) — TF + density, stateless
  - `report` (3004 HTTP, 50055 gRPC) — aggregate + PDF + compare
- **Inter-service**: gRPC (sync) + BullMQ (async jobs) + Redis pub/sub (events)
- **Shared packages**: `@repo/shared`, `@repo/proto`, `@repo/ui`, `@repo/typescript-config`, `@repo/eslint-config`
- **Frontend**: Next.js 14 + React 18 + Tailwind + shadcn/ui — **pending scaffold** (use `@repo/ui` as primitive library)
- **Database**: PostgreSQL 16 × 3 DBs (`seo_gateway`, `seo_analyzer`, `seo_report`) + Prisma 5 + Redis 7
- **Crawling**: Cheerio (default) + Playwright (JS fallback)
- **Analysis**: Lighthouse (programmatic) + Custom SEO Rule Engine (20 rules)
- **Real-time**: Socket.IO @ gateway + Redis pub/sub choreography
- **Deployment**: Vercel (future apps/web) + Railway (services) + Supabase (DBs)
- **Cost target**: < $40/month

> **Current service truth**: `apps/CLAUDE.md` (cross-service map) + `apps/<service>/CLAUDE.md` (per-service DDD layout).
## Workflow Rules (3-Framework Integration)

### Size Detection (Auto)
- **Small:** <= 2 files, no arch change, bug fix/config/typo, no research
- **Medium:** 3-7 files, 1 module feature, needs discuss, has edge cases
- **Large:** > 7 files or > 2 modules, arch/data model change, needs research, multi-step
- **Overlap:** If task matches multiple tiers → pick HIGHEST tier.
- **Unsure?** Pick higher tier.

### Phase Ownership
| Phase | Owner | Skills |
|-------|-------|--------|
| THIET KE | GStack wins | /office-hours, /plan-ceo-review (optional), /plan-eng-review |
| CHIA NHO | GSD wins | gsd:discuss-phase, gsd:plan-phase |
| CODE | Superpowers wins | SP:TDD (test->fail->implement->pass), gsd:execute (large) |
| KIEM DINH | GStack wins | /review, /cso, /qa |
| SHIP | GStack wins | /ship, /land-and-deploy, /canary |

**Exception:** Small tasks: KIEM DINH uses SP:verify (GStack skipped — overhead not justified for ≤2 files).

### Conflict Rule
- Phase owner decides HOW. Co-owner decides WHEN/ORDER.
- Cross-phase: output phase N = mandatory input for phase N+1. If conflict → earlier phase wins.

### Failure Handling
KIEM DINH fail → return to CODE → fix → re-run KIEM DINH. Max 2 retries → STOP, ask user.
Large: re-run ONLY failed checks.

### Size Escalation
If scope grows beyond current tier mid-CODE → STOP → re-classify → restart from first skipped phase. Code already written is kept.

### Quick Route (per tier × impact)
- **Small (single-service):** SP:TDD → SP:verify → commit
- **Medium (single-service):** /office-hours → gsd:quick → SP:TDD → /review → commit
- **Medium (cross-service):** above + proto typecheck + e2e:smoke before /review
- **Large (standard):** /office-hours + /plan-eng-review → gsd:discuss + gsd:plan → gsd:execute (TDD waves) → /review + /cso + /qa + microservices gates → /ship + /land-and-deploy + /canary
- **Large (proto-breaking):** standard-large + proto-breaking protocol (PR 1 additive → PR 2 cleanup ≥1 cycle later) + staged rollout (consumer first)

### Forcing escalations (auto-detect)
- Any `packages/proto/**` change → **LARGE + proto-breaking**
- Any ≥2 `apps/*` touched → **MEDIUM minimum**
- Any Prisma schema/migrations change → **MEDIUM minimum**
- Any `@repo/shared` change → **MEDIUM minimum**

### Domain Skills (tools in CODE phase)
`backend/` (all services) · `database/` (gateway, seo-analyzer, report) · `crawler/` (crawler) · `seo-rules/` (seo-analyzer) · `testing/` (all) · `deployment/` (root) · `frontend/` (pending apps/web)

### Ref
- Primary: `.claude/workflow/WORKFLOW-SEO-ANALYSTS.md` (microservices-aware)
- Framework-agnostic: `.claude/workflow/WORKFLOW.md`
- Tier guides: `.claude/workflow/WORKFLOW-{SMALL,MEDIUM,LARGE}.md`
- Mirrors for human reading: `docs/workflow/`
- Current service truth: `apps/CLAUDE.md` + `apps/<service>/CLAUDE.md`

## gstack

Khi cần browse web, luôn dùng /browse của gstack.

Danh sách skills có sẵn:

/office-hours
/plan-ceo-review
/plan-eng-review
/plan-design-review
/design-consultation
/design-shotgun
/design-html
/review
/ship
/land-and-deploy
/canary
/benchmark
/browse
/connect-chrome
/qa
/qa-only
/design-review
/setup-browser-cookies
/setup-deploy
/retro
/investigate
/document-release
/codex
/cso
/autoplan
/plan-devex-review
/devex-review
/careful
/freeze
/guard
/unfreeze
/gstack-upgrade
/learn