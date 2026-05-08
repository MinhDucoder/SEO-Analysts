# BACKEND-API — Hợp đồng FE ↔ Gateway

> **Mục tiêu**: tài liệu nguồn duy nhất để **FE agent** đọc và phát triển frontend mà **không cần đọc source backend**. Mọi endpoint, payload, error, WebSocket event, và enum FE cần đều nằm ở đây.
>
> **Phạm vi**: chỉ `apps/gateway` (cổng public). Các service nội bộ (`crawler`, `seo-analyzer`, `keyword-analyzer`, `report`) chỉ được mô tả ở phần Pipeline để FE hiểu lý do có progress event.
>
> **Nguồn sự thật khi nghi ngờ**: Swagger UI tại `http://localhost:3000/api/docs` (bật khi `npm run docker:up` hoặc `npm run dev:gateway`).

---

## 0. Cài đặt cơ bản FE phải biết

| Mục | Giá trị |
|---|---|
| Base URL (dev) | `http://localhost:3000` |
| Global prefix | `/api/v1` (mọi REST đều có prefix này) |
| Swagger | `GET /api/docs` |
| Health | `GET /api/v1/health` (public) |
| Frontend dev URL | `http://localhost:3001` (CORS chỉ cho phép origin này) |
| WebSocket | `ws://localhost:3000/ws` (Socket.IO, namespace `/ws`) |
| CORS | `credentials: true`, origin = `FRONTEND_URL` env (mặc định 3001) |
| Content-Type request | `application/json` |
| Content-Type response | `application/json` (success) · `application/problem+json` (error) |
| Validation | `class-validator` qua `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` — gửi field không khai báo trong DTO sẽ bị **400** |
| Headers FE nên gửi | `Authorization: Bearer <accessToken>`, `x-request-id` (optional, FE tạo UUID; gateway echo lại trong response header) |

> ⚠️ **`forbidNonWhitelisted: true`** — KHÔNG gửi field thừa. Nếu schema chỉ có `email`, đừng kèm `username`. Sẽ 400.

---

## 1. Authentication & Session

### 1.1 Mô hình token (đọc kỹ trước khi build auth UI)

| Token | Lưu ở đâu | Hết hạn | Mục đích |
|---|---|---|---|
| **Access token** (JWT) | FE giữ trong memory + `Authorization: Bearer …` header | 15 phút (`JWT_CONFIG.ACCESS_TOKEN_EXPIRES`) | Xác thực mọi REST + WebSocket |
| **Refresh token** | **HttpOnly cookie** `refresh_token`, path `/api/v1/auth`, `SameSite=Lax`, `Secure` ở production | 7 ngày (`JWT_CONFIG.REFRESH_TOKEN_EXPIRES_DAYS`) | Đổi access token mới |

**FE flow chuẩn**:
1. `POST /api/v1/auth/login` → nhận `{ user, accessToken }` (refresh token tự set vào cookie).
2. Lưu `accessToken` trong memory/Zustand. KHÔNG localStorage (XSS).
3. Mỗi request gắn `Authorization: Bearer <accessToken>`.
4. Khi nhận **401** trên endpoint cần auth → gọi `POST /api/v1/auth/refresh` (browser tự gửi cookie nhờ `credentials: 'include'`).
5. Refresh trả `accessToken` mới (refresh token rotate trong cookie). Retry request gốc.
6. Logout = `POST /api/v1/auth/logout` → backend tự `clearCookie`.

**FE phải bật `credentials: 'include'` (fetch) hoặc `withCredentials: true` (axios)** ở mọi call vào `/api/v1/auth/*` để cookie được gửi/nhận.

### 1.2 WebSocket auth

Khi connect Socket.IO:
```js
io('http://localhost:3000/ws', {
  auth: { token: accessToken }, // hoặc Authorization header
  transports: ['websocket'],
})
```
Server `verify` JWT. Sai token → server gọi `disconnect(true)` ngay.

### 1.3 Google OAuth

- `GET /api/v1/auth/google` — redirect sang Google.
- Sau khi user đồng ý, Google redirect `GET /api/v1/auth/google/callback` → gateway set refresh cookie và **redirect 302 sang FE**:
  ```
  ${FRONTEND_URL}/auth/oauth-success?token=<accessToken URL-encoded>
  ```
- FE cần có route `/auth/oauth-success` để parse `?token=` từ URL → lưu vào store → redirect dashboard.

