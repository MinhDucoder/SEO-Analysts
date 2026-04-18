# 20 — Data Model

> **Mục tiêu:** Mô tả đầy đủ 3 Postgres database + Redis keys, giúp người đọc đào một bảng cụ thể mà không cần mở từng service doc.

---

## 1. Bức tranh ERD

```
╔════════════════ seo_gateway (apps/gateway/prisma) ═══════════════════╗
║                                                                       ║
║   ┌──────────┐ 1──N ┌───────────────┐                                ║
║   │  User    │──────│ RefreshToken  │                                ║
║   └────┬─────┘      └───────────────┘                                ║
║        │ 1──N 1──N                                                    ║
║        │      └──────────────────────┐                                ║
║        ▼                              ▼                               ║
║   ┌──────────┐ 1──N ┌───────────────┐  ┌─────────────────┐           ║
║   │  Audit   │──────│   PageAudit   │  │ ScheduledAudit  │ (F2)      ║
║   └────┬─────┘      └───────────────┘  └────────┬────────┘           ║
║        │ 1──N                                    │ 1──N               ║
║        │      ┌───────────────┐                  │                    ║
║        └─────▶│  AuditAlert   │◀────────────────┘                    ║
║               └───────────────┘ (F2 regression alerts)                ║
║        │ auditId (UUID, no FK cross-DB)                               ║
╚════════│══════════════════════════════════════════════════════════════╝
         │
         ├──────────────────────┐
         │                      │
╔════════│══════════════════════│══════════════════╗  ╔══════ seo_report ═══════╗
║ seo_analyzer                  │                   ║  ║                          ║
║                               │                   ║  ║   ┌──────────┐           ║
║   ┌──────────┐ 1──N  ┌────────▼────────┐          ║  ║   │  Report  │           ║
║   │ SeoRule  │───────│   RuleResult    │          ║  ║   └─┬────┬───┘           ║
║   └──────────┘       │ (21 rows/audit) │          ║  ║     │    │ 1──N          ║
║                      └─────────────────┘          ║  ║     │    ▼               ║
╚════════════════════════════════════════════════════╝  ║     │  ReportKeyword     ║
                                                        ║     │ 1──1               ║
                                                        ║     ▼                    ║
                                                        ║   ReportCwv              ║
                                                        ║                          ║
                                                        ║   Report ┬──1─── ShareLink║
                                                        ║          │                ║
                                                        ╚══════════╧════════════════╝
```

**Service boundary = DB boundary.** Không có cross-DB foreign key. Ràng buộc referential enforced ở tầng app.

---

## 2. Database 1: `seo_gateway`

File: [apps/gateway/prisma/schema.prisma](../../apps/gateway/prisma/schema.prisma).

### 2.1 Enum

```prisma
enum UserRole     { user, admin }
enum AuditStatus  { pending, crawling, analyzing, reporting, completed, failed }
enum AuditMode    { single, site }
enum AlertType    { score_drop, new_issues, site_down }   // F2
```

### 2.2 Bảng `User`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | — | `gen_random_uuid()` | PK |
| `email` | VarChar(255) | — | — | **Unique** |
| `passwordHash` | VarChar(255) | ✅ | — | Null cho OAuth-only |
| `fullName` | VarChar(100) | — | — | |
| `role` | UserRole | — | `user` | |
| `isVerified` | Boolean | — | false | Required trước khi login |
| `isLocked` | Boolean | — | false | Admin có thể khoá |
| `oauthProvider` | VarChar(50) | ✅ | — | `"google"` hoặc null |
| `avatarUrl` | VarChar(500) | ✅ | — | |
| `createdAt` | Timestamptz | — | `now()` | Immutable |
| `updatedAt` | Timestamptz | — | `@updatedAt` | Auto |

**Relations:** `1—N RefreshToken`, `1—N Audit` (cascade delete).

