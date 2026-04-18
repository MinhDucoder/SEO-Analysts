# 10 — Shared Packages & Infrastructure

> **Mục tiêu:** Tài nguyên dùng chung xuyên 5 service + cấu hình monorepo + Docker Compose.
>
> Tất cả package ở `packages/*` được reference qua npm workspace pattern `@repo/{name}`.

---

## 1. `@repo/shared`

File chính: [packages/shared/src/index.ts](../../packages/shared/src/index.ts).

### 1.1 Enum

```typescript
enum AuditStatus {
  PENDING    = 'pending',
  CRAWLING   = 'crawling',
  ANALYZING  = 'analyzing',
  REPORTING  = 'reporting',
  COMPLETED  = 'completed',
  FAILED     = 'failed',
}

enum CheckStatus { PASS = 'pass', WARN = 'warn', FAIL = 'fail' }

enum IssueCategory {
  META, HEADINGS, IMAGES, LINKS,
  PERFORMANCE, TECHNICAL, CONTENT,
}

enum UserRole { USER = 'user', ADMIN = 'admin' }

enum Classification {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

enum FormFactor { MOBILE = 'mobile', DESKTOP = 'desktop' }

enum AuditMode { SINGLE = 'single', SITE = 'site' }

// F2 — alert type emitted by RegressionDetectorService
enum AlertType {
  SCORE_DROP = 'score_drop',   // score tụt >= threshold (default 10)
  NEW_ISSUES = 'new_issues',   // reserved for future use
  SITE_DOWN  = 'site_down',    // score === 0
}
```

### 1.2 Interfaces

```typescript
interface CoreWebVitals {
  lcpMs: number;
  inpMs: number;
  cls: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
}

interface ImageInfo {
  src: string;
  alt: string | null;
  sizeBytes: number;
  format: string;          // jpeg|png|webp|avif|svg|...
}

interface LinkInfo {
  href: string;
  anchorText: string;
  isInternal: boolean;
  rel: string | null;      // "noopener"|"nofollow"|null
  statusCode: number;      // 200 nếu check thành công, 0 nếu chưa check
}

interface RuleCheckOutput {
  status: CheckStatus;
  score: number;           // 0 | 50 | 100
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}

interface AuditProgressEvent {
  auditId: string;
  status: AuditStatus;
  progress: number;        // 0-100
  stage: string;           // 'crawling'|'analyzing'|'reporting'|...
  message?: string;
}

// PageData: contract chính giữa crawler → analyzer
interface PageData {
  // (~30 field, xem [02-crawler.md §7] để có danh sách đầy đủ)
}

// F4 — one entry per <a href> checked by crawler's LinkChecker
type LinkCheckReason =
  | 'HTTP_4XX'
  | 'HTTP_5XX'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'TOO_MANY_REDIRECTS';

interface LinkCheckResult {
  href: string;
  status: number;              // 0 if network error / timeout
  redirectChain: string[];     // visited URLs in order
  isBroken: boolean;
  reason?: LinkCheckReason;
}
```

### 1.3 Constants

#### Rate limit

```typescript
const RATE_LIMIT = {
  AUDIT_PER_HOUR: 10,
  API_PER_MINUTE: 60,
  REGISTER_PER_HOUR: 5,
  LOGIN_ATTEMPTS_PER_15MIN: 10,
} as const;
```

> **Lưu ý:** gateway thực tế hardcode limit riêng (5/h cho audit, 1/h cho register) — chưa dùng hoàn toàn hằng số này. Có thể thống nhất sau.

#### JWT

```typescript
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES_DAYS: 7,
} as const;
```

#### Cache TTL

```typescript
const CACHE_TTL = {
  LIGHTHOUSE_SECONDS: 3600,      // 1h
  CRAWL_SECONDS: 1800,            // 30m
  AUDIT_RESULT_SECONDS: 3600,     // 1h
} as const;
```

#### BullMQ queues

```typescript
const BULLMQ_QUEUES = {
  CRAWL_START:            'crawl.start',
  ANALYZE_START:          'analyze.start',
  KEYWORD_START:          'keyword.start',
  REPORT_START:           'report.start',
  // F1 site-wide crawl
  SITE_CRAWL_START:       'site-crawl.start',
  SITE_CRAWL_URL_AUDIT:   'site-crawl.url-audit',
  SITE_CRAWL_AGGREGATE:   'site-crawl.aggregate',
  // F2 scheduled audits
  SCHEDULED_AUDIT_TICK:   'scheduled-audit.tick',
  ALERT_SEND:             'alert.send',
} as const;
```