---

## 2. Error Contract (RFC 7807 — `application/problem+json`)

**Mọi lỗi** từ gateway đều theo format này (do `AllExceptionsFilter` áp global):

```jsonc
{
  "type": "https://httpstatuses.com/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "Mat khau toi thieu 8 ky tu",
  "instance": "/api/v1/auth/register",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "errors": [                                  // CHỈ có khi validation fail
    { "field": "body", "message": "email must be an email" },
    { "field": "body", "message": "password too short" }
  ]
}
```

| HTTP | Khi nào | UX FE đề xuất |
|---|---|---|
| 400 | Validation fail (DTO sai format) | Toast `detail` + highlight field nếu parse được |
| 401 | Thiếu/sai access token | Auto-refresh 1 lần → fail thì redirect login |
| 403 | Tài khoản bị lock / chưa verify email / vượt rate limit | Modal giải thích, KHÔNG retry |
| 404 | Audit/share token không tồn tại | Empty state |
| 409 | Email đã tồn tại khi register | Inline error |
| 500 | Bug backend | Toast generic + log `requestId` để báo backend |

> 🆔 **`requestId`** luôn có. FE nên hiển thị/log để dễ debug với BE. FE có thể chủ động sinh UUID gửi qua header `x-request-id` để trace end-to-end.

---

## 3. Rate Limiting

Gateway dùng sliding-window Redis. KHÔNG có header `X-RateLimit-*` chuẩn — FE phát hiện qua HTTP **400/403** với `detail` chứa "Da dat gioi han" hoặc "Thu lai sau Ns".

| Bucket | Giới hạn | Window | Endpoint áp dụng |
|---|---|---|---|
| Register per IP | 5 | 1 giờ | `POST /auth/register` |
| Login per email | 10 | 15 phút | `POST /auth/login` |
| Audit per user | 10 | 1 giờ | `POST /audits` |

(Constants trong `@repo/shared` — `RATE_LIMIT.*`.)

---

## 4. REST API — đầy đủ endpoint

> Mọi route đều có prefix `/api/v1`. Trong bảng dưới chỉ ghi phần **sau prefix**.
>
> Cột **Auth**: 🔓 public · 🔒 cần access token · 👑 cần role `admin`.

### 4.1 `auth` — Đăng ký · đăng nhập · token

