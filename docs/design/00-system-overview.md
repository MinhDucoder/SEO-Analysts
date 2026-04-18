# 00 — Tổng quan hệ thống

> **Tài liệu đi kèm:** [README.md](README.md) — mục lục tổng. Xem nhanh file này xong, rẽ vào từng service (01–05) hoặc contract (21).

---

## 1. Nền tảng SEO Analyst Platform là gì?

Một hệ microservice giúp người dùng **nhập 1 URL hoặc 1 domain** → tự động:

1. Tải trang về (Cheerio nhanh hoặc Playwright cho SPA).
2. Kiểm **22 tiêu chí SEO** (meta, headings, images, links, technical, content, performance — bao gồm `broken_links` và `readability` từ Tier 1).
3. Đo Core Web Vitals bằng Google Lighthouse — **mobile + desktop song song** (F5).
4. Phân tích mật độ & vị trí từ khoá (tiếng Việt + tiếng Anh).
5. Gộp thành điểm 0–100 + danh sách khuyến nghị.
6. Xuất PDF A4 có font Việt chuẩn + share link công khai.

**Sau Tier 1 (04/2026) có thêm:**

7. **Site-wide audit (F1)** — audit toàn bộ domain qua `robots.txt` → `sitemap.xml` discovery chain, max 5000 URL/audit. Fan-out BullMQ + fan-in Redis counter; gateway nhận summary (avg, median, top-10 worst pages).
8. **Scheduled audits (F2)** — lịch cron định kỳ (BullMQ Job Scheduler). Phát hiện regression: score tụt ≥10 điểm → ghi `AuditAlert` (score_drop); score=0 → `site_down`.
9. **Broken-link audit (F4)** — opt-in `includeLinkChecks=true`: HEAD-first với GET fallback, redirect chain ≤5, concurrency 10/2 (global/per-host). Internal broken = FAIL (crawl budget), external = WARN (UX).

**Pain point giải quyết:** công cụ SEO thương mại (Ahrefs, SEMrush, Moz) có giá $99–$499/tháng, công cụ miễn phí thì rời rạc hoặc chỉ đo 1 khía cạnh. Nền tảng này gộp đủ trong 1 UI, chi phí vận hành <$40/tháng.

---

## 2. Kiến trúc 5 microservice

```
                     ┌──────────────────────────────┐
                     │        Client (Next.js)      │
                     │   REST / Socket.IO / Share   │
                     └──────────────┬───────────────┘
                                    │ HTTPS
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    gateway  (NestJS, port 3000)                  │
│  ── REST /api/v1/** (auth, audits, users, admin, shared)         │
│  ── WebSocket /ws (realtime progress)                            │
│  ── BullMQ producer + gRPC client tới 3 service khác             │
└────┬───────────────┬──────────────┬──────────────┬───────────────┘
     │ BullMQ        │ gRPC         │ gRPC         │ gRPC + HTTP
     │ (queue)       │ :50052       │ :50053       │ :50055
     ▼               ▼              ▼              ▼
┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌────────────┐
│ crawler  │  │ seo-analyzer│  │ keyword- │  │  report    │
│ :50052   │  │  :50053     │  │ analyzer │  │  :50055    │
│          │  │             │  │  :50054  │  │  :3004     │
│ Cheerio  │  │ 21 rules    │  │ Tokenize │  │ Aggregate  │
│ Playwright│  │ Scoring    │  │ VI/EN    │  │ PDF        │
│ Lighthouse│  │             │  │ Density  │  │ Share link │
└──────────┘  └─────────────┘  └──────────┘  └────────────┘
     │              │                │              │
     │    BullMQ queues (Redis) + Pub/sub channels │
     └──────────────┴────────────────┴──────────────┘
                           Redis 7
     ┌──────────────┬────────────────────────────┬──┐
     ▼              ▼                            ▼
┌─────────┐  ┌─────────────┐  ┌──────────┐
│ seo_    │  │ seo_analyzer│  │ seo_     │
│ gateway │  │  (Postgres) │  │ report   │
│(Postgres)│ │             │  │(Postgres)│
└─────────┘  └─────────────┘  └──────────┘
```

### Vai trò ngắn gọn

| Service | Port | Vai trò | Có DB? |
|---|---|---|---|
| [gateway](01-gateway.md) | 3000 (HTTP) | Lễ tân — auth, nhận order, điều phối, push progress, **scheduled audits + regression detector (F2)** | ✅ `seo_gateway` |
| [crawler](02-crawler.md) | 50052 (gRPC) | Đi chợ — tải HTML + Lighthouse, fan-out analyze+keyword, **site-wide crawl (F1) + broken-link checker (F4)** | ❌ (stateless, cache Redis) |
| [seo-analyzer](03-seo-analyzer.md) | 50053 (gRPC) | Đầu bếp — chạy **22 rule**, chấm điểm | ✅ `seo_analyzer` |
| [keyword-analyzer](04-keyword-analyzer.md) | 50054 (gRPC) | Phụ bếp — tokenize + density + verdict | ❌ (stateless) |
| [report](05-report.md) | 3004 (HTTP) + 50055 (gRPC) | Đóng gói — aggregate 2 kết quả + PDF + share link | ✅ `seo_report` |