> Tất cả service tham chiếu hằng số này để enqueue/register queue — đồng bộ tên xuyên codebase.

#### Site crawl limits (F1)

```typescript
const SITE_CRAWL_LIMITS = {
  MAX_URLS_PER_SITEMAP: 50_000,             // Chuẩn sitemaps.org
  MAX_SITEMAP_BYTES: 52_428_800,            // 50 MB
  MAX_SITEMAP_INDEX_DEPTH: 2,                // Chỉ đệ quy 2 tầng
  DEFAULT_MAX_URLS_PER_AUDIT: 500,
  HARD_CAP_MAX_URLS_PER_AUDIT: 5_000,
} as const;
```

#### Scheduled audit limits (F2)

```typescript
const SCHEDULED_AUDIT_LIMITS = {
  SCORE_DROP_THRESHOLD: 10,        // drop >= 10 → AuditAlert(score_drop)
  MIN_CRON_INTERVAL_MINUTES: 15,
} as const;
```

#### Redis key factories

```typescript
const REDIS_KEYS = {
  lighthouseCache: (urlHash: string, formFactor: FormFactor) =>
    `lighthouse:${formFactor}:${urlHash}`,
  crawlCache: (urlHash: string) =>
    `crawl:${urlHash}`,
  auditCompletedSteps: (auditId: string) =>
    `audit:${auditId}:completed_steps`,
  auditAnalyzeResult: (auditId: string) =>
    `audit:${auditId}:analyze_result`,
  auditKeywordResult: (auditId: string) =>
    `audit:${auditId}:keyword_result`,
  auditCrawlResult: (auditId: string) =>
    `audit:${auditId}:crawl_result`,
  rateLimit: (userId: string) =>
    `rate_limit:${userId}`,
};
```

> **Tại sao dùng factory function?** Dễ refactor key format sau này (vd thêm prefix env). Compile-time type-safe — không lỗi typo key.

### 1.4 Utilities

```typescript
function classify(score: number): Classification {
  if (score >= 80) return Classification.EXCELLENT;
  if (score >= 60) return Classification.GOOD;
  if (score >= 40) return Classification.FAIR;
  return Classification.POOR;
}
```

Dùng ở:
- `seo-analyzer/services/score-calculator.ts` — phân loại analyzer overall.
- `report/services/report.aggregator.ts` — phân loại final score.

---

## 2. `@repo/proto`

File: [packages/proto/src/index.ts](../../packages/proto/src/index.ts).

### 2.1 Proto file manifest

```typescript
export const PROTO_FILES = {
  COMMON:   'common/v1/common.proto',
  CRAWLER:  'crawler/v1/crawler.proto',
  ANALYZER: 'analyzer/v1/analyzer.proto',
  KEYWORD:  'keyword/v1/keyword.proto',
  REPORT:   'report/v1/report.proto',
} as const;

export const PROTO_ROOT = path.resolve(__dirname, '../');
```

### 2.2 Helper

```typescript
function loadProto<T>(relativePath: string): T {
  const packageDef = protoLoader.loadSync(path.join(PROTO_ROOT, relativePath), {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_ROOT],
  });
  return grpc.loadPackageDefinition(packageDef) as unknown as T;
}
```

### 2.3 File layout

```
packages/proto/
├── src/index.ts              # PROTO_FILES, loadProto helper
├── package.json
├── common/v1/common.proto    # Shared enums + messages
├── crawler/v1/crawler.proto  # CrawlerService: CrawlUrl, HealthCheck
├── analyzer/v1/analyzer.proto # SeoAnalyzerService: AnalyzePage, ListRules, ...
├── keyword/v1/keyword.proto  # KeywordAnalyzerService: AnalyzeKeywords
└── report/v1/report.proto    # ReportService: 8 RPC
```

> Mọi service vừa là gRPC server (implement service trong proto) vừa có thể là client (load và gọi). Chi tiết RPC xem [21-api-contracts.md §2-5](21-api-contracts.md).

### 2.4 Convention

- **Tất cả proto dùng `proto3`**.
- **Namespace:** `{service}.v1` — versioned từ đầu, dễ mở rộng v2 mà không breaking.
- **Import chéo:** `crawler.proto` import `common/v1/common.proto` cho enum `CheckStatus`, `IssueCategory`.
- **Field naming:** snake_case trong proto, loader với `keepCase: false` convert sang camelCase trong TS.

---

