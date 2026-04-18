# 21 — API Contracts

> **Mục tiêu:** Một chỗ duy nhất để tra mọi hợp đồng đối ngoại — REST (gateway), gRPC (5 service), WebSocket (gateway), Redis pub/sub.
>
> **Ai đọc:** dev frontend muốn tích hợp, dev backend muốn kiểm interface giữa service, tester muốn viết test case.

---

## 1. REST API — Gateway (`http://host:3000/api/v1`)

**Auth scheme:**
- `@Public()` → không cần token.
- `JWT` → cookie/header `Authorization: Bearer {accessJwt}`, access token TTL 15m.
- `Admin` → JWT + `user.role = admin`.

### 1.1 Auth endpoints

#### POST `/auth/register`
- **Public** — rate limit 1/h/IP.
- Body:
  ```json
  { "email": "a@b.com", "password": "Min8chars", "fullName": "Nguyễn Văn A" }
  ```
- 201:
  ```json
  { "user": { "id": "...", "email": "a@b.com", "fullName": "...", "isVerified": false }, "verifyToken": "abc...", "message": "Vui lòng verify email." }
  ```
- 400 — validation fail, 409 — email existed, 403 — rate limit.

#### POST `/auth/login`
- **Public** — rate limit 5/15m/email.
- Body:
  ```json
  { "email": "a@b.com", "password": "..." }
  ```
- 200:
  ```json
  { "user": {...}, "accessToken": "eyJ..." }
  ```
  + `Set-Cookie: refresh_token=<random>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=604800`
- 401 — wrong credentials, 403 — locked / not verified / rate limit.

#### POST `/auth/refresh`
- **Public** — yêu cầu cookie `refresh_token`.
- No body.
- 200:
  ```json
  { "accessToken": "eyJ..." }
  ```
  + mới `Set-Cookie: refresh_token=...`
- 401 — cookie missing/invalid/revoked/expired.

#### POST `/auth/logout`
- **JWT**.
- 204 No Content. Set-Cookie clear `refresh_token`.

#### GET `/auth/me`
- **JWT**.
- 200:
  ```json
  {
    "id": "uuid",
    "email": "a@b.com",
    "fullName": "...",
    "role": "user",
    "avatarUrl": null,
    "createdAt": "2026-01-01T..."
  }
  ```

#### POST `/auth/verify-email`
- **Public**. Body `{ token }`.
- 200 `{ message: "Verified" }`, 400 invalid.

#### POST `/auth/forgot-password`
- **Public**. Body `{ email }`.
- 200 `{ message }` — luôn trả 200 để không leak email tồn tại.

#### POST `/auth/reset-password`
- **Public**. Body `{ token, newPassword }`.
- 200 `{ message }`, 400 invalid.

#### GET `/auth/google`, GET `/auth/google/callback`
- Google OAuth 2.0 flow. Callback redirect `{FRONTEND_URL}/auth/oauth-success?token=<accessJwt>`.

---

### 1.2 Audits endpoints

#### POST `/audits`
- **JWT** — rate limit 5/h/user.
- Body:
  ```json
  {
    "url": "https://example.com",
    "mode": "single",              // "single" | "site" (F1)
    "targetKeyword": "seo vn",     // optional
    "maxUrls": 100,                 // F1 chỉ cho mode=site, max 5000
    "includeLinkChecks": false      // F4 opt-in: chạy HEAD/GET từng <a href>
  }
  ```
- 201:
  ```json
  { "auditId": "uuid", "status": "pending", "mode": "single", "message": "Audit queued" }
  ```
- 400 — URL invalid (SSRF block) / maxUrls vượt HARD_CAP / mode không hợp lệ, 403 — rate limit.

#### GET `/audits`
- **JWT**.
- Query: `page` (default 1), `limit` (default 20, max 50), `search`, `status`, `scoreMin`, `scoreMax`, `dateFrom`, `dateTo`.
- 200:
  ```json
  {
    "data": [
      { "id": "...", "url": "...", "domain": "example.com", "status": "completed", "seoScore": 87.50, "createdAt": "..." }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 45, "pages": 3 }
  }
  ```

#### GET `/audits/compare?audit1=<uuid>&audit2=<uuid>`
- **JWT** — ownership check cả 2 audit.
- 200:
  ```json
  {
    "scoreDelta": 12.5,
    "ruleDelta": [
      { "ruleId": "title_tag", "ruleName": "Title tag", "statusBefore": "fail", "statusAfter": "pass", "scoreDelta": 100 }
    ],
    "issuesFixed": 3,
    "issuesNew": 1
  }
  ```