### 2.3 Bảng `RefreshToken`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | FK User.id CASCADE |
| `tokenHash` | VarChar(255) | **SHA-256** của raw token (không lưu raw) |
| `userAgent` | VarChar(500) nullable | Device fingerprint |
| `ipAddress` | VarChar(45) nullable | IPv4 hoặc IPv6 |
| `expiresAt` | Timestamptz | Default 7 ngày |
| `isRevoked` | Boolean | default false, set true khi logout/rotation |
| `createdAt` | Timestamptz | |

**Indexes:**
- `idx_rt_user(userId)` — list session của user.
- `idx_rt_token(tokenHash)` — lookup nhanh khi refresh.
- `idx_rt_expires(expiresAt)` — cron cleanup expired tokens.

**Rotation flow:**
1. Client gửi refresh cookie.
2. Gateway SHA-256 raw → lookup `tokenHash`.
3. Check `!isRevoked && expiresAt > now`.
4. Set `isRevoked = true` (row cũ).
5. INSERT row mới với token mới.

→ Một token chỉ dùng 1 lần. Nếu attacker steal token và user vẫn dùng → phát hiện double-use (2 refresh với cùng tokenHash → 1 cái đã revoked → 401) → force logout all sessions.

### 2.4 Bảng `Audit`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | FK User.id CASCADE |
| `url` | Text | Full URL (có thể dài) |
| `domain` | VarChar(255) | Extract từ url, index để filter |
| `status` | AuditStatus | Default `pending` |
| `mode` | AuditMode | Default `single` |
| `seoScore` | Decimal(5,2) | Nullable (null khi chưa xong) |
| `targetKeyword` | VarChar(255) nullable | User nhập |
| `errorMessage` | Text nullable | Nếu status=failed |
| `crawlerType` | VarChar(20) nullable | "cheerio"\|"playwright" |
| `crawlDurationMs` | Int nullable | Metric |
| `discoveredUrlsCount` | Int nullable | Site mode only |
| `auditedUrlsCount` | Int nullable | Site mode only |
| `completedAt` | Timestamptz nullable | |
| `createdAt` | Timestamptz | |
| `updatedAt` | Timestamptz | |

**Indexes:**
- `idx_audits_user_created(userId DESC, createdAt DESC)` — list trang user dashboard.
- `idx_audits_domain(domain)` — filter "audit cùng domain".
- `idx_audits_status(status)` — admin stat query.

**Relations:** `N—1 User`, `1—N PageAudit`.

### 2.5 Bảng `PageAudit`

Chỉ có row khi `Audit.mode = site`. Mỗi URL trong site audit → 1 row.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `auditId` | UUID | FK Audit.id CASCADE |
| `url` | Text | |
| `score` | Int | 0-100 |
| `issues` | JsonB | Array `[{ruleId, category, severity}]` |
| `fetchedAt` | Timestamptz | |

**Indexes:**
- `idx_page_audits_audit(auditId)` — load all page của 1 site audit.
- `idx_page_audits_score(score)` — filter "worst 10 pages".

**Tại sao `issues` là JsonB chứ không normalize?**
- Site audit có thể 500 URL × 22 rule = 11k row → cost write cao.
- Query thường là "list URL + top 3 issue" → JsonB đủ nhanh.
- Trade-off: không query "URL nào bị rule X" cross site.

### 2.6 Bảng `ScheduledAudit` (F2)

Cấu hình cron định kỳ do user sở hữu. BullMQ Job Scheduler là **source of truth** cho next-fire time; bảng này giữ state persistent (lastScore, lastRunAt, isActive) để boot reconciler re-register khi Redis restart.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | FK User.id CASCADE |
| `url` | Text | |
| `cron` | VarChar(255) | 5-field expression "minute hour dom month dow" |
| `mode` | AuditMode | default `single`; `site` cho site-wide audit |
| `maxUrls` | Int? | Chỉ site-mode; cap tại 5000 |
| `targetKeyword` | VarChar(255)? | |
| `lastRunAt` | Timestamptz? | Set bởi TickWorker khi cron fire |
| `lastScore` | Int? | Set bởi RegressionDetector khi audit complete |
| `isActive` | Boolean | default true; pause = false → gỡ scheduler |
| `createdAt` | Timestamptz | |
| `updatedAt` | Timestamptz | |