## 3. `@repo/ui`

File chính: [packages/ui/src/](../../packages/ui/src/).

### 3.1 Component exports

```typescript
// packages/ui/src/button.tsx
export const Button: FC<{ children, className?, appName }>

// packages/ui/src/card.tsx
export const Card: FC<{ className?, title, children, href }>

// packages/ui/src/code.tsx
export const Code: FC<{ children, className? }>
```

### 3.2 Trạng thái hiện tại

3 component mẫu từ Turborepo starter — **chưa được sử dụng trong project thật** (vì frontend chưa có). Sẽ bị override/thay thế khi tạo `apps/web` với shadcn/ui.

**Kế hoạch:** khi build frontend ([30-frontend-architecture.md](30-frontend-architecture.md)), package này chứa:
- Design tokens (color palette, spacing, typography) dạng TS constants hoặc CSS variables.
- shadcn/ui base components bị customize (Button, Card, Input, ...).
- Composite SEO-specific components: ScoreBadge, IssueList, CategoryBar, CwvTile.
- Types: `FormState`, `AuditSummary`, etc.

---

## 4. `@repo/typescript-config`

File: [packages/typescript-config/](../../packages/typescript-config/).

| Preset | Use case | Key settings |
|---|---|---|
| [`base.json`](../../packages/typescript-config/base.json) | Baseline cho tất cả | ES2022, strict, NodeNext resolution, `noUncheckedIndexedAccess: true` |
| [`nestjs.json`](../../packages/typescript-config/nestjs.json) | Backend NestJS services | Extends base; CommonJS, decorators, emitDecoratorMetadata, outDir ./dist |
| [`nextjs.json`](../../packages/typescript-config/nextjs.json) | Next.js frontend (khi có) | Extends base; ESNext, Bundler resolution, JSX preserve, no emit |
| [`react-library.json`](../../packages/typescript-config/react-library.json) | React library (@repo/ui) | Extends base; JSX react-jsx |

**Base `compilerOptions`:**
```json
{
  "declaration": true,
  "declarationMap": true,
  "esModuleInterop": true,
  "isolatedModules": true,
  "lib": ["es2022", "DOM", "DOM.Iterable"],
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "noUncheckedIndexedAccess": true,
  "resolveJsonModule": true,
  "skipLibCheck": true,
  "strict": true,
  "target": "ES2022"
}
```

**`noUncheckedIndexedAccess: true`** — TS warning khi access `arr[i]` chưa check undefined. Strict hơn default, bắt bug index-out-of-bounds.

**Sử dụng trong service:**
```json
// apps/gateway/tsconfig.json
{
  "extends": "@repo/typescript-config/nestjs",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

---

## 5. `@repo/eslint-config`

File: [packages/eslint-config/](../../packages/eslint-config/).

**Exports:**
```json
{
  "./base": "./base.js",
  "./next-js": "./next.js",
  "./react-internal": "./react-internal.js",
  "./nestjs": "./nestjs.js"
}
```

| Preset | Plugins | Target |
|---|---|---|
| `base.js` | @eslint/js recommended, Prettier, TypeScript, Turbo | Mọi package (baseline) |
| `nestjs.js` | Base + @typescript-eslint; tắt `interface-name-prefix`, `explicit-function-return-type`; warn `no-explicit-any` | Backend services |
| `next.js` | Base + React + React Hooks + Next.js; ignore `.next/`, `out/`, `build/`; enforce core-web-vitals | Frontend Next.js |
| `react-internal.js` | Base + React + React Hooks; globals browser + serviceworker | Internal React lib |

**Turbo plugin lint cảnh báo:** warn khi code access `process.env.X` nhưng `X` chưa khai báo trong `turbo.json` > `env` list → tránh cache miss do env không tracked.

**Sử dụng:**
```javascript
// apps/gateway/eslint.config.mjs
import config from '@repo/eslint-config/nestjs';
export default config;
```

---

## 6. `docker-compose.yml`

File: [docker-compose.yml](../../docker-compose.yml) (root).

### 6.1 Infrastructure services

| Service | Image | Expose | RAM | CPU | Purpose |
|---|---|---|---|---|---|
| `gateway-db` | postgres:16-alpine | 5432 | 512 MB | 0.5 | User + Audit + RefreshToken |
| `analyzer-db` | postgres:16-alpine | 5433 | 512 MB | 0.5 | SeoRule + RuleResult |
| `report-db` | postgres:16-alpine | 5434 | 512 MB | 0.5 | Report + ShareLink |
| `redis` | redis:7-alpine | 6379 | 256 MB | 0.25 | BullMQ + pub/sub + rate limit |

Tất cả có healthcheck (`pg_isready`, `redis-cli ping`).

### 6.2 Application services

| Service | Port(s) | Depends on | RAM | CPU |
|---|---|---|---|---|
| `gateway` | 3000 (HTTP) | 3 DB + redis + crawler + analyzer + report | 512 MB | 0.5 |
| `crawler` | 50052 (gRPC nội bộ) | redis | 1536 MB | 1.0 |
| `seo-analyzer` | 50053 (gRPC nội bộ) | analyzer-db + redis | 512 MB | 0.5 |
| `keyword-analyzer` | 50054 (gRPC nội bộ) | redis | 512 MB | 0.5 |
| `report` | 3004 (HTTP), 50055 (gRPC nội bộ) | report-db + redis | 1536 MB | 1.0 |

**RAM crawler + report cao hơn** vì chạy Chromium (Lighthouse + PDF).

### 6.3 Networks

- `backend` — gateway + crawler + analyzer + keyword + report. Dùng cho gRPC.
- `data` — gateway + analyzer + report + redis + 3 DB. Crawler **không join** `data` network → URL validator DNS-resolve `redis`/`gateway-db` sẽ fail → không thể fetch nội bộ.

**Tách network chính là một lớp SSRF defense bổ sung** — nếu attacker bypass URL validator của crawler bằng một lỗi nào đó, vẫn không đến được DB.

### 6.4 Env vars (trích)

File: [.env.docker.example](../../.env.docker.example).

```
# Databases
GATEWAY_DB_USER=seo_admin
GATEWAY_DB_PASS=...
GATEWAY_DB_NAME=seo_gateway
ANALYZER_DB_USER=seo_admin
...
REPORT_DB_USER=seo_admin
...