#### GET `/audits/:id`
- **JWT** — ownership check (admin bypass).
- 200: Full audit detail với analysis + keywords + CWV (lấy từ Report service qua gRPC).

#### GET `/audits/:id/status`
- **JWT**.
- 200:
  ```json
  { "status": "analyzing", "progress": 66, "stage": "analyze" }
  ```

#### DELETE `/audits/:id`
- **JWT** — ownership check.
- 204.

#### GET `/audits/:id/export[?format=pdf]`
- **JWT** — ownership + `status=completed`.
- 302 Redirect tới `http://report:3004/audits/:id/export?format=pdf`.

#### POST `/audits/:id/share`
- **JWT** — ownership.
- 201:
  ```json
  { "shareToken": "abc...64chars", "shareUrl": "https://frontend/shared/<token>" }
  ```

#### DELETE `/audits/:id/share`
- **JWT**.
- 204.

---

### 1.3 Scheduled audits endpoints (F2)

F2 biến platform thành **monitoring liên tục**: user tạo lịch cron, hệ thống tự chạy audit và phát alert khi score tụt.

#### POST `/scheduled-audits`
- **JWT** — ownership scoped to authenticated user.
- Body:
  ```json
  {
    "url": "https://example.com",
    "cron": "0 9 * * MON",       // 5-field, "minute hour dom month dow"
    "mode": "single",              // "single" | "site"
    "maxUrls": 500,                 // chỉ mode=site
    "targetKeyword": "seo"         // optional
  }
  ```
- 201:
  ```json
  {
    "id": "uuid",
    "userId": "uuid",
    "url": "https://example.com/",
    "cron": "0 9 * * MON",
    "mode": "single",
    "maxUrls": null,
    "targetKeyword": null,
    "lastRunAt": null,
    "lastScore": null,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```
  Side-effect: upsert BullMQ Job Scheduler keyed `sched:<userId>:<scheduleId>`.
- 400 — cron sai format, maxUrls > 5000, url không hợp lệ.

#### GET `/scheduled-audits`
- **JWT** — list các lịch của user hiện tại, sort `createdAt` desc.
- 200: Array các object như response của POST.

#### GET `/scheduled-audits/:id`
- **JWT** — ownership check.
- 200: object lịch. 404 / 403.

#### PATCH `/scheduled-audits/:id/pause`
- **JWT**. No body.
- 200: object lịch với `isActive: false`. Side-effect: `removeJobScheduler(key)` — cron không fire nữa.

#### PATCH `/scheduled-audits/:id/resume`
- **JWT**. No body.
- 200: object lịch với `isActive: true`. Side-effect: `upsertJobScheduler(key)`.

#### DELETE `/scheduled-audits/:id`
- **JWT** — ownership check.
- 204. Cascade: DB row + Job Scheduler đều gỡ. AuditAlert rows của lịch này được `schedule_id` SET NULL (giữ history).

---

### 1.4 Users endpoints

#### PATCH `/users/profile`
- **JWT**. Body:
  ```json
  { "fullName": "New name", "avatarUrl": "https://..." }
  ```
- 200 — updated User.

#### PATCH `/users/password`
- **JWT**. Body:
  ```json
  { "currentPassword": "...", "newPassword": "..." }
  ```
- 200, 401 — current wrong.

---

### 1.5 Admin endpoints (role=admin)

#### GET `/admin/users?page=&limit=&search=`
- Admin. 200: paginated User list.

#### PATCH `/admin/users/:id`
- Admin. Body `{ role?, isVerified?, isLocked? }`. 200 — updated User.
  Tự-demote (đổi role admin → user cho chính mình) bị chặn.

#### GET `/admin/rules`
- Admin. 200:
  ```json
  { "rules": [ { "id", "name", "displayName", "description", "category", "weight", "isEnabled" } ] }
  ```

#### PUT `/admin/rules`
- Admin. Body:
  ```json
  { "rules": [ { "ruleId": "uuid", "weight": 7 } ] }
  ```
- 200 `{ updated: 3 }`.

#### GET `/admin/stats?period=30d`
- Admin. 200:
  ```json
  {
    "totalUsers": 123,
    "totalAudits": 456,
    "avgScore": 72.4,
    "statusDistribution": { "completed": 400, "failed": 20, "pending": 2 }
  }
  ```

---

### 1.6 Shared / Health

#### GET `/shared/audits/:token`
- **Public**. 200: readonly audit report.
- 404 — token invalid hoặc revoked.