---

## 3. Ngăn xếp công nghệ

### Backend

| Lớp | Công nghệ | Phiên bản | Tại sao chọn |
|---|---|---|---|
| Ngôn ngữ | TypeScript | 5.9 | Type-safe xuyên 5 service giảm bug boundary |
| Framework | NestJS | 10.4 | Pattern module/DI rõ ràng, dễ test và mở rộng |
| Monorepo | Turborepo + npm workspaces | 2.x | Cache build, chạy task song song |
| ORM | Prisma | 5.22 | Migration + type gen + connection pool |
| Database | PostgreSQL | 16 | Strong types, JSONB cho snapshot, RLS tiềm năng |
| Cache & Queue | Redis | 7 | BullMQ + pub/sub + rate-limiter cùng 1 dependency |
| Job queue | BullMQ | 5.25 | Retry + dedup + backoff native |
| Inter-service sync | gRPC (@grpc/grpc-js) | 1.12 | Nhanh hơn REST ~3x, contract chặt |
| Inter-service event | Redis pub/sub | — | Realtime progress không polling |
| Web crawler | Cheerio + Playwright | 1.0 + 1.48 | 2-tier: nhanh mặc định, fallback khi cần SPA |
| Performance | Google Lighthouse | 12.2 | Chuẩn CWV, mobile + desktop |
| Auth | JWT (Passport) + bcrypt | 9 + 5 | Access 15m + refresh 7d rotation, bcrypt cost 12 |
| WebSocket | Socket.IO | 4.8 | Room-based, fallback polling, ổn định |
| PDF | Playwright (Chromium) + Handlebars | — | HTML→PDF đẹp, font Việt qua hệ thống |
| Validation | class-validator + class-transformer | 0.14 | Decorator-based DTO validation |
| Testing | Vitest + supertest | 2.x | Nhanh hơn Jest, ESM native |

### Frontend (chưa tồn tại — sẽ dev)

| Lớp | Công nghệ dự kiến | Lý do |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + streaming + RSC hỗn hợp CSR |
| UI library | shadcn/ui + Radix primitives | Accessible + customize trực tiếp |
| Styling | Tailwind CSS v4 | Utility-first, JIT, dark mode |
| Data fetching | TanStack Query v5 | Cache + mutation + optimistic + refetch |
| Realtime | Socket.IO client | Khớp với server-side |
| Form | react-hook-form + zod | Type-safe, validation client/server share schema |
| State global | Zustand (nếu cần) | Nhẹ hơn Redux, đủ cho auth/user context |
| i18n | next-intl | Hỗ trợ Việt hoá |

> Chi tiết xem [30-frontend-architecture.md](30-frontend-architecture.md).

---

## 4. Data flow: 1 audit end-to-end

Ví dụ người dùng audit `https://example.com` với `targetKeyword = "seo"`.

