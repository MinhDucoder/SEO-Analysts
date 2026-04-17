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

## Thứ tự ưu tiên khi xử lý task

1. Kiểm tra `context/` → hiểu hệ thống
2. Kiểm tra `skills/` → có domain knowledge sẵn không
3. Kiểm tra auto memory → đã giải quyết vấn đề tương tự chưa
4. Thực hiện task → tuân thủ patterns trong skills
5. Cập nhật memory nếu có insight mới

## Skills Quick Reference

| Skill | Trigger Keywords | Domain |
|-------|-----------------|--------|
| backend | NestJS, module, guard, pipe, interceptor, BullMQ, Socket.IO, gateway | NestJS Backend |
| frontend | Next.js, React, TanStack Query, shadcn/ui, Tailwind, App Router | Next.js Frontend |
| database | PostgreSQL, Prisma, Redis, migration, query, caching, transaction | Database |
| crawler | web crawler, Playwright, Cheerio, robots.txt, crawl, scrape | Web Crawling |
| seo-rules | SEO rule, analyzer, score, issue, audit, Core Web Vitals | SEO Engine |
| testing | Vitest, unit test, E2E, Playwright test, mock, coverage | Testing |
| deployment | Docker, Vercel, Railway, Supabase, CI/CD, GitHub Actions | DevOps |

## Commands Quick Reference

| Command | Mô tả |
|---------|--------|
| `/done [task-name]` | Tổng kết task → file summary + Notion API |
| `/knowledge [topic]` | Deep dive kiến thức → file + Notion API |
| `/vi [instruction]` | Trợ lý tiếng Việt với project context |

## Project Overview

- **Dự án**: SEO Analysis Platform (Đồ Án)
- **Mục tiêu**: Công cụ phân tích SEO cho URL, thay thế Ahrefs/SEMrush ở mức cá nhân
- **Kiến trúc**: Monorepo (Turborepo) - microservice-ready modules
- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS + shadcn/ui
- **Backend**: NestJS 10 (modules, DI, guards, pipes, interceptors)
- **Database**: PostgreSQL 16 (Supabase) + Prisma 5 ORM + Redis 7 (BullMQ + cache)
- **Crawling**: Cheerio (HTTP) + Playwright (JS rendering fallback)
- **Analysis**: Lighthouse CI + Custom SEO Rule Engine (20 rules)
- **Real-time**: Socket.IO via @nestjs/websockets
- **Deployment**: Vercel (frontend) + Railway (backend) + Supabase (DB)
- **Cost target**: < $40/month
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

### Quick Route
- **Small:** SP:TDD -> SP:verify -> done
- **Medium:** /office-hours -> gsd:quick -> SP:TDD -> /review -> done
- **Large:** /office-hours + /plan-eng-review -> gsd:discuss + gsd:plan -> SP:TDD + gsd:execute -> /review + /cso + /qa -> /ship -> done

### Domain Skills (tools in CODE phase)
backend/ frontend/ database/ crawler/ seo-rules/ testing/ deployment/

### Ref: docs/workflow/ for detailed guides

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