#### GET `/health`
- **Public**. 200:
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "uptime": 3612,
    "services": {
      "database": true,
      "redis": true,
      "crawler": true,
      "analyzer": true,
      "report": true
    }
  }
  ```
- 503 — có service nào fail.

---

## 2. gRPC — Crawler (`:50052`)

Proto: [packages/proto/crawler/v1/crawler.proto](../../packages/proto/crawler/v1/crawler.proto).

**Service:** `crawler.v1.CrawlerService`.

### `CrawlUrl(CrawlRequest) → CrawlResponse`

Request:
```protobuf
message CrawlRequest {
  string url = 1;
  string audit_id = 2;
  CrawlOptions options = 3;
}
message CrawlOptions {
  int32 timeout_ms = 1;
  bool force_playwright = 2;
  bool include_lighthouse = 3;
  string user_agent = 4;
}
```

Response:
```protobuf
message CrawlResponse {
  string audit_id = 1;
  PageData page_data = 2;
  common.v1.CoreWebVitals cwv_metrics = 3;
  CrawlMetadata metadata = 4;
}
```

`PageData` có ~30 field (title, metaDescription, h1Tags[], ..., rawHtml). Xem [02-crawler.md §7](02-crawler.md) hoặc proto trực tiếp.

### `HealthCheck(HealthCheckRequest) → HealthCheckResponse`

---

## 3. gRPC — SEO Analyzer (`:50053`)

Proto: [packages/proto/analyzer/v1/analyzer.proto](../../packages/proto/analyzer/v1/analyzer.proto).

**Service:** `analyzer.v1.SeoAnalyzerService`.

### `AnalyzePage(AnalyzeRequest) → AnalyzeResponse`

```protobuf
message AnalyzeRequest {
  string audit_id = 1;
  crawler.v1.PageData page_data = 2;
  string target_keyword = 3;  // optional
}

message AnalyzeResponse {
  string audit_id = 1;
  repeated RuleResult rule_results = 2;
  repeated CategoryScore category_scores = 3;
  double overall_score = 4;
  string classification = 5;
}

message RuleResult {
  string rule_id = 1;
  string rule_name = 2;
  common.v1.CheckStatus status = 3;
  double score = 4;
  int32 weight = 5;
  common.v1.IssueCategory category = 6;
  string message = 7;
  string suggestion = 8;
  map<string, string> metadata = 9;
}

message CategoryScore {
  common.v1.IssueCategory category = 1;
  double score = 2;
  int32 total_rules = 3;
  int32 passed = 4;
  int32 warned = 5;
  int32 failed = 6;
}
```

Gọi bởi: crawler `UrlAuditWorker` (F1 site audit).

### `ListRules(ListRulesRequest) → ListRulesResponse`

Trả về all `SeoRule` rows. Gọi bởi gateway `AdminController`.

### `GetRulesByCategory(GetRulesByCategoryRequest) → ListRulesResponse`

```protobuf
message GetRulesByCategoryRequest {
  common.v1.IssueCategory category = 1;
}
```

### `UpdateRuleWeight(UpdateRuleWeightRequest) → UpdateRuleWeightResponse`

```protobuf
message UpdateRuleWeightRequest {
  string rule_id = 1;
  int32 new_weight = 2;       // 1-10
}
message UpdateRuleWeightResponse {
  SeoRule rule = 1;
}
```

Validate weight ∈ [1, 10]. Gọi bởi gateway khi admin `PUT /admin/rules`.

### `HealthCheck`

---

## 4. gRPC — Keyword Analyzer (`:50054`)

Proto: [packages/proto/keyword/v1/keyword.proto](../../packages/proto/keyword/v1/keyword.proto).

**Service:** `keyword.v1.KeywordAnalyzerService`.

### `AnalyzeKeywords(KeywordRequest) → KeywordResponse`

```protobuf
message KeywordRequest {
  string audit_id = 1;
  string text_content = 2;
  string url = 3;
  string title = 4;              // optional
  string h1_text = 5;             // optional
  string meta_description = 6;    // optional
  string target_keyword = 7;      // optional
  string language = 8;            // optional "vi"|"en", else auto-detect
}

message KeywordResponse {
  string audit_id = 1;
  repeated KeywordResult keywords = 2;    // top 20
  int32 total_words = 3;
  int32 unique_words = 4;
  TargetKeywordAnalysis target_analysis = 5;  // optional
}