**Indexes:**
- `idx_scheduled_audits_user(userId)` — list lịch của user.
- `idx_scheduled_audits_active(isActive)` — boot reconciler scan.

**Relations:** `N—1 User`, `1—N AuditAlert`.

### 2.7 Bảng `AuditAlert` (F2)

Do `RegressionDetectorService` ghi khi phát hiện score tụt hoặc site down.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `auditId` | UUID | FK Audit.id CASCADE |
| `scheduleId` | UUID? | FK ScheduledAudit.id SET NULL (one-off audits có thể emit null) |
| `type` | AlertType | score_drop \| new_issues \| site_down |
| `deltaScore` | Int? | Giá trị tụt (score_drop) |
| `message` | Text | Tiếng Anh (hoặc VI tuỳ template) |
| `sentAt` | Timestamptz? | Timestamp alert đã gửi (email/webhook); null = chưa gửi |
| `createdAt` | Timestamptz | |

**Indexes:**
- `idx_audit_alerts_audit(auditId)` — view alert của 1 audit.
- `idx_audit_alerts_schedule(scheduleId)` — view alert history của 1 lịch.
- `idx_audit_alerts_created(createdAt)` — admin dashboard timeline.

**Migration nguồn:** [apps/gateway/prisma/migrations/20260418140000_add_scheduled_audits/migration.sql](../../apps/gateway/prisma/migrations/20260418140000_add_scheduled_audits/migration.sql) — additive, zero-downtime.

---

## 3. Database 2: `seo_analyzer`

File: [apps/seo-analyzer/prisma/schema.prisma](../../apps/seo-analyzer/prisma/schema.prisma).

### 3.1 Enum

```prisma
enum RuleCategory { meta, headings, images, links, performance, technical, content }
enum CheckStatus  { pass, warn, fail }
```

### 3.2 Bảng `SeoRule`

22 row — seeded từ [prisma/seed.ts](../../apps/seo-analyzer/prisma/seed.ts).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VarChar(100) **unique** | `"title_tag"`, `"meta_description"`, ... — match ISeoRule.id |
| `displayName` | VarChar(100) | Label UI tiếng Việt |
| `description` | Text | Giải thích dài |
| `category` | RuleCategory | |
| `weight` | Int | 1-10, admin tinh chỉnh |
| `isEnabled` | Boolean default true | Admin tắt |
| `checkConfig` | JsonB nullable | **Reserved** (chưa dùng) |
| `createdAt` | Timestamptz | |
| `updatedAt` | Timestamptz | |

**Index:** `idx_rules_category(category)` — admin filter UI.

**Không có relation** — chỉ reference bằng `ruleId` trong `RuleResult` (không FK).

### 3.3 Bảng `RuleResult`

1 audit = 22 row (nếu all rule enabled).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `auditId` | UUID | No FK (cross-DB) |
| `ruleId` | VarChar(100) | Match `SeoRule.name` |
| `ruleName` | VarChar(100) | Snapshot `displayName` |
| `category` | RuleCategory | Snapshot |
| `status` | CheckStatus | pass/warn/fail |
| `score` | Decimal(5,2) | 0/50/100 |
| `weight` | Int | Snapshot weight **tại thời điểm chạy** |
| `message` | Text | Tiếng Việt |
| `suggestion` | Text nullable | Gợi ý sửa |
| `metadata` | JsonB nullable | Context đặc thù (vd list image thiếu alt) |
| `createdAt` | Timestamptz | |

