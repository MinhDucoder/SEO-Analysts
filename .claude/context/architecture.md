> **⚠ STALE (as of 2026-04-17)**: This file describes the pre-refactor monolith (`apps/web` + `apps/api`).
> The repo is now 5 NestJS microservices. For current-state truth, read:
> - `apps/CLAUDE.md` — cross-service map + data flow
> - `apps/<service>/CLAUDE.md` — per-service DDD layout
> - `.claude/context/index.md` — quick reference
>
> This file is retained for historical context only; **do NOT use for planning decisions**.

---

# Architecture Overview

## Monorepo Structure

```
seo-platform/
├── apps/
│   ├── web/                   # Next.js 14 Frontend (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/            # Auth routes (login, register)
│   │   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   │   ├── audits/            # Audit history, detail pages
│   │   │   │   └── settings/          # User settings
│   │   │   ├── audit/[id]/        # Audit progress + results page
│   │   │   └── page.tsx           # Landing page with URL input
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── audit/             # Audit-specific components
│   │   │   │   ├── ScoreGauge.tsx
│   │   │   │   ├── IssuesList.tsx
│   │   │   │   ├── CategoryScores.tsx
│   │   │   │   └── ProgressTracker.tsx
│   │   │   └── layout/           # Header, Sidebar, Footer
│   │   ├── hooks/
│   │   │   ├── useAudit.ts        # Audit submission + polling
│   │   │   ├── useSocket.ts       # Socket.IO connection
│   │   │   └── useAuth.ts         # Auth state management
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios API client
│   │   │   ├── auth.ts            # JWT token management
│   │   │   └── socket.ts          # Socket.IO client setup
│   │   └── providers/
│   │       ├── QueryProvider.tsx   # TanStack Query
│   │       └── AuthProvider.tsx    # Auth context
│   │
│   └── api/                   # NestJS 10 Backend
│       └── src/
│           ├── app.module.ts        # Root NestJS module
│           ├── main.ts              # NestJS bootstrap + Swagger + GlobalPipes
│           ├── modules/             # Feature modules
│           │   ├── auth/
│           │   │   ├── auth.module.ts
│           │   │   ├── auth.controller.ts
│           │   │   ├── auth.service.ts
│           │   │   ├── dto/
│           │   │   ├── strategies/        # JWT, Google OAuth (Passport)
│           │   │   └── guards/            # JwtAuthGuard, OptionalAuthGuard
│           │   ├── crawler/
│           │   │   ├── crawler.module.ts
│           │   │   ├── crawler.service.ts
│           │   │   ├── cheerio.fetcher.ts
│           │   │   ├── playwright.fetcher.ts
│           │   │   ├── robots.parser.ts
│           │   │   └── data-extractor.ts
│           │   ├── rules/
│           │   │   ├── rules.module.ts
│           │   │   ├── rule-registry.service.ts
│           │   │   ├── score-calculator.service.ts
│           │   │   ├── priority-ranker.service.ts
│           │   │   ├── analyzers/
│           │   │   │   ├── technical/     # robots, sitemap, canonical, https, redirects, schema, meta-robots
│           │   │   │   ├── on-page/       # title, meta-desc, h1, alt-text, internal-links
│           │   │   │   └── performance/   # ttfb, page-size, external-requests, compression, cache
│           │   │   └── interfaces/
│           │   │       └── analyzer.interface.ts
│           │   ├── lighthouse/
│           │   │   ├── lighthouse.module.ts
│           │   │   ├── lighthouse.service.ts
│           │   │   └── web-vitals.extractor.ts
│           │   ├── audit/
│           │   │   ├── audit.module.ts
│           │   │   ├── audit.controller.ts
│           │   │   ├── audit.service.ts
│           │   │   ├── audit.processor.ts     # BullMQ @Processor
│           │   │   ├── audit.gateway.ts       # @WebSocketGateway
│           │   │   └── dto/
│           │   └── report/
│           │       ├── report.module.ts
│           │       ├── report.controller.ts
│           │       ├── report.service.ts
│           │       └── pdf.generator.ts
│           │
│           ├── common/
│           │   ├── filters/              # HttpExceptionFilter
│           │   ├── interceptors/         # LoggingInterceptor, TransformInterceptor
│           │   └── decorators/           # @CurrentUser, @Public
│           │
│           ├── prisma/
│           │   ├── prisma.module.ts       # @Global PrismaModule
│           │   ├── prisma.service.ts      # PrismaClient as NestJS service
│           │   ├── schema.prisma
│           │   └── migrations/
│           │
│           └── config/
│               └── configuration.ts       # @nestjs/config typed config
│
├── packages/
│   └── shared/                # Shared TypeScript types
│       ├── types/
│       │   ├── audit.types.ts
│       │   ├── seo.types.ts
│       │   └── api.types.ts
│       └── constants/
│           └── seo-rules.constants.ts
│
├── docker-compose.yml         # PostgreSQL 16 + Redis 7
├── turbo.json                 # Turborepo config
├── .github/workflows/         # CI/CD (lint, test, deploy)
└── package.json               # Root workspace
```