```
t=0s   User --POST /api/v1/audits-->  gateway
       gateway.AuditsController.create()
         ├─ URL safety check (block SSRF)
         ├─ Rate limit check (5/h/user)
         ├─ Prisma: INSERT Audit row (status=PENDING)
         ├─ BullMQ: enqueue crawl.start{auditId, url, options}
         └─ Response 201 { auditId, status: 'pending' }

t=0s   Frontend connect WebSocket /ws, emit 'audit:subscribe'{auditId}
       → join room `audit:{auditId}`

t=1-5s crawler.CrawlerWorker consume crawl.start
         ├─ UrlValidator.validate(url) (scheme + IP range + DNS rebind)
         ├─ CacheService.getCrawl(url) — miss
         ├─ CheerioFetcher.fetch() ~500ms
         ├─ detectSpa() — nếu phát hiện #root/#app/#__next + body rỗng
         │    └─ fallback PlaywrightFetcher.fetch() ~3-5s
         ├─ LighthouseRunner.runBoth() — mobile + desktop, ~5-20s
         │    Cache lighthouse:{formFactor}:{urlHash} TTL 1h
         ├─ PageDataExtractor.extract() → PageData
         ├─ CacheService.setCrawl() TTL 30m
         ├─ Redis PUBLISH crawl.done { auditId, pageData, cwv, cwvDesktop }
         ├─ Redis PUBLISH audit.progress { progress: 40, stage: 'crawling' }
         └─ Enqueue SONG SONG:
             ├─ BullMQ analyze.start { auditId, pageData, targetKeyword }
             └─ BullMQ keyword.start { auditId, textContent, title, ... }

t=5-7s SONG SONG 2 worker chạy:

  seo-analyzer.AnalyzerWorker:
    ├─ DB: SeoRule.findMany({ isEnabled: true }) — load 21 rule
    ├─ RuleRunner.run() — chạy 21 impl.check(pageData)
    ├─ ScoreCalculator.overall() — weighted average
    ├─ Prisma: RuleResult.createMany() — 21 row
    ├─ Redis SET auditAnalyzeResult:{id} TTL 1h
    └─ Redis PUBLISH analyze.done { auditId, score, stage: 'analyze' }

  keyword-analyzer.KeywordWorker:
    ├─ detectLanguage(textContent) → 'vi' or 'en'
    ├─ tokenize() → filter stopwords + len≥2
    ├─ termFrequency() + topN(20)
    ├─ density() + placement(title, h1, meta, para1)
    ├─ IF targetKeyword: getVerdict() → low/optimal/high/stuffing
    ├─ Redis SET auditKeywordResult:{id} TTL 1h
    └─ Redis PUBLISH keyword.done { auditId, status: 'success' }

t=7s   report service:
       AnalyzeDoneListener + KeywordDoneListener cùng gọi
         WaitForBothService.maybeTrigger(auditId)
         → INCR audit:{id}:completed_steps
         → Khi counter == 2:
             BullMQ enqueue report.start { auditId }

t=7-8s report.ReportWorker:
         ├─ Đọc analyze + keyword + cwv từ Redis cache
         ├─ Aggregator.aggregate():
         │    finalScore = 0.7 * analyzerOverall + 0.3 * cwvPerf
         │    criticalIssues = rules với (status=FAIL AND weight≥7)
         │    classification = classify(finalScore)
         ├─ Prisma TRANSACTION:
         │    INSERT Report + ReportKeyword[] + ReportCwv
         ├─ Redis PUBLISH report.done { auditId, reportId, finalScore }
         └─ Redis PUBLISH audit.completed { auditId, finalScore }

t=8s   gateway.ProgressSubscriberService nhận audit.completed
         ├─ Prisma: UPDATE Audit SET status=COMPLETED, seoScore=..., completedAt=NOW
         └─ Socket.IO emit 'audit:completed' tới room audit:{auditId}

       Frontend nhận event → refetch /api/v1/audits/:id → hiển thị full report

t=~    User click "Download PDF"
       GET /api/v1/audits/:id/export
       → 302 redirect http://report:3004/audits/:id/export
       → report.ReportHttpController:
           ├─ Render Handlebars template với data
           ├─ Playwright (pool size 2) page.setContent + page.pdf()
           └─ Stream PDF bytes
```

**Tổng thời gian happy path:** ~8 giây cho trang tĩnh, 20–30 giây cho SPA phức tạp.

> Chi tiết queue + choreography xem [22-job-pipeline.md](22-job-pipeline.md).

---

## 5. Mô hình dữ liệu tổng quan

3 database độc lập theo biên giới service (service boundary = DB boundary):

| DB | Chủ | Bảng chính | Mục đích |
|---|---|---|---|
| `seo_gateway` | gateway | `User`, `Audit`, `RefreshToken`, `PageAudit`, **`ScheduledAudit`**, **`AuditAlert`** | Tài khoản, session, request audit, page-level results cho site audit, lịch cron + alert regression |
| `seo_analyzer` | seo-analyzer | `SeoRule`, `RuleResult` | **22 rule** (admin tinh chỉnh weight), kết quả từng rule cho mỗi audit |
| `seo_report` | report | `Report`, `ReportKeyword`, `ReportCwv`, `ShareLink` | Snapshot cuối + top keyword + CWV + share token |

> Chi tiết ERD + từng bảng xem [20-data-model.md](20-data-model.md).

**Không service nào truy vấn DB của service khác.** Muốn lấy rule từ analyzer, gateway **gọi gRPC**; muốn tạo share link, gateway **gọi gRPC report**.

---

## 6. Bảo mật tổng quan

| Hạng mục | Giải pháp |
|---|---|
| Password | bcrypt cost 12 (~250 ms/hash) chống brute-force |
| Access token | JWT HS256, 15 phút TTL |
| Refresh token | 48 byte random, SHA-256 hash trong DB, 7 ngày, rotation mỗi lần dùng |
| OAuth | Google OAuth 2.0 (tuỳ chọn, chỉ bật khi có `GOOGLE_CLIENT_ID`) |
| SSRF | `UrlValidator` chặn `127.0.0.1`, private IPv4 (10/8, 172.16/12, 192.168/16), IPv6 link-local, DNS rebinding |
| Rate limit | Sliding window qua Redis ZSET — register 1/h/IP, login 5/15m/email, audit 5/h/user |
| Ownership | Mọi query audit check `audit.userId === currentUser.id` (admin bypass) |
| Share link | 256-bit token (64-char hex), revocable soft-delete, track access count |
| Security headers | Helmet (CSP tắt vì phục vụ Swagger), CORS whitelist `FRONTEND_URL` |