**Indexes:**
- `idx_rr_audit(auditId)` — load tất cả rule result.
- `idx_rr_audit_status(auditId, status)` — count pass/warn/fail.

**Tại sao snapshot `ruleName, weight, category`?**
- Admin có thể đổi `weight` hoặc rename rule → audit cũ không bị affect.
- Hiển thị báo cáo cũ vẫn đúng context historical.

---

## 4. Database 3: `seo_report`

File: [apps/report/prisma/schema.prisma](../../apps/report/prisma/schema.prisma).

### 4.1 Bảng `Report`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `auditId` | UUID **unique** | 1–1 với Audit |
| `url` | Text | Denorm (tránh gọi gateway để hiển thị) |
| `domain` | VarChar(255) | Denorm |
| `finalScore` | Decimal(5,2) | Blended 70/30 |
| `classification` | VarChar(20) | excellent/good/fair/poor |
| `totalIssues` | Int | |
| `criticalIssues` | Int | FAIL + weight≥7 |
| `warnIssues` | Int | |
| `passCount` | Int | |
| `analysisSnapshot` | JsonB | Full AnalyzeResponse (compare) |
| `cwvSnapshot` | JsonB | Full Lighthouse result |
| `createdAt` | Timestamptz | |

**Index:** `idx_reports_domain(domain)` — list history cùng domain.

**Relations:** `1—N ReportKeyword`, `1—1 ReportCwv`, `1—1 ShareLink` (optional).

### 4.2 Bảng `ReportKeyword`

Top 20 + target keyword = max 21 row per report.

| Column | Type |
|---|---|
| `id` | UUID |
| `reportId` | UUID FK CASCADE |
| `keyword` | VarChar(255) |
| `frequency` | Int |
| `densityPercent` | Decimal(5,2) |
| `inTitle` | Boolean |
| `inH1` | Boolean |
| `inFirstParagraph` | Boolean |
| `inMetaDescription` | Boolean |
| `rank` | Int (1–20) |
| `isTarget` | Boolean default false |

Index: `idx_rk_report(reportId)`.

### 4.3 Bảng `ReportCwv`

1–1 với Report.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `reportId` | UUID **unique** FK CASCADE | |
| **Mobile** | | |
| `lcpMs` | Int | Largest Contentful Paint |
| `inpMs` | Int | Interaction to Next Paint |
| `cls` | Decimal(5,3) | Cumulative Layout Shift (thường 0.00–0.30) |
| `performanceScore` | Int | 0-100 |
| `accessibilityScore` | Int | |
| `bestPracticesScore` | Int | |
| `lighthouseSeoScore` | Int | |
| **Desktop (nullable)** | | |
| `desktopLcpMs` | Int? | |
| `desktopInpMs` | Int? | |
| `desktopCls` | Decimal(5,3)? | |
| `desktopPerformanceScore` | Int? | |
| `desktopAccessibilityScore` | Int? | |
| `desktopBestPracticesScore` | Int? | |
| `desktopLighthouseSeoScore` | Int? | |

**Desktop nullable:** backward compatible với audit cũ chỉ có mobile.

### 4.4 Bảng `ShareLink`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `reportId` | UUID **unique** FK CASCADE | 1 report = 1 link active |
| `auditId` | UUID | Denorm cho lookup |
| `token` | VarChar(64) **unique** | Hex 256-bit |
| `isActive` | Boolean default true | Soft delete |
| `accessedCount` | Int default 0 | Analytics |
| `lastAccessedAt` | Timestamptz? | |
| `createdAt` | Timestamptz | |

**Index:** `idx_sl_audit(auditId)` — revoke lookup.

---

## 5. Redis — data structures

Redis dùng với 5 mục đích khác nhau:

### 5.1 BullMQ queues