message KeywordResult {
  string keyword = 1;
  int32 frequency = 2;
  double density_percent = 3;
  bool in_title = 4;
  bool in_h1 = 5;
  bool in_first_paragraph = 6;
  bool in_meta_description = 7;
  int32 rank = 8;
}

message TargetKeywordAnalysis {
  string keyword = 1;
  int32 frequency = 2;
  double density_percent = 3;
  bool in_title = 4;
  bool in_h1 = 5;
  bool in_first_paragraph = 6;
  bool in_meta_description = 7;
  bool is_stuffing = 8;
  string verdict = 9;             // "low"|"optimal"|"high"|"stuffing"
}
```

Trong production dùng BullMQ chủ yếu; gRPC chỉ cho admin/test.

### `HealthCheck`

---

## 5. gRPC — Report (`:50055`)

Proto: [packages/proto/report/v1/report.proto](../../packages/proto/report/v1/report.proto).

**Service:** `report.v1.ReportService`.

### `GenerateReport(GenerateReportRequest) → GenerateReportResponse`

Admin-only path (production dùng BullMQ `report.start`).

### `GetReport(GetReportRequest) → GetReportResponse`

```protobuf
message GetReportRequest { string audit_id = 1; }

message GetReportResponse {
  string report_id = 1;
  string audit_id = 2;
  string url = 3;
  string domain = 4;
  double final_score = 5;
  string classification = 6;
  int32 total_issues = 7;
  int32 critical_issues = 8;
  repeated analyzer.v1.RuleResult rule_results = 9;
  repeated analyzer.v1.CategoryScore category_scores = 10;
  repeated keyword.v1.KeywordResult keywords = 11;
  common.v1.CoreWebVitals cwv_metrics = 12;
  common.v1.CoreWebVitals cwv_metrics_desktop = 13;
  string target_keyword = 14;    // optional
  string created_at = 15;        // ISO 8601
}
```

Gọi bởi gateway `GET /audits/:id`.

### `CompareReports(CompareRequest) → CompareResponse`

```protobuf
message CompareRequest { string audit1_id = 1; string audit2_id = 2; }
message CompareResponse {
  double score_delta = 1;
  repeated RuleDelta rule_delta = 2;
  int32 issues_fixed = 3;
  int32 issues_new = 4;
}
message RuleDelta {
  string rule_id = 1;
  string rule_name = 2;
  common.v1.CheckStatus status_before = 3;
  common.v1.CheckStatus status_after = 4;
  double score_delta = 5;
}
```

### `CreateShareLink`, `GetSharedReport`, `RevokeShareLink`

Share link management. Gateway gọi tất cả.

### `GeneratePdf(GeneratePdfRequest) → GeneratePdfResponse`

Trả PDF bytes. Hiện gateway dùng HTTP endpoint (redirect) thay vì gRPC call — vì stream bytes qua gRPC phức tạp hơn.

### `HealthCheck`

---

## 6. WebSocket (`ws://host:3000/ws`)

Namespace: `/ws` (Socket.IO).

### Kết nối

```js
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/ws', {
  auth: { token: accessJwt }       // hoặc Authorization header
});
```

Gateway verify JWT (`JWT_ACCESS_SECRET`). Fail → disconnect ngay.

### Client → Server events

| Event | Payload | Hành vi |
|---|---|---|
| `audit:subscribe` | `{ auditId: string }` | Join room `audit:{auditId}` |
| `audit:unsubscribe` | `{ auditId: string }` | Leave room |

### Server → Client events

| Event | Payload | Trigger |
|---|---|---|
| `audit:progress` | `{ auditId, progress: 0-100, stage: string, message?: string }` | Mỗi lần downstream publish `audit.progress` — stage bao gồm `crawling`, `analyze`, `report`, `site-crawl-discovery`, `site-crawl-fanout`, `site-crawl-audit`, `site-crawl-done` |
| `audit:completed` (single) | `{ auditId, finalScore: number }` | Report publish `report.done` / `audit.completed` |
| `audit:completed` (site, F1) | `{ auditId, finalScore: number, summary: { rootUrl, totalUrls, auditedUrls, failedUrls, avgScore, medianScore, worstPages: [{ url, score, issueCount, error? }] } }` | `SiteCrawlSubscriber` khi aggregate worker fan-in xong |
| `audit:failed` | `{ auditId, error: string }` | Worker publish `audit.failed` |

### Ví dụ flow client