---

## 7. Triển khai

### Môi trường dev (local)

```bash
# Yêu cầu: Node.js ≥ 18, Docker, npm 11+
npm install                           # cài deps toàn monorepo
cp .env.docker.example .env.docker    # copy env
npm run docker:up                     # bật full stack (~60s, lần đầu ~5 phút)
```

**Endpoints:**
- Gateway REST: `http://localhost:3000/api/v1`
- Gateway Swagger: `http://localhost:3000/api/docs`
- Report PDF: `http://localhost:3004`
- Postgres: 5432 (gateway), 5433 (analyzer), 5434 (report)
- Redis: 6379

### Môi trường prod (dự kiến)

| Thành phần | Nền tảng | Chi phí ước tính |
|---|---|---|
| Frontend (Next.js) | Vercel | Free tier / $20 Pro |
| Gateway + Report (HTTP) | Railway / Render | $5–15 |
| Crawler / Analyzer / Keyword (gRPC backend) | Railway / Fly.io | $10–20 |
| Postgres × 3 | Supabase free tier | $0 |
| Redis | Upstash | $0 (10k cmd/day) |
| Domain + CDN | Cloudflare | $0 |
| **Tổng** | | **<$40/tháng** |

> Chi tiết docker-compose + env vars xem [10-shared-packages.md](10-shared-packages.md) §6.

---

## 8. Từ điển thuật ngữ

| Viết tắt | Nghĩa | Ngữ cảnh trong project |
|---|---|---|
| SEO | Search Engine Optimization | Mục tiêu tối ưu website cho Google |
| CWV | Core Web Vitals | 3 metric Google dùng: LCP, INP, CLS |
| LCP | Largest Contentful Paint | Thời gian load ảnh/text lớn nhất (ms) |
| INP | Interaction to Next Paint | Độ trễ phản hồi khi user tương tác (ms) |
| CLS | Cumulative Layout Shift | Mức nhảy layout (không đơn vị, càng nhỏ càng tốt) |
| SPA | Single Page Application | Web render bằng JS (React/Vue), cần Playwright |
| SSRF | Server-Side Request Forgery | Lỗ hổng dụ server request vào internal IP |
| DDD | Domain-Driven Design | Cấu trúc thư mục `controllers/services/domain/persistence` |
| DTO | Data Transfer Object | Class validate input/output giữa layer |
| JSON-LD | JSON Linked Data | Schema.org structured data nhúng trong HTML |
| TTL | Time To Live | Thời gian sống của cache entry (giây) |
| Fan-out | Phân tán 1 → N | Crawler phát 1 job crawl → enqueue N job analyze+keyword |
| Fan-in | Gộp N → 1 | Report đợi cả analyze.done + keyword.done rồi mới chạy |
| Choreography | Dàn nhạc không nhạc trưởng | Các service tự lắng event, không ai điều phối tập trung |

---

## 9. Tier 1 Upgrade (04/2026) — Tóm tắt

Tier 1 biến platform từ **"1 URL audit on-demand"** → **platform site-wide + scheduled + đa dạng rule**:

| F# | Feature | User-facing capability |
|---|---|---|
| F1 | Site-wide crawl | `POST /audits { mode: "site", maxUrls }` — audit toàn domain, discovery qua robots.txt/sitemap.xml |
| F2 | Scheduled audits | `POST /scheduled-audits { url, cron }` — lịch định kỳ + alert khi score tụt ≥10 điểm |
| F3 | Readability rule | Thêm điểm Flesch-Kincaid vào mỗi audit (skip cho tiếng Việt) |
| F4 | Broken-link audit | `POST /audits { includeLinkChecks: true }` — check HTTP status từng link |
| F5 | Dual Lighthouse | Mỗi audit trả cả mobile + desktop score (song song) |

Xem chi tiết:
- Brainstorm + nguồn uy tín: [docs/TIER1-BRAINSTORM.md](../TIER1-BRAINSTORM.md)
- Architecture lock-in: [docs/TIER1-ARCHITECTURE.md](../TIER1-ARCHITECTURE.md)

---

## 10. Đi tiếp

- Muốn hiểu **từng service chi tiết** → [01](01-gateway.md) → [05](05-report.md)
- Muốn **tra API** → [21-api-contracts.md](21-api-contracts.md)
- Muốn **dev giao diện** → [30-frontend-architecture.md](30-frontend-architecture.md) trở đi
- Muốn **thiết kế thêm rule / queue** → [22-job-pipeline.md](22-job-pipeline.md) + [03-seo-analyzer.md](03-seo-analyzer.md)
