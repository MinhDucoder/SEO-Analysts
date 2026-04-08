# Context Index

> Danh mục tất cả context files để nhanh chóng tìm đúng thông tin.

## Files trong context/

| File | Mô tả | Khi nào đọc |
|------|--------|-------------|
| `architecture.md` | Kiến trúc tổng quan hệ thống | Task liên quan cấu trúc, thêm feature mới |
| `tech-stack.md` | Chi tiết tech stack + versions | Debug dependency, upgrade, config |
| `data-flow.md` | Luồng dữ liệu chính trong app | Debug data issues, thêm API mới |

## Quick Reference

### Project: SEO Analysis Platform (MVP)
- **Type**: Full-stack SEO audit tool (Đồ Án)
- **Monorepo**: Turborepo (pnpm workspaces)
- **Node.js**: 20
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + TanStack Query
- **Backend**: NestJS 10 (modules, DI, guards, pipes, interceptors) + BullMQ + Socket.IO
- **Database**: PostgreSQL 16 (Supabase) + Prisma 5 ORM + Redis 7
- **Crawler**: Cheerio + Playwright (fallback)
- **Performance**: Lighthouse CI (programmatic)
- **Deploy**: Vercel + Railway + Supabase

### Key Paths

| Path | Mô tả |
|------|--------|
| `apps/web/` | Next.js 14 frontend (App Router) |
| `apps/web/app/` | App Router pages |
| `apps/web/components/` | React components (shadcn/ui based) |
| `apps/web/hooks/` | Custom React hooks |
| `apps/web/lib/` | Utilities, API client |
| `apps/api/` | NestJS 10 backend |
| `apps/api/src/main.ts` | NestJS bootstrap + Swagger + GlobalPipes |
| `apps/api/src/app.module.ts` | Root NestJS module |
| `apps/api/src/modules/` | NestJS feature modules |
| `apps/api/src/modules/auth/` | Authentication (JWT + OAuth + Guards) |
| `apps/api/src/modules/crawler/` | Web crawler service |
| `apps/api/src/modules/rules/` | SEO rule engine (registry pattern) |
| `apps/api/src/modules/audit/` | Audit orchestrator (Bull queue + WebSocket) |
| `apps/api/src/modules/lighthouse/` | Lighthouse performance analysis |
| `apps/api/src/modules/report/` | Report generation + PDF export |
| `apps/api/src/prisma/` | PrismaModule (global) + schema + migrations |
| `apps/api/src/common/` | Shared filters, interceptors, decorators |
| `packages/shared/` | Shared TypeScript types/interfaces |

### Entry Points

| Entry | File | Mô tả |
|-------|------|--------|
| Frontend | `apps/web/app/layout.tsx` | Root layout (Next.js App Router) |
| Landing | `apps/web/app/page.tsx` | Landing page with URL input |
| Audit Progress | `apps/web/app/audit/[id]/page.tsx` | Real-time audit progress |
| Audit Results | `apps/web/app/audit/[id]/results/page.tsx` | Results dashboard |
| Backend | `apps/api/src/main.ts` | NestJS bootstrap |
| Root Module | `apps/api/src/app.module.ts` | NestJS root module (imports all feature modules) |
| API Docs | `/api/docs` | Swagger UI |

### Feature Modules (7 NestJS modules)

1. **AuthModule** - JWT + Google OAuth, Passport strategies, Guards, rate limiting
2. **CrawlerModule** - Cheerio + Playwright, robots.txt respect, data extraction
3. **RulesModule** - 20 SEO rules, registry pattern, weighted scoring
4. **AuditModule** - Bull queue processor, WebSocket gateway, saga workflow
5. **LighthouseModule** - Core Web Vitals (LCP, CLS, INP, TTFB)
6. **ReportModule** - Score breakdown, fix recommendations, PDF export
7. **PrismaModule** - Global database service (@Global)

### Background Processing

- **Bull Queue**: `audit-queue` via @nestjs/bull + @Processor
- **Socket.IO**: @WebSocketGateway for real-time progress events
- **Redis**: Job state, caching, rate limiting