| Method | Path | Auth | Body / Query | Response 2xx |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | [`RegisterDto`](#registerdto) | `201` `{ user: UserPublic, message, verifyToken }` ⚠️ |
| POST | `/auth/login` | 🔓 | [`LoginDto`](#logindto) | `200` `{ user: UserPublic, accessToken }` (set cookie `refresh_token`) |
| POST | `/auth/refresh` | 🔓 (cookie) | _Không body_ — đọc cookie `refresh_token` | `200` `{ accessToken }` (rotate cookie) |
| POST | `/auth/logout` | 🔒 | _Không body_ | `200` `{ message }` (clear cookie) |
| GET | `/auth/me` | 🔒 | — | `200` `UserPublic` |
| POST | `/auth/verify-email` | 🔓 | [`VerifyEmailDto`](#verifyemaildto) | `200` `{ message }` |
| POST | `/auth/forgot-password` | 🔓 | [`ForgotPasswordDto`](#forgotpassworddto) | `200` `{ message }` (luôn thành công, không leak existence) |
| POST | `/auth/reset-password` | 🔓 | [`ResetPasswordDto`](#resetpassworddto) | `200` `{ message }` (revoke all refresh tokens) |
| GET | `/auth/google` | 🔓 | — | `302` redirect Google |
| GET | `/auth/google/callback` | 🔓 | — | `302` redirect FE `/auth/oauth-success?token=…` |

⚠️ `verifyToken` trong response register là **dev-only** (TODO: gỡ khi có email service). Production sẽ chỉ trả `user + message`.

### 4.2 `audits` — Tạo & theo dõi audit

| Method | Path | Auth | Body / Query | Response 2xx |
|---|---|---|---|---|
| POST | `/audits` | 🔒 | [`CreateAuditDto`](#createauditdto) | `202` `{ auditId, status: 'pending', mode, message }` |
| GET | `/audits` | 🔒 | [`ListAuditsQuery`](#listauditsquery) | `200` `{ data: AuditSummary[], meta: Pagination }` |
| GET | `/audits/compare` | 🔒 | [`CompareAuditsQuery`](#compareauditsquery) (`audit1`, `audit2` UUID) | `200` `CompareResult` (xem [§5](#5-compare-result)) |
| GET | `/audits/:id` | 🔒 | param UUID | `200` `{ audit: AuditDetail, report: ReportDetail \| null }` |
| GET | `/audits/:id/status` | 🔒 | — | `200` `{ auditId, status, progress, stage, seoScore? }` |
| GET | `/audits/:id/wait` | 🔒 | `?timeout=60` (sec, max 120) | `200` `{ audit, report }` (long-poll, trả khi `completed`/`failed` hoặc hết timeout) |
| DELETE | `/audits/:id` | 🔒 | — | `204` |
| GET | `/audits/:id/export` | 🔒 | — | `302` redirect đến URL stream PDF (Report service) |
| POST | `/audits/:id/share` | 🔒 | — | `201` `{ shareToken, shareUrl }` |
| DELETE | `/audits/:id/share` | 🔒 | — | `204` |

**Ghi chú quan trọng cho FE**:

- `POST /audits` trả **202 Accepted**, KHÔNG có report. FE nên:
  1. Lưu `auditId` từ response.
  2. Connect WebSocket → emit `audit:subscribe` với `{ auditId }`.
  3. Render skeleton, cập nhật `progress` từ event `audit:progress`.
  4. Khi nhận `audit:completed` → fetch lại `GET /audits/:id` để lấy report đầy đủ.
- `:id/wait` là alternative nếu FE không muốn dùng WebSocket (ví dụ trong Server Component không hỗ trợ WS) — gọi 1 request, đợi tối đa 120s, nhận kết quả.
- `:id/export` redirect 302 — fetch ở FE phải có `redirect: 'follow'` hoặc dùng `<a href="…/export">` để browser tự handle download.

### 4.3 `scheduled-audits` — Audit định kỳ (cron)

| Method | Path | Auth | Body / Query | Response 2xx |
|---|---|---|---|---|
| POST | `/scheduled-audits` | 🔒 | [`CreateScheduledAuditDto`](#createscheduledauditdto) | `201` `ScheduledAuditDto` |
| GET | `/scheduled-audits` | 🔒 | — | `200` `ScheduledAuditDto[]` (sorted desc by createdAt) |
| GET | `/scheduled-audits/:id` | 🔒 | — | `200` `ScheduledAuditDto` |
| PATCH | `/scheduled-audits/:id/pause` | 🔒 | — | `200` `ScheduledAuditDto` (`isActive=false`) |
| PATCH | `/scheduled-audits/:id/resume` | 🔒 | — | `200` `ScheduledAuditDto` (`isActive=true`) |
| DELETE | `/scheduled-audits/:id` | 🔒 | — | `204` |

`cron` validate là 5-field (`minute hour dom month dow`), ví dụ `0 9 * * MON`.

### 4.4 `users` — Profile cá nhân

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| PATCH | `/users/profile` | 🔒 | [`UpdateProfileDto`](#updateprofiledto) | `200` `{ id, fullName, avatarUrl }` |
| PATCH | `/users/password` | 🔒 | [`ChangePasswordDto`](#changepassworddto) | `200` `{ message }` (revoke tất cả refresh token → user phải re-login mọi device) |

⚠️ Sau khi đổi password, **mọi session khác sẽ invalidate**. FE current session cũng cần re-login (cookie đã bị revoke ở DB).

### 4.5 `admin` — 👑 chỉ role `admin`

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/admin/users` | 👑 | [`ListUsersQuery`](#listusersquery) | `200` `{ data: AdminUser[], meta: Pagination }` |
| PATCH | `/admin/users/:id` | 👑 | `{ isLocked: boolean }` | `200` `{ id, email, isLocked }` (admin không thể lock chính mình) |
| GET | `/admin/rules` | 👑 | — | `200` `{ rules: SeoRule[] }` |
| PUT | `/admin/rules` | 👑 | [`UpdateRulesDto`](#updaterulesdto) | `200` `{ updated: SeoRule[] }` |
| GET | `/admin/stats` | 👑 | `?period=30d` (số ngày, default 30) | `200` `AdminStats` (xem [§5](#5-shape-tham-khảo)) |

### 4.6 `shared` — Public share view (không cần token)

| Method | Path | Auth | Param | Response |
|---|---|---|---|---|
| GET | `/shared/audits/:token` | 🔓 | `:token` (≥8 ký tự) | `200` `ReportDetail` (cùng shape `audits/:id` `report` field) hoặc `404` |

### 4.7 `health` — Public liveness

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | 🔓 | `200` `{ status: 'ok', version, uptime, services: { database, redis, crawler, analyzer, report } }` (luôn 200, mỗi service là `boolean`) |

---

## 5. Shape tham khảo (response objects)

### `UserPublic`
```ts
{
  id: string;            // UUID
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;     // ISO 8601
}
```

### `AuditSummary`
```ts
{
  id: string;
  url: string;
  domain: string;
  status: AuditStatus;
  seoScore: number | null;          // 0–100, 2 decimal
  targetKeyword: string | null;
  crawlerType: string | null;       // 'cheerio' | 'playwright'
  crawlDurationMs: number | null;
  createdAt: string;                // ISO
  completedAt: string | null;       // ISO
}
```

### `AuditDetail` (mở rộng từ Summary)
```ts
{
  id: string;
  url: string;
  domain: string;
  status: AuditStatus;
  seoScore: number | null;
  targetKeyword: string | null;
  crawlerType: string | null;
  crawlDurationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;      // chỉ != null khi status='failed'
}
```

### `ReportDetail` (gateway proxy gRPC từ report service)
```ts
{
  reportId: string;
  auditId: string;
  url: string;
  domain: string;
  finalScore: number;               // 0–100
  classification: 'excellent' | 'good' | 'fair' | 'poor';
  ruleResults: Array<{
    ruleId: string;
    ruleName: string;               // ví dụ 'rule_title_tag'
    status: 'CHECK_STATUS_PASS' | 'CHECK_STATUS_WARN' | 'CHECK_STATUS_FAIL' | 'CHECK_STATUS_UNSPECIFIED';
    score: number;                  // 0–100
    weight: number;                 // 1–10
    category: 'ISSUE_CATEGORY_META' | 'ISSUE_CATEGORY_HEADINGS' | 'ISSUE_CATEGORY_IMAGES'
            | 'ISSUE_CATEGORY_LINKS' | 'ISSUE_CATEGORY_PERFORMANCE' | 'ISSUE_CATEGORY_TECHNICAL'
            | 'ISSUE_CATEGORY_UNSPECIFIED';
    message: string;
    suggestion?: string;
    metadata: Record<string, string>;
  }>;
  categoryScores: Array<{
    category: IssueCategory;        // proto-style như trên
    score: number;
    totalRules: number;
    passed: number;
    warned: number;
    failed: number;
  }>;
  keywords: Array<{
    keyword: string;
    frequency: number;
    densityPercent: number;
    inTitle: boolean;
    inH1: boolean;
    inFirstParagraph: boolean;
    inMetaDescription: boolean;
    rank: number;
  }>;
  cwvMetrics: {
    lcpMs: number;
    inpMs: number;
    cls: number;
    performanceScore: number;       // 0–100
    accessibilityScore: number;
    bestPracticesScore: number;
    seoScore: number;               // Lighthouse SEO, khác finalScore
  };
  targetKeyword?: {
    keyword: string;
    frequency: number;
    densityPercent: number;
    inTitle: boolean;
    inH1: boolean;
    inFirstParagraph: boolean;
    inMetaDescription: boolean;
    isStuffing: boolean;
    verdict: string;
  };
  createdAt: string;                // ISO
}
```

> ⚠️ **Lưu ý quirk**: `status` và `category` ở đây là **proto-style enum string** (`CHECK_STATUS_PASS`, `ISSUE_CATEGORY_META`), KHÔNG phải lowercase như `AuditStatus`. FE cần map nếu muốn UI ngắn gọn:
> ```ts
> const STATUS_MAP = {
>   CHECK_STATUS_PASS: 'pass', CHECK_STATUS_WARN: 'warn', CHECK_STATUS_FAIL: 'fail',
> };
> ```

### `CompareResult`
```ts
{
  scoreDelta: number;               // có thể âm
  ruleDeltas: Array<{
    ruleId: string;
    ruleName: string;
    statusBefore: 'CHECK_STATUS_PASS' | 'CHECK_STATUS_WARN' | 'CHECK_STATUS_FAIL' | 'UNSPECIFIED';
    statusAfter:  'CHECK_STATUS_PASS' | 'CHECK_STATUS_WARN' | 'CHECK_STATUS_FAIL' | 'UNSPECIFIED';
    scoreDelta: number;
  }>;
  issuesFixed: string[];            // ruleName[] đã chuyển fail/warn → pass
  issuesNew: string[];              // ruleName[] mới fail
}
```

### `ScheduledAuditDto`
```ts
{
  id: string;
  userId: string;
  url: string;
  cron: string;                     // 5-field
  mode: 'single' | 'site';
  maxUrls: number | null;
  targetKeyword: string | null;
  lastRunAt: string | null;         // ISO
  lastScore: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### `Pagination` meta
```ts
{
  total: number;                    // tổng record (không phải pages)
  page: number;                     // 1-based
  limit: number;
  totalPages: number;
}
```

### `AdminUser` (mở rộng UserPublic)
```ts
{
  id, email, fullName, role, isVerified, isLocked, oauthProvider, avatarUrl, createdAt,
  auditCount: number;               // tổng audit của user
}
```

### `AdminStats`
```ts
{
  overview: {
    totalUsers: number;
    totalAudits: number;
    successRate: number;            // % (0–100, 2 decimal)
    avgCrawlTimeMs: number;
    avgSeoScore: number;
  };
  newUsersToday: number;
  auditsToday: number;
  topDomains: Array<{ domain: string; count: number }>;
}
```

### `SeoRule` (admin/rules)
```ts
{
  id: string;
  name: string;                     // 'rule_title_tag'
  displayName: string;
  description: string;
  category: IssueCategory;          // proto-style
  weight: number;                   // 1–10
  isEnabled: boolean;
}
```

---

## 6. DTO request — đầy đủ field

### `RegisterDto`
```ts
{
  email: string;                    // IsEmail
  fullName: string;                 // 2..100 chars
  password: string;                 // 8..72, ≥1 uppercase, ≥1 digit, ≥1 special !@#$%^&*
}
```

### `LoginDto`
```ts
{ email: string; password: string }  // password chỉ check non-empty
```

### `VerifyEmailDto`
```ts
{ token: string }                   // 16..256 chars
```

### `ForgotPasswordDto`
```ts
{ email: string }
```

### `ResetPasswordDto`
```ts
{ token: string; newPassword: string }   // newPassword cùng rule với register
```

### `CreateAuditDto`
```ts
{
  url: string;                      // http/https only, max 2048
  targetKeyword?: string;           // max 255
  mode?: 'single' | 'site';         // default 'single'
  maxUrls?: number;                 // chỉ áp dụng mode='site', 1..5000 (default 500)
}
```

### `ListAuditsQuery`
```ts
{
  page?: number;                    // default 1, min 1
  limit?: number;                   // default 20, max 100
  sort?: 'createdAt' | 'seoScore';  // default 'createdAt'
  order?: 'asc' | 'desc';           // default 'desc'
  search?: string;                  // contains domain/url, case-insensitive
  status?: AuditStatus;             // filter
  scoreMin?: number;                // 0..100
  scoreMax?: number;                // 0..100
  dateFrom?: string;                // ISO date
  dateTo?: string;                  // ISO date
}
```

### `CompareAuditsQuery`
```ts
{ audit1: string; audit2: string }  // cả 2 phải UUID, user phải own cả 2 (admin override)
```

### `CreateScheduledAuditDto`
```ts
{
  url: string;                      // http/https
  cron: string;                     // 5-field, ví dụ '0 9 * * MON'
  mode?: 'single' | 'site';
  maxUrls?: number;                 // 1..5000
  targetKeyword?: string;
}
```

### `UpdateProfileDto`
```ts
{ fullName?: string; avatarUrl?: string }   // ≥1 trường, BadRequest nếu cả 2 đều undefined
```

### `ChangePasswordDto`
```ts
{ currentPassword: string; newPassword: string }   // newPassword cùng rule register
```

### `ListUsersQuery`
```ts
{
  page?: number; limit?: number;
  search?: string;                  // email | fullName
  role?: 'user' | 'admin';
  isLocked?: 'true' | 'false';      // string boolean (query param)
}
```

### `UpdateRulesDto`
```ts
{ rules: Array<{ name: string; weight: number /* 1..10 */ }> }   // ≥1 phần tử
```

---

## 7. Enums dùng chung (đồng bộ với `@repo/shared`)

```ts
enum AuditStatus {
  PENDING = 'pending',
  CRAWLING = 'crawling',
  ANALYZING = 'analyzing',
  REPORTING = 'reporting',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

enum AuditMode {
  SINGLE = 'single',
  SITE = 'site',
}

enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Hiển thị card score
enum Classification {
  EXCELLENT = 'excellent',          // ≥80
  GOOD = 'good',                    // ≥60
  FAIR = 'fair',                    // ≥40
  POOR = 'poor',                    // <40
}
// Đã có util `classify(score)` trong @repo/shared nếu FE muốn re-derive client-side.

enum AlertType {                    // dùng cho regression alert (Phase F2)
  SCORE_DROP = 'score_drop',
  NEW_ISSUES = 'new_issues',
  SITE_DOWN = 'site_down',
}

// Trong report payload (proto-style — chú ý tiền tố):
// CheckStatus:    CHECK_STATUS_PASS | CHECK_STATUS_WARN | CHECK_STATUS_FAIL | CHECK_STATUS_UNSPECIFIED
// IssueCategory:  ISSUE_CATEGORY_META | ISSUE_CATEGORY_HEADINGS | ISSUE_CATEGORY_IMAGES
//                 ISSUE_CATEGORY_LINKS | ISSUE_CATEGORY_PERFORMANCE | ISSUE_CATEGORY_TECHNICAL
//                 ISSUE_CATEGORY_UNSPECIFIED
```

---

## 8. WebSocket — `/ws` (Socket.IO)

### Connect
```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/ws', {
  auth: { token: accessToken },          // hoặc headers.authorization = `Bearer ${accessToken}`
  transports: ['websocket'],
});
```
Sai/thiếu token → server `disconnect(true)` ngay sau handshake.

### Events FE → server (emit có ack)

| Event | Payload | Ack response |
|---|---|---|
| `audit:subscribe` | `{ auditId: string }` | `{ joined: 'audit:<auditId>' }` hoặc `{ error: 'Unauthorized' }` |
| `audit:unsubscribe` | `{ auditId: string }` | `{ left: 'audit:<auditId>' }` |

### Events server → FE (lắng nghe)

| Event | Payload | Khi nào emit |
|---|---|---|
| `audit:progress` | `{ auditId, progress?, stage?, message? }` | Crawler/analyzer/keyword publish vào Redis `audit.progress` → gateway forward |
| `audit:completed` | `{ auditId, finalScore?, ... }` | Sau khi report được sinh xong |
| `audit:failed` | `{ auditId, error?, message? }` | Pipeline fail ở bất kỳ stage nào |

### Pattern FE chuẩn

```ts
// Sau khi POST /audits trả auditId:
socket.emit('audit:subscribe', { auditId });

socket.on('audit:progress', (e) => {
  // e.progress: 0..100, e.stage: 'crawling' | 'analyzing' | 'reporting' | ...
  setProgress(e.progress); setStage(e.stage);
});

socket.on('audit:completed', () => {
  // Refetch GET /audits/:id để có report đầy đủ
  queryClient.invalidateQueries(['audit', auditId]);
});

socket.on('audit:failed', (e) => {
  showError(e.message ?? e.error ?? 'Audit failed');
});

// Khi unmount:
socket.emit('audit:unsubscribe', { auditId });
```

> 💡 Mỗi `auditId` map sang Socket.IO room `audit:<auditId>`. Một client có thể subscribe nhiều audit cùng lúc.

---

## 9. Pipeline Overview (FE chỉ cần biết để render UX)

```
FE  ──HTTP POST /audits──▶ gateway
                              │ tạo Audit row (status='pending')
                              │ enqueue BullMQ
                              ▼
              ┌─────────── crawler ─────────────┐
              │ 1. fetch HTML (Cheerio + fallback Playwright)
              │ 2. Lighthouse → Core Web Vitals
              │ 3. publish 'audit.progress' ─────────┐
              └────────┬─────────────────────────────┘
                       │                              │
                       ├─▶ seo-analyzer (20 rules) ──▶│  ▶ gateway forwards via WS
                       └─▶ keyword-analyzer ─────────▶│
                                                       │
                       Cả 2 done → report aggregator ─▶│
                                                       │
                              ▼ status='completed', seoScore set
                          publish 'audit.completed' ───┘
                                ▲
FE  ◀── WS audit:progress / audit:completed / audit:failed ─── gateway
```

**Stage values** mà FE có thể nhận trong `audit:progress.stage`:
- `crawling` — đang fetch HTML
- `analyzing` — đang chạy SEO rules
- `reporting` — đang tổng hợp report
- (status từ DB cũng có thể leak ra: `pending`, `completed`, `failed`)

`progress` là số 0..100 (gateway tự cap 100 khi completed).

---

## 10. Test accounts & sample IDs (dev only)

Dùng cho QA/demo. **Password chung: `Admin1234!`**.

| Email | Role | Đặc điểm |
|---|---|---|
| `admin@test.seo.local` | admin | Truy cập `/admin/*` |
| `duc@test.seo.local` | user | 10 audits đã có |
| `linh@test.seo.local` | user | 2 audits |
| `nam@test.seo.local` | user | 0 audits — test empty state |
| `unverified@test.seo.local` | user | Login → 403 (test verify flow) |
| `locked@test.seo.local` | user | Login → 403 (test lock flow) |

| Kịch bản | ID |
|---|---|
| Audit completed (cao, 92.5) | `b0000000-0000-0000-0000-000000000001` (google.com) |
| Audit completed (thấp, 64.8) | `b0000000-0000-0000-0000-000000000005` (shopee.vn) |
| Compare ví dụ | `audit1=b0000000-…001`, `audit2=b0000000-…006` |
| Share token active | `share_google_abc123def456` |
| Share token revoked | `share_shopee_revoked00001` |
| Status mix | `…007` crawling · `…008` analyzing · `…009` failed · `…010` pending |

Đầy đủ seed: `scripts/seed-output/seed-data.md`.

---

## 11. Checklist FE phát triển

**Auth slug**:
- [ ] Login page gọi `POST /auth/login`, `credentials: 'include'`, lưu accessToken trong store (KHÔNG localStorage).
- [ ] Axios/fetch interceptor: gắn `Authorization: Bearer …`, bắt 401 → call `POST /auth/refresh` 1 lần → retry; fail → redirect login.
- [ ] Register: hiển thị `verifyToken` ở dev (do BE chưa wire email).
- [ ] Forgot/reset: 2 step pages.
- [ ] Google OAuth: button → `window.location = /api/v1/auth/google`. Callback page `/auth/oauth-success?token=` → parse `searchParams.get('token')`.
- [ ] Logout: clear store + `POST /auth/logout`.

**Audits slug**:
- [ ] Form tạo audit (URL + optional keyword + mode toggle). 202 → push route `/audits/:id`.
- [ ] Detail page: connect WS, subscribe room, render skeleton + progress bar dựa trên `audit:progress.progress`.
- [ ] Khi `audit:completed` → invalidate query `audit:detail:id` → re-render report.
- [ ] List page: query `GET /audits` với pagination + filter UI.
- [ ] Compare page: 2 select audit → `GET /audits/compare`.
- [ ] Export PDF: `<a href="/api/v1/audits/:id/export">` (browser tự follow 302).
- [ ] Share: button POST `/audits/:id/share` → copy `shareUrl`. Revoke = DELETE.

**Admin slug**: chỉ render khi `user.role === 'admin'`. Dashboard từ `/admin/stats`. Lock/unlock dùng PATCH.

**Error/UX**:
- [ ] Toast component đọc `detail` từ `application/problem+json`.
- [ ] Hiển thị `requestId` ở error chi tiết để dễ báo bug.
- [ ] Empty state cho user 0 audits.

---

## 12. Khi tài liệu này không khớp với thực tế

1. Mở Swagger UI: http://localhost:3000/api/docs — luôn là nguồn chính xác.
2. Đọc trực tiếp controller file:
   - Auth: `apps/gateway/src/auth/controllers/auth.controller.ts`
   - Audits: `apps/gateway/src/audits/controllers/audits.controller.ts`
   - Scheduled: `apps/gateway/src/scheduled-audits/controllers/scheduled-audits.controller.ts`
   - Users: `apps/gateway/src/users/controllers/users.controller.ts`
   - Admin: `apps/gateway/src/admin/controllers/admin.controller.ts`
   - Shared: `apps/gateway/src/shared/controllers/shared.controller.ts`
   - Health: `apps/gateway/src/health/controllers/health.controller.ts`
3. WebSocket: `apps/gateway/src/infra/websocket/audit.gateway.ts` + `progress-subscriber.service.ts`.
4. Enums shared: `packages/shared/src/index.ts`.
5. Báo BE để cập nhật doc này.