```js
socket.on('connect', () => {
  socket.emit('audit:subscribe', { auditId });
});

socket.on('audit:progress', ({ progress, stage, message }) => {
  setProgressBar(progress);
  setStageLabel(stage);
});

socket.on('audit:completed', ({ finalScore }) => {
  refetchAuditDetail();  // TanStack Query invalidate
});

socket.on('audit:failed', ({ error }) => {
  showErrorToast(error);
});
```

---

## 7. Redis Pub/Sub

Không phải API public — chỉ dành cho service-to-service trong cluster. Tổng hợp để debug + hiểu flow.

| Channel | Publisher | Subscriber(s) | Payload |
|---|---|---|---|
| `audit.progress` | crawler, report | gateway | `{ auditId, progress: 0-100, stage: string, message? }` |
| `audit.completed` | report | gateway | `{ auditId, finalScore, reportId, classification }` |
| `audit.failed` | crawler, report | gateway | `{ auditId, error: string }` |
| `crawl.done` | crawler | report | `{ auditId, pageData, cwvMetrics, cwvMetricsDesktop, metadata, textContent }` |
| `crawl.failed` | crawler | — (log) | `{ auditId, status: FAILED, error, name }` |
| `analyze.done` | seo-analyzer | report | `{ auditId, status, stage: 'analyze', progress: 66, message }` |
| `keyword.done` | keyword-analyzer | report | `{ auditId, status: 'success'\|'failed', error? }` |
| `report.done` | report | gateway | `{ auditId, reportId, finalScore, classification }` |
| `page-audit.done` | crawler (site audit) | gateway `PageAuditSubscriber` | `{ auditId, result: { url, score, issues, fetchedAt, error? } }` |
| `site-crawl.done` | crawler | gateway `SiteCrawlSubscriber` + `RegressionDetectorService` (F2) | `{ auditId, summary: { rootUrl, totalUrls, auditedUrls, failedUrls, avgScore, medianScore, worstPages: [...] } }` |

---

## 8. Error shape (REST)

Dựa trên RFC 7807 Problem Details (gateway `AllExceptionsFilter`):

```json
{
  "type": "about:blank",
  "title": "Validation Failed",
  "status": 400,
  "detail": "url must be a valid URL",
  "instance": "/api/v1/audits",
  "requestId": "req_abc123",
  "errors": [
    { "field": "url", "message": "..." }
  ]
}
```

| Status | Ý nghĩa |
|---|---|
| 400 | Validation fail (class-validator) |
| 401 | Chưa auth / token expired / wrong credentials |
| 403 | Authenticated nhưng không đủ quyền / rate limit |
| 404 | Resource không tồn tại |
| 409 | Conflict (email đã tồn tại) |
| 422 | Business logic fail (vd URL không crawl được) |
| 500 | Server error (tracked bởi `requestId`) |

---

## 9. Contract versioning

- **REST:** prefix `/api/v1`. Breaking change → bump sang `/api/v2`.
- **gRPC:** proto dùng package `{service}.v1`. Breaking change → mở `{service}.v2.proto`.
- **WebSocket events:** không versioned — phụ thuộc REST/gRPC namespace ngầm.

---

## 10. File tham chiếu

| File | Purpose |
|---|---|
| [apps/gateway/src/**/*.controller.ts](../../apps/gateway/src/) | REST source of truth |
| [apps/gateway/src/main.ts](../../apps/gateway/src/main.ts) | Swagger setup (`/api/docs`) |
| [packages/proto/common/v1/common.proto](../../packages/proto/common/v1/common.proto) | Shared enum/message |
| [packages/proto/crawler/v1/crawler.proto](../../packages/proto/crawler/v1/crawler.proto) | Crawler gRPC |
| [packages/proto/analyzer/v1/analyzer.proto](../../packages/proto/analyzer/v1/analyzer.proto) | Analyzer gRPC |
| [packages/proto/keyword/v1/keyword.proto](../../packages/proto/keyword/v1/keyword.proto) | Keyword gRPC |
| [packages/proto/report/v1/report.proto](../../packages/proto/report/v1/report.proto) | Report gRPC |
| [apps/gateway/src/infra/websocket/audit.gateway.ts](../../apps/gateway/src/infra/websocket/audit.gateway.ts) | WebSocket impl |
| [apps/gateway/src/common/filters/all-exceptions.filter.ts](../../apps/gateway/src/common/filters/all-exceptions.filter.ts) | Error shape |

---

## 11. Đi tiếp

- Xem queue + choreography → [22-job-pipeline.md](22-job-pipeline.md)
- Xem từng endpoint được dùng bởi page nào → [31-page-specs.md](31-page-specs.md) (frontend)