| Queue | Producer | Consumer |
|---|---|---|
| `crawl.start` | gateway, scheduled-tick-worker | crawler |
| `site-crawl.start` | gateway, scheduled-tick-worker | crawler |
| `site-crawl.url-audit` | crawler | crawler (self fan-out) |
| `site-crawl.aggregate` | crawler | crawler |
| `analyze.start` | crawler | seo-analyzer |
| `keyword.start` | crawler | keyword-analyzer |
| `report.start` | report (WaitForBoth) | report |
| `scheduled-audit.tick` (F2) | BullMQ Job Scheduler (cron) | gateway `ScheduledAuditTickWorker` |
| `alert.send` (F2, reserved) | gateway `RegressionDetectorService` | (alerter worker — chưa implement) |

Mỗi queue có các internal Redis keys BullMQ auto-manage: `bull:{queue}:id`, `bull:{queue}:waiting`, `bull:{queue}:active`, `bull:{queue}:completed`, `bull:{queue}:failed`.

### 5.2 Pub/sub channels

| Channel | Publisher | Subscriber |
|---|---|---|
| `audit.progress` | crawler + report | gateway |
| `audit.completed` | report | gateway |
| `audit.failed` | crawler + report | gateway |
| `crawl.done` | crawler | report (cache CWV) |
| `crawl.failed` | crawler | — (log) |
| `page-audit.done` | crawler (site audit) | gateway (persist PageAudit) |
| `site-crawl.done` | crawler | gateway (update totals) |
| `analyze.done` | seo-analyzer | report (WaitForBoth) |
| `keyword.done` | keyword-analyzer | report (WaitForBoth) |
| `report.done` | report | gateway (idempotent fallback) |

### 5.3 Cache

| Key pattern | TTL | Producer | Consumer |
|---|---|---|---|
| `crawl:{sha256(url)}` | 1800s | crawler | crawler (tránh crawl lại) |
| `lighthouse:{mobile\|desktop}:{urlHash}` | 3600s | crawler | crawler |
| `audit:{id}:analyze_result` | 3600s | seo-analyzer | report |
| `audit:{id}:keyword_result` | 3600s | keyword-analyzer | report |
| `audit:{id}:crawl_result` | 3600s | report listener | report worker |
| `audit:{id}:progress` | 3600s | gateway | gateway (status endpoint) |
| `audit:{id}:stage` | 3600s | gateway | gateway |

### 5.4 Counters / state

| Key | Type | Purpose |
|---|---|---|
| `audit:{id}:completed_steps` | INCR counter | WaitForBothService 2-step fan-in |
| `site-crawl:{id}:expected` | SETEX value | Total URL để audit (site mode) |
| `site-crawl:{id}:done` | INCR counter | URL đã xong |
| `site-crawl:{id}:results` | RPUSH list | JSON PageAuditResult (aggregate worker đọc) |
| `audit:{id}:site-summary` | SETEX JSON (1h) | F1 summary (avgScore, worstPages[], ...) cho detail endpoint |
| `audit:{id}:schedule` | SETEX string (24h) | F2 map audit→scheduleId cho RegressionDetector |
| `bull:scheduled-audit.tick:sched:{userId}:{scheduleId}` | BullMQ scheduler | F2 job scheduler state (next-fire time) |

### 5.5 Rate limiter + verification

| Key | Type | Purpose |
|---|---|---|
| `rate_limit:register:{ip}` | ZSET sliding window | Register limit |
| `rate_limit:login:{email}` | ZSET | Login limit |
| `rate_limit:audits:{userId}` | ZSET | Audit creation limit |
| `verification:{token}` | SETEX | Email verify token (1h) |
| `password_reset:{token}` | SETEX | Password reset token (1h) |

---

## 6. Nguyên tắc thiết kế DB

### 6.1 Service boundary = DB boundary

Không service nào connect DB của service khác. Lý do:
- **Deployable independence** — đổi schema `SeoRule` không cần coordinate với team gateway.
- **Scaling** — DB analyzer có thể scale khác gateway (vd read replica).
- **Migration safety** — Prisma migration của service nào service đó chạy qua [docker-entrypoint.sh](../../apps/gateway/docker-entrypoint.sh).