# Redis
REDIS_PASSWORD=...

# JWT
JWT_ACCESS_SECRET=<32+ bytes random>
JWT_REFRESH_SECRET=...

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# gRPC targets (internal DNS trong network)
CRAWLER_GRPC_URL=crawler:50052
ANALYZER_GRPC_URL=seo-analyzer:50053
KEYWORD_GRPC_URL=keyword-analyzer:50054
REPORT_GRPC_URL=report:50055
REPORT_HTTP_URL=http://report:3004

# Frontend (CORS)
FRONTEND_URL=http://localhost:3001
```

### 6.5 Volumes

- `gateway-db-data`, `analyzer-db-data`, `report-db-data` — Postgres data (persist).
- `redis-data` — AOF nếu enable.
- Không mount source code (production mode build image).

### 6.6 Healthcheck chain

Gateway depends on 3 DB + redis + 3 service → Docker compose `depends_on` + healthcheck → start theo thứ tự:

```
redis + 3 DB (parallel, ~5s)
  └─ seo-analyzer + keyword-analyzer + crawler + report (parallel, ~10s)
        └─ gateway (~5s)
Total: ~20s
```

Image đầu tiên build lâu (~5 phút) vì Playwright pull Chromium.

---

## 7. `turbo.json`

File: [turbo.json](../../turbo.json).

### 7.1 Task pipeline

| Task | Depends on | Cache | Outputs |
|---|---|---|---|
| `build` | `^build` (upstream) | ✅ | `.next/**`, `dist/**` |
| `dev` | — | ❌ (persistent) | — |
| `lint` | `^lint` | ✅ | — |
| `check-types` | `^check-types` | ✅ | — |
| `test` | `^build` | ✅ | `coverage/**` |
| `test:watch` | — | ❌ (persistent) | — |
| `prisma:generate` | — | ❌ | `src/infra/prisma/generated/**` |
| `prisma:migrate` | — | ❌ | — |
| `prisma:seed` | — | ❌ | — |

### 7.2 Cache key

Turbo tự hash:
- Source files (`$TURBO_DEFAULT` = src/**, test/**, package.json, tsconfig.json)
- Upstream package hashes
- Env vars được declare trong `task.env` list

Cache hit → task skip hoàn toàn. Đặc biệt hữu ích trong CI khi chỉ 1 service thay đổi.

### 7.3 Root `package.json` scripts

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "dev:gateway": "turbo run dev --filter=@seo/gateway",
    "dev:crawler": "turbo run dev --filter=@seo/crawler",
    "dev:analyzer": "turbo run dev --filter=@seo/seo-analyzer",
    "dev:keyword": "turbo run dev --filter=@seo/keyword-analyzer",
    "dev:report": "turbo run dev --filter=@seo/report",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "test": "turbo run test",
    "docker:up": "docker-compose --env-file .env.docker up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:reset": "docker-compose down -v && npm run docker:up",
    "e2e:smoke": "bash scripts/smoke-test.sh"
  }
}
```

---

## 8. Workspace layout

### 8.1 Top-level

```
DO_AN/
├── apps/
│   ├── gateway/
│   ├── crawler/
│   ├── seo-analyzer/
│   ├── keyword-analyzer/
│   └── report/
├── packages/
│   ├── proto/              # Proto files + loader
│   ├── shared/             # Constants, enums, interfaces, utils
│   ├── ui/                 # React components (chưa dùng nhiều)
│   ├── typescript-config/  # TSConfig presets
│   └── eslint-config/      # ESLint presets
├── docker-compose.yml
├── turbo.json
├── package.json            # workspaces: ["apps/*", "packages/*"]
├── package-lock.json
├── scripts/
│   └── smoke-test.sh       # E2E test end-to-end
└── docs/                   # Documentation
```

### 8.2 Cross-package imports

Bên trong service:
```typescript
import { BULLMQ_QUEUES, AuditStatus, classify } from '@repo/shared';
import { loadProto, PROTO_FILES } from '@repo/proto';
```

Workspace dùng `"@repo/shared": "*"` trong package.json:
```json
{
  "dependencies": {
    "@repo/shared": "*",
    "@repo/proto": "*"
  }
}
```

npm workspace symlink `node_modules/@repo/shared` → `packages/shared`.

### 8.3 Husky + commit hooks

Root có [.husky/](../../.husky/) với pre-commit hook chạy:
- ESLint
- TypeScript check trên file đã staged

---

## 9. Build flow overall

```
Dev flow:
  Source code thay đổi
   → `npm run dev` (turbo dev watches all)
   → Mỗi service NestJS watch mode (nodemon/ts-node-dev)
   → Hot reload

Prod build flow:
  `npm run build`
   → turbo run build
   → Thứ tự dependency:
       1. @repo/shared (compile TS → dist)
       2. @repo/proto   (compile TS → dist)
       3. apps/* (build NestJS)
   → Cache kết quả trong .turbo/

Docker build flow:
  `docker-compose build`
   → Multi-stage Dockerfile mỗi service:
       Stage 1: deps (npm ci)
       Stage 2: build (npm run build)
       Stage 3: runtime (copy dist + node_modules production)
   → Image ~300-600 MB tuỳ service
```

---

## 10. File tham chiếu

| Path | Purpose |
|---|---|
| [packages/shared/src/index.ts](../../packages/shared/src/index.ts) | Mọi enum, constant, interface, util |
| [packages/proto/src/index.ts](../../packages/proto/src/index.ts) | Proto loader + PROTO_FILES |
| [packages/proto/common/v1/common.proto](../../packages/proto/common/v1/common.proto) | Shared proto types |
| [packages/proto/crawler/v1/crawler.proto](../../packages/proto/crawler/v1/crawler.proto) | Crawler gRPC |
| [packages/proto/analyzer/v1/analyzer.proto](../../packages/proto/analyzer/v1/analyzer.proto) | Analyzer gRPC |
| [packages/proto/keyword/v1/keyword.proto](../../packages/proto/keyword/v1/keyword.proto) | Keyword gRPC |
| [packages/proto/report/v1/report.proto](../../packages/proto/report/v1/report.proto) | Report gRPC |
| [packages/typescript-config/base.json](../../packages/typescript-config/base.json) | TS baseline |
| [packages/typescript-config/nestjs.json](../../packages/typescript-config/nestjs.json) | NestJS preset |
| [packages/eslint-config/base.js](../../packages/eslint-config/base.js) | ESLint baseline |
| [packages/eslint-config/nestjs.js](../../packages/eslint-config/nestjs.js) | NestJS ESLint preset |
| [docker-compose.yml](../../docker-compose.yml) | Infra orchestration |
| [turbo.json](../../turbo.json) | Task pipeline |
| [package.json](../../package.json) | Workspaces + scripts |

---

## 11. Đi tiếp

- Xem full gRPC RPC + REST endpoint → [21-api-contracts.md](21-api-contracts.md)
- Xem 3 DB schema chi tiết → [20-data-model.md](20-data-model.md)
- Xem queue + event → [22-job-pipeline.md](22-job-pipeline.md)