## Luồng Request chính

```
User → Next.js (Landing Page)
            ↓
      URL Input → POST /api/audits
            ↓
      NestJS → ValidationPipe → ThrottlerGuard → OptionalAuthGuard
            ↓
      AuditController → AuditService → Bull Queue (Redis)
            ↓
      Response: { jobId } → Redirect to /audit/:jobId
            ↓
      Socket.IO (@WebSocketGateway) → Real-time progress updates
            ↓
      AuditProcessor (@Processor):
        1. CrawlerService → Fetch page (Cheerio/Playwright)
        2. RuleRegistryService → Run 20 SEO analyzers
        3. LighthouseService → Core Web Vitals
        4. ScoreCalculatorService → Weighted scoring
        5. PriorityRankerService → Rank issues
        6. PrismaService → Save results (PostgreSQL)
            ↓
      Socket.IO → "completed" event
            ↓
      Frontend → GET /api/audits/:id → Display results
```

## Background Processing

```
POST /api/audits → AuditService → @InjectQueue → Bull Queue (Redis)
                                                       ↓
                                                 @Processor (AuditProcessor)
                                                       ↓
                                                 Crawl → Analyze → Score → Report
                                                       ↓
                                                 PrismaService + @WebSocketGateway
```

## API Routes

| Route | Method | Auth | Mô tả |
|-------|--------|------|--------|
| `/api/auth/register` | POST | No | Đăng ký email/password |
| `/api/auth/login` | POST | No | Đăng nhập → JWT |
| `/api/auth/refresh` | POST | No | Refresh token |
| `/api/auth/google` | GET | No | Google OAuth |
| `/api/audits` | POST | Optional | Tạo audit job (guest: giới hạn rules) |
| `/api/audits/:id` | GET | Optional | Lấy kết quả audit |
| `/api/audits/history` | GET | Yes | Lịch sử audit của user |
| `/api/audits/:id/report` | GET | Optional | Report JSON |
| `/api/audits/:id/report/pdf` | GET | Optional | Download PDF |
| `/api/docs` | GET | No | Swagger API documentation |

## NestJS Patterns

- **Module Pattern**: Mỗi feature là 1 @Module (controller + service + providers)
- **Dependency Injection**: Constructor injection qua @Injectable
- **Repository Pattern**: PrismaService (global) cho database access
- **Registry Pattern**: SEO rules tự đăng ký vào RuleRegistryService
- **Producer/Consumer**: @InjectQueue + @Processor cho async job processing
- **Gateway Pattern**: @WebSocketGateway cho real-time communication
- **Strategy Pattern**: Cheerio vs Playwright cho crawling
- **Guard Pattern**: JwtAuthGuard, OptionalAuthGuard, ThrottlerGuard

## NestJS Backend Layer

```
Request → GlobalPipes (ValidationPipe) → Guards → Interceptors → Controller → Service → Prisma / Bull Queue
                                                                                              ↓
                                                                           ExceptionFilter ← Error
```

- **Pipes**: Validate + transform request data (class-validator DTOs)
- **Guards**: Auth checks (@UseGuards)
- **Interceptors**: Logging, response transformation
- **Controller**: Parse request, delegate to service
- **Service**: Business logic, orchestration (@Injectable)
- **PrismaService**: Type-safe database operations

## Frontend Layer

```
Page (Server/Client Component) → Custom Hook → API Client → NestJS Backend
                               ↓
                         TanStack Query (server state cache)
                               ↓
                         Socket.IO (real-time updates)
```