### 6.2 Cross-service referential integrity

`auditId` xuất hiện trong `RuleResult`, `Report` nhưng không có FK. Enforce ở app layer:
- Khi crawler nhận `crawl.start{auditId}`, giả định auditId hợp lệ (vì do gateway tạo).
- Nếu gateway xoá Audit, các row analyzer/report trở thành orphan. Scheduled cleanup job định kỳ có thể dọn (chưa implement).

### 6.3 Snapshot thay vì normalize

Nhiều trường snapshot dữ liệu tại thời điểm ghi:
- `RuleResult.weight, ruleName, category` — tránh ảnh hưởng khi admin đổi `SeoRule`.
- `Report.analysisSnapshot (JsonB)` — tránh phải join lại RuleResult khi so sánh 2 audit.
- `Report.url, domain` — denorm để list view không cross-service call.

Chi phí: disk nhiều hơn, data stale khi rename. Lợi ích: historical accuracy + query performance.

### 6.4 Type chặt chẽ

- `Decimal(5,2)` cho score thay vì Float → không có floating-point rounding surprise.
- `Timestamptz` thay vì `Timestamp` → timezone-aware.
- `JsonB` thay vì `Json` → lookup trong JSON hiệu quả hơn, dù ghi chậm hơn một chút.
- Enum native Postgres thay vì VarChar → compile-time check (Prisma gen enum TS), ít storage.

### 6.5 Indexing

Quy tắc:
- Mỗi FK → index (Prisma tự tạo nếu relation).
- Mỗi field filter trong list endpoint (domain, status) → index.
- Composite index theo thứ tự truy vấn: `(userId, createdAt DESC)` cho `ORDER BY created_at DESC LIMIT 20`.

Không index các field chỉ dùng cho 1 query isolated — overhead ghi > lợi ích đọc.

---

## 7. Migration flow

Mỗi service có `prisma/migrations/` riêng. Docker entrypoint chạy `prisma migrate deploy` trước khi start server:

```bash
#!/bin/sh
# apps/gateway/docker-entrypoint.sh
npx prisma migrate deploy  # apply pending migrations
npm run start:prod         # start NestJS
```

**Chú ý:** `migrate deploy` (chứ không `migrate dev`) — không tạo migration mới, chỉ apply → production safe.

**Dev workflow:**
```bash
cd apps/gateway
npx prisma migrate dev --name add-field-xyz
# → tạo file migrations/<timestamp>_add_field_xyz/migration.sql
# → apply ngay lên dev DB
# → regenerate client
```

---

## 8. File tham chiếu

| File | Mục đích |
|---|---|
| [apps/gateway/prisma/schema.prisma](../../apps/gateway/prisma/schema.prisma) | Gateway DB schema |
| [apps/seo-analyzer/prisma/schema.prisma](../../apps/seo-analyzer/prisma/schema.prisma) | Analyzer DB schema |
| [apps/seo-analyzer/prisma/seed.ts](../../apps/seo-analyzer/prisma/seed.ts) | Seed 22 rule |
| [apps/report/prisma/schema.prisma](../../apps/report/prisma/schema.prisma) | Report DB schema |
| [apps/*/docker-entrypoint.sh](../../apps/gateway/docker-entrypoint.sh) | Migration chạy lúc container start |
| [packages/shared/src/index.ts](../../packages/shared/src/index.ts) | Enum + interface share TS giữa các service |
| [docs/diagrams/erd-diagram.puml](../../diagrams/erd-diagram.puml) | PlantUML ERD nguyên gốc |

---

## 9. Đi tiếp

- Xem các API gọi những bảng này → [21-api-contracts.md](21-api-contracts.md)
- Xem flow đọc/ghi DB → từng service doc (01–05)
- Xem Redis key usage → [22-job-pipeline.md](22-job-pipeline.md)
