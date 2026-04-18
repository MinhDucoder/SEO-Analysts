# 01 — Gateway Service

> **Vai trò:** Lễ tân & điều phối — cửa duy nhất mà client nói chuyện. Service khác đều nằm sau gateway.
>
> **Port:** 3000 (HTTP REST + WebSocket) — gRPC client đi ra các service khác.
>
> **Database:** `seo_gateway` (PostgreSQL) — User, Audit, RefreshToken, PageAudit, ScheduledAudit (F2), AuditAlert (F2).

---

## 1. Mục đích & Trách nhiệm

Service `gateway` chịu trách nhiệm:

1. **Public REST API** (`/api/v1/**`) — auth, quản lý audit, scheduled audits (F2), user profile, admin panel, shared view.
2. **WebSocket gateway** (`/ws` namespace) — push realtime progress lên client khi audit chạy, bao gồm site-mode summary (F1).
3. **Điều phối job** — nhận POST /audits → enqueue BullMQ job `crawl.start` / `site-crawl.start` (F1). F2 `ScheduledAuditTickWorker` cũng tạo Audit + enqueue khi cron fire.
4. **gRPC client** — gọi 3 service còn lại (analyzer, report, crawler) để thực hiện các tác vụ đồng bộ (health check, admin rules, compare reports, share link, PDF redirect).
5. **Auth & bảo mật** — JWT local + Google OAuth, refresh token rotation, rate limit, SSRF validator, helmet, CORS.
6. **Health orchestrator** — endpoint `/health` check song song tất cả downstream service.
7. **Redis pub/sub subscribers (F1 + F2):**
   - `ProgressSubscriberService` — audit.progress / audit.completed / audit.failed → WebSocket emit.
   - `PageAuditSubscriberService` (F1) — `page-audit.done` → INSERT PageAudit row.
   - `SiteCrawlSubscriberService` (F1) — `site-crawl.done` → UPDATE Audit (COMPLETED, seoScore, counts), cache summary Redis 1h, emit `audit:completed` với summary.
   - `RegressionDetectorService` (F2) — `report.done` + `site-crawl.done` → compare với `ScheduledAudit.lastScore` → ghi `AuditAlert` nếu tụt ≥10 hoặc score=0.
8. **Scheduled audits (F2):**
   - REST CRUD `/scheduled-audits` + BullMQ Job Scheduler wrapper.
   - `ScheduledAuditTickWorker` consume `scheduled-audit.tick` → tạo Audit mới + enqueue pipeline.
   - Boot reconciler `onModuleInit` re-register mọi lịch active.

Service này **không tự crawl, không tự phân tích**. Nó điều phối, xác thực và kể kết quả cho client.

---

## 2. Kiến trúc module (DI map)

Cấu trúc thư mục theo DDD nhẹ, mỗi module tự đóng gói `controllers/ services/ dto/` và share chung qua `common/ infra/ shared/`.

```
apps/gateway/src/
├── main.ts                           # Bootstrap: Swagger, Helmet, CORS, cookieParser
├── app.module.ts                     # Root: import tất cả feature + global guards/filters
├── auth/                             # Auth module
│   ├── controllers/auth.controller.ts
│   ├── services/{auth,token,password,verification}.service.ts
│   ├── guards/{jwt-auth,roles,google-auth}.guard.ts
│   ├── strategies/{jwt,google}.strategy.ts
│   ├── decorators/{public,roles,current-user}.decorator.ts
│   └── dto/*.dto.ts
├── audits/                           # Audit module
│   ├── controllers/audits.controller.ts
│   ├── services/
│   │   ├── audits.service.ts
│   │   ├── audit-queue.producer.ts           # crawl.start + site-crawl.start (F1)
│   │   ├── page-audit-subscriber.service.ts  # F1 page-audit.done → PageAudit row
│   │   └── site-crawl-subscriber.service.ts  # F1 site-crawl.done → finalize Audit + emit WS
│   └── dto/*.dto.ts
├── scheduled-audits/                 # F2 scheduled audits module
│   ├── controllers/
│   │   ├── scheduled-audits.controller.ts    # REST /scheduled-audits CRUD + pause/resume
│   │   └── scheduled-audit-tick.worker.ts    # BullMQ scheduled-audit.tick consumer
│   ├── services/
│   │   ├── scheduled-audits.service.ts       # CRUD + boot reconciler
│   │   ├── scheduled-audit-scheduler.service.ts  # BullMQ Job Scheduler wrapper
│   │   └── regression-detector.service.ts    # report.done / site-crawl.done → AuditAlert
│   └── dto/create-scheduled-audit.dto.ts
├── users/                            # User profile
│   └── controllers/services/...
├── admin/                            # Admin panel
│   └── controllers/services/...
├── health/                           # Health endpoint
├── shared/                           # Public share endpoint
├── common/                           # Global filter, interceptor, middleware
│   ├── filters/all-exceptions.filter.ts
│   ├── middleware/request-id.middleware.ts
│   └── utils/url-validator.ts        # SSRF
└── infra/                            # Infrastructure adapters
    ├── prisma/                       # Prisma client + module
    ├── redis/{redis.service.ts,rate-limiter.service.ts}
    ├── grpc/{grpc-client.factory,crawler.client,analyzer.client,report.client}
    └── websocket/{audit.gateway,progress-subscriber.service}
```

### Module phụ thuộc

```
                     AppModule
                         │
  ┌──────────┬──────────┼───────────┬──────────┬──────────┬──────────────────┐
  │          │          │           │          │          │                  │
AuthModule AuditsModule UsersModule AdminModule HealthModule SharedModule  ScheduledAuditsModule (F2)
  │          │          │           │          │          │                  │
  └──────────┴──────────┴───────────┴──────────┴──────────┴──────────────────┘
                         │
          imports globally: ConfigModule, PrismaModule,
          RedisModule, GrpcModule, WebsocketModule
```

**Global providers** (đăng ký trong AppModule):
- `APP_GUARD` = `JwtAuthGuard` — mọi route đều yêu cầu JWT trừ khi có `@Public()`.
- `APP_FILTER` = `AllExceptionsFilter` — format lỗi chuẩn RFC 7807 Problem Details.
- Global middleware: `RequestIdMiddleware` gắn `x-request-id` cho tracing.

---

## 3. Luồng xử lý điển hình

### 3.1 Đăng ký + đăng nhập

```
POST /api/v1/auth/register {email, password, fullName}
 ├─ RateLimiter: 1/h/IP
 ├─ Unique check email
 ├─ bcrypt.hash(password, 12)
 ├─ Prisma INSERT User (isVerified=false, role=user)
 ├─ VerificationService tạo token lưu Redis (~1h TTL)
 └─ 201 { user, verifyToken }

POST /api/v1/auth/verify-email {token}  → set isVerified=true

POST /api/v1/auth/login {email, password}
 ├─ RateLimiter: 5/15m/email
 ├─ Find User by email
 ├─ bcrypt.compare
 ├─ Check isVerified + !isLocked
 ├─ TokenService.issueTokens(user, ctx):
 │    accessToken = JWT HS256 payload {sub, email, role} exp 15m
 │    refreshRaw  = 48 bytes random base64url
 │    refreshHash = SHA-256(refreshRaw) → INSERT RefreshToken
 └─ Response: { user, accessToken } + Set-Cookie: refresh_token=... (HttpOnly, secure, path=/api/v1/auth)
```

### 3.2 Tạo audit + nhận realtime

```
POST /api/v1/audits {url, mode?, targetKeyword?, maxUrls?}
 ├─ JwtAuthGuard (nếu Public decorator absent)
 ├─ AuditsService.createAudit(userId, dto):
 │    ├─ UrlValidator.safeUrl(url) → chặn 127.x, 10.x, 172.16.x, 192.168.x, IPv6 link-local
 │    ├─ RateLimiter: 5/h/user
 │    ├─ Prisma INSERT Audit (status=pending, mode=single|site)
 │    └─ AuditQueueProducer.enqueueCrawlStart / enqueueSiteCrawlStart
 └─ 201 { auditId, status: 'pending', mode }

Client: new WebSocket('ws://host/ws', { auth: { token: accessJwt } })
 ├─ AuditGateway.handleConnection: verify JWT, lưu client.userId
 └─ client.emit('audit:subscribe', { auditId }) → join room `audit:{auditId}`

Downstream services publish lên Redis:
 ├─ audit.progress → ProgressSubscriber → emit 'audit:progress' tới room
 ├─ audit.completed → UPDATE Audit status=completed + emit 'audit:completed'
 └─ audit.failed    → UPDATE Audit status=failed + emit 'audit:failed'
```

### 3.3 Xuất PDF

```
GET /api/v1/audits/:id/export
 ├─ Check ownership + status=completed
 └─ 302 Redirect → http://report:3004/audits/:id/export
    (Trình duyệt client tự follow redirect, report stream PDF bytes về)
```

---

## 4. API đối ngoại

### 4.1 REST endpoints

Chi tiết đầy đủ request/response xem [21-api-contracts.md §1](21-api-contracts.md). Tóm tắt:

#### Auth (`/api/v1/auth`)

| Method | Path | Guard | Body | Response |
|---|---|---|---|---|
| POST | `/register` | Public | RegisterDto | 201 { user, verifyToken } |
| POST | `/login` | Public | LoginDto | 200 { user, accessToken } + refresh cookie |
| POST | `/refresh` | Public (cookie) | — | 200 { accessToken } + new cookie |
| POST | `/logout` | JWT | — | 204 |
| GET | `/me` | JWT | — | 200 AuthenticatedUser |
| POST | `/verify-email` | Public | { token } | 200 |
| POST | `/forgot-password` | Public | { email } | 200 |
| POST | `/reset-password` | Public | { token, newPassword } | 200 |
| GET | `/google` | GoogleGuard | — | 302 Google OAuth |
| GET | `/google/callback` | GoogleGuard | — | 302 frontend/oauth-success?token=... |

#### Audits (`/api/v1/audits`)

| Method | Path | Guard | Mục đích |
|---|---|---|---|
| POST | `/` | JWT | Tạo audit mới |
| GET | `/` | JWT | List (page, limit, search, status, score, dateFrom/To) |
| GET | `/compare?audit1=&audit2=` | JWT | Diff giữa 2 audit (gRPC Report) |
| GET | `/:id` | JWT | Chi tiết audit (ownership check) |
| GET | `/:id/status` | JWT | Progress cache Redis + DB status |
| DELETE | `/:id` | JWT | Xoá audit (cascade) |
| GET | `/:id/export` | JWT | 302 → report PDF URL |
| POST | `/:id/share` | JWT | Tạo share link (gRPC Report) |
| DELETE | `/:id/share` | JWT | Revoke share link |

#### Users (`/api/v1/users`)

| Method | Path | Guard | Mục đích |
|---|---|---|---|
| PATCH | `/profile` | JWT | Đổi fullName, avatarUrl |
| PATCH | `/password` | JWT | Đổi mật khẩu (verify current) |

#### Admin (`/api/v1/admin`)

Yêu cầu `role=admin`. Dùng `JwtAuthGuard + RolesGuard + @Roles(UserRole.ADMIN)`.

| Method | Path | Mục đích |
|---|---|---|
| GET | `/users?page=&limit=&search=` | List user |
| PATCH | `/users/:id` | Sửa role/isVerified/isLocked |
| GET | `/rules` | List rule (gRPC → analyzer) |
| PUT | `/rules` | Batch update weight (gRPC → analyzer) |
| GET | `/stats?period=30d` | Thống kê tổng hợp |

#### Health & Shared

| Method | Path | Public | Mục đích |
|---|---|---|---|
| GET | `/health` | ✅ | Check 5 service: database, redis, crawler, analyzer, report |
| GET | `/api/v1/shared/audits/:token` | ✅ | Public view qua share token (gRPC → report) |

### 4.2 WebSocket (`/ws` namespace)

**Kết nối:**
```js
const socket = io('ws://localhost:3000/ws', {
  auth: { token: accessJwt }          // JWT access token
});
```

**Authentication** ([audit.gateway.ts](../../apps/gateway/src/infra/websocket/audit.gateway.ts)):
- Lấy token từ `handshake.auth.token` hoặc Authorization header.
- `JwtService.verify(token, JWT_ACCESS_SECRET)`.
- Lưu `client.userId`. Fail → `client.disconnect(true)`.

**Message client → server:**

| Event | Payload | Hành vi |
|---|---|---|
| `audit:subscribe` | `{ auditId: string }` | Join room `audit:{auditId}` |
| `audit:unsubscribe` | `{ auditId: string }` | Leave room |

**Message server → client:**

| Event | Payload | Khi nào gửi |
|---|---|---|
| `audit:progress` | `{ auditId, progress, stage, message? }` | Khi downstream publish `audit.progress` |
| `audit:completed` | `{ auditId, finalScore }` | Khi report publish `report.done` / `audit.completed` |
| `audit:failed` | `{ auditId, error }` | Khi worker fail → publish `audit.failed` |

### 4.3 gRPC clients (gọi ra)

Gateway là **client** gọi tới 3 service:

| Client | Target | Port | File |
|---|---|---|---|
| `CrawlerGrpcClient` | crawler | 50052 | [crawler.client.ts](../../apps/gateway/src/infra/grpc/crawler.client.ts) |
| `AnalyzerGrpcClient` | seo-analyzer | 50053 | [analyzer.client.ts](../../apps/gateway/src/infra/grpc/analyzer.client.ts) |
| `ReportGrpcClient` | report | 50055 | [report.client.ts](../../apps/gateway/src/infra/grpc/report.client.ts) |

Factory: [grpc-client.factory.ts](../../apps/gateway/src/infra/grpc/grpc-client.factory.ts) — load `.proto` từ `@repo/proto`, tạo insecure credentials cho local cluster.

**Use case phổ biến:**
- `ReportGrpcClient.createShareLink(auditId)` → dùng trong `POST /audits/:id/share`.
- `ReportGrpcClient.compareReports(a, b)` → dùng trong `GET /audits/compare`.
- `AnalyzerGrpcClient.listRules()` → dùng trong `GET /admin/rules`.
- `AnalyzerGrpcClient.updateRuleWeight(id, w)` → dùng trong `PUT /admin/rules`.
- `*.isHealthy()` → dùng trong `/health`.

---

## 5. BullMQ producer

Gateway chỉ **push job**, không consume.

### 5.1 Queue `crawl.start`

Enqueue khi `POST /audits` mode = single.

| Field | Giá trị |
|---|---|
| Queue name | `crawl.start` (const `BULLMQ_QUEUES.CRAWL_START`) |
| Job ID | `crawl-{auditId}` (idempotent, chống duplicate) |
| Payload | `{ auditId, url, options?: { targetKeyword? } }` |
| Attempts | 3 |
| Backoff | exponential, 5s initial |
| removeOnComplete | 100 |
| removeOnFail | 500 |

### 5.2 Queue `site-crawl.start`

Enqueue khi `POST /audits` mode = site.

| Field | Giá trị |
|---|---|
| Queue name | `site-crawl.start` |
| Job ID | `site-crawl-{auditId}` |
| Payload | `{ auditId, rootUrl, maxUrls?, targetKeyword? }` |
| Attempts | 2 |
| Backoff | exponential, 5s initial |

Code: [audit-queue.producer.ts](../../apps/gateway/src/audits/services/audit-queue.producer.ts).

---

## 6. Redis pub/sub — Gateway là subscriber

Service [ProgressSubscriberService](../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts) (implement `OnModuleInit`) subscribe 4 channel:

| Channel | Payload | Side effect |
|---|---|---|
| `audit.progress` | `{ auditId, progress, stage, message? }` | Cache `audit:{id}:progress` + `audit:{id}:stage` (1h), emit `audit:progress` |
| `audit.completed` | `{ auditId, finalScore }` | UPDATE `Audit SET status=COMPLETED, seoScore, completedAt`; emit `audit:completed` |
| `audit.failed` | `{ auditId, error? }` | UPDATE `Audit SET status=FAILED, errorMessage`; emit `audit:failed` |
| `report.done` | `{ auditId, finalScore }` | Idempotent guard: chỉ gọi handleCompleted nếu status chưa COMPLETED |

**Tại sao có guard idempotent?** Vì cả `audit.completed` lẫn `report.done` đều được publish ở bước cuối (xem [05-report.md](05-report.md) §5), nếu gateway xử lý cả 2 thì Audit row có thể bị update hai lần. Guard đảm bảo chỉ commit một lần.

---

## 7. Mô hình dữ liệu

Database `seo_gateway` (Postgres 16). Schema: [apps/gateway/prisma/schema.prisma](../../apps/gateway/prisma/schema.prisma).

### 7.1 Enum

```prisma
enum UserRole     { user, admin }
enum AuditStatus  { pending, crawling, analyzing, reporting, completed, failed }
enum AuditMode    { single, site }
```

### 7.2 Bảng

| Bảng | Mục đích | Khoá / Index nổi bật |
|---|---|---|
| `User` | Tài khoản | unique `email`, role, isVerified, isLocked, oauthProvider, avatarUrl |
| `RefreshToken` | Refresh token session | FK `userId`, hashed `tokenHash`, `userAgent`, `ipAddress`, `expiresAt`, `isRevoked`; index on userId, tokenHash, expiresAt |
| `Audit` | Một lượt audit | FK `userId`, `url`, `domain`, `status`, `mode`, `seoScore (5,2)`, `targetKeyword`, `errorMessage`, indexes `(userId, createdAt DESC)`, `(domain)`, `(status)` |
| `PageAudit` | Kết quả mỗi URL trong site-audit | FK `auditId`, `url`, `score`, `issues` (JsonB), `fetchedAt`; index `(auditId)`, `(score)` |

**Relation:** `User 1–N Audit`, `Audit 1–N PageAudit`. Cascade delete từ User → Audit → PageAudit.

### 7.3 Cân nhắc thiết kế

- **`seoScore` dùng Decimal(5,2)** chứ không Float để không bị sai số khi so sánh / aggregate.
- **`issues` JsonB** trong `PageAudit` giữ mảng `{ ruleId, category, severity }` không normalize — chấp nhận trade-off để query nhanh và vì site-audit có thể có hàng trăm URL × 20 rule.
- **Không FK cross-DB**: `auditId` trong bảng `RuleResult` (seo_analyzer DB) và `Report` (seo_report DB) đều không có FK về `Audit` (seo_gateway DB). Ràng buộc referential được bảo đảm ở tầng ứng dụng.

> ERD đầy đủ xem [20-data-model.md](20-data-model.md).

---

## 8. Bảo mật

### 8.1 Authentication

| Lớp | Thực hiện | Chi tiết |
|---|---|---|
| Password hash | bcrypt cost 12 | `password.service.ts` — ~250ms/hash |
| Access JWT | HS256 + `JWT_ACCESS_SECRET` | TTL 15 phút, payload `{sub, email, role}` |
| Refresh token | 48 byte random, SHA-256 hash | TTL 7 ngày, rotation mỗi lần dùng, lưu userAgent + IP |
| Cookie | HttpOnly, Secure (prod), SameSite=lax | Path `/api/v1/auth` — không lộ cho JS khác |
| OAuth | Google OAuth 2.0 | Passport strategy, upsert user với `oauthProvider=google` |
| Email verify | Token Redis ~1h TTL | Yêu cầu trước khi login |

### 8.2 Authorization

- `@Public()` decorator: route bỏ qua `JwtAuthGuard`.
- `@Roles(UserRole.ADMIN)` + `RolesGuard`: check role trong JWT payload.
- Ownership check in-service: `AuditsService.getAuditDetail` so sánh `audit.userId === currentUser.id`, admin bypass.

### 8.3 SSRF (URL Validator)

File: [apps/gateway/src/common/utils/url-validator.ts](../../apps/gateway/src/common/utils/url-validator.ts).

4 lớp check:
1. **Scheme**: chỉ `http:` và `https:`.
2. **Literal block**: `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `::`, `metadata.google.internal`.
3. **IP literal**: nếu hostname là IP, `assertPublicIp(ip)` trực tiếp.
4. **DNS rebinding**: resolve tên miền → TẤT CẢ A/AAAA record → validate từng IP.

`assertPublicIp` chặn: IPv4 `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `0.0.0.0/8`; IPv6 `::1`, `::`, `fc00::/7`, `fe80::/10`.

### 8.4 Rate limit (sliding window qua Redis ZSET)

File: [rate-limiter.service.ts](../../apps/gateway/src/infra/redis/rate-limiter.service.ts).

| Operation | Limit | Window | Bucket key |
|---|---|---|---|
| Register | 1 | 3600s | `rate_limit:register:{ip}` |
| Login | 5 | 900s | `rate_limit:login:{email}` |
| Audit create | 5 | 3600s | `rate_limit:audits:{userId}` |

Vượt limit → `403 Forbidden` với message tiếng Việt `"Đã đạt giới hạn X. Thử lại sau {retryAfter}s"`.

### 8.5 Middleware bảo mật

- `helmet({ contentSecurityPolicy: false })` — CSP tắt vì Swagger UI dùng inline script; bật trong prod qua env.
- `cookieParser()`.
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` — strip field lạ, convert type.
- CORS: origin = `FRONTEND_URL` env, `credentials: true`.

---

## 9. Cấu hình

File [`apps/gateway/.env.example`](../../apps/gateway/.env.example) (một số biến quan trọng):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `NODE_ENV` | development | Prod bật Secure cookies, tắt Swagger (tuỳ cấu hình) |
| `PORT` | 3000 | HTTP listen |
| `FRONTEND_URL` | `http://localhost:3001` | CORS + OAuth redirect base |
| `GATEWAY_DATABASE_URL` | *(bắt buộc)* | Postgres connection |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ + pub/sub + rate limiter |
| `JWT_ACCESS_SECRET` | *(bắt buộc, 32+ bytes)* | Sign access token |
| `JWT_REFRESH_SECRET` | *(reserved)* | Tương lai nếu dùng JWT cho refresh |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_CALLBACK_URL` | optional | Bật Google OAuth nếu có |
| `CRAWLER_GRPC_URL` | `localhost:50052` | gRPC target |
| `ANALYZER_GRPC_URL` | `localhost:50053` | gRPC target |
| `REPORT_GRPC_URL` | `localhost:50055` | gRPC target |
| `REPORT_HTTP_URL` | `http://localhost:3004` | PDF redirect base |

**Validation:** bắt buộc đọc qua `config.getOrThrow('JWT_ACCESS_SECRET')` → crash sớm nếu thiếu thay vì âm thầm fail sau.

---

## 10. Khởi động

File [`apps/gateway/src/main.ts`](../../apps/gateway/src/main.ts) — trình tự bootstrap:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: configService.get('FRONTEND_URL'), credentials: true });

  // Swagger
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()...);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();
  await app.listen(port);
}
```

**Khởi động trong Docker:**
- Dockerfile multi-stage build → image ~400 MB (bao gồm Prisma client generated).
- `docker-entrypoint.sh` chạy `prisma migrate deploy` trước khi start.
- Healthcheck: `curl -f http://localhost:3000/health` mỗi 30s.

---

## 11. File tham chiếu quan trọng

| File | Mục đích |
|---|---|
| [src/main.ts](../../apps/gateway/src/main.ts) | Bootstrap, Swagger, middleware |
| [src/app.module.ts](../../apps/gateway/src/app.module.ts) | Root module, global guards/filters |
| [src/auth/auth.module.ts](../../apps/gateway/src/auth/auth.module.ts) | Auth wiring |
| [src/auth/controllers/auth.controller.ts](../../apps/gateway/src/auth/controllers/auth.controller.ts) | 10 endpoint auth |
| [src/auth/services/token.service.ts](../../apps/gateway/src/auth/services/token.service.ts) | JWT + refresh rotation |
| [src/auth/guards/jwt-auth.guard.ts](../../apps/gateway/src/auth/guards/jwt-auth.guard.ts) | Global JWT guard |
| [src/auth/guards/roles.guard.ts](../../apps/gateway/src/auth/guards/roles.guard.ts) | Role-based access |
| [src/audits/controllers/audits.controller.ts](../../apps/gateway/src/audits/controllers/audits.controller.ts) | 9 endpoint audit |
| [src/audits/services/audits.service.ts](../../apps/gateway/src/audits/services/audits.service.ts) | Business logic audit |
| [src/audits/services/audit-queue.producer.ts](../../apps/gateway/src/audits/services/audit-queue.producer.ts) | BullMQ enqueue |
| [src/admin/controllers/admin.controller.ts](../../apps/gateway/src/admin/controllers/admin.controller.ts) | Admin panel endpoints |
| [src/infra/websocket/audit.gateway.ts](../../apps/gateway/src/infra/websocket/audit.gateway.ts) | WebSocket auth + rooms |
| [src/infra/websocket/progress-subscriber.service.ts](../../apps/gateway/src/infra/websocket/progress-subscriber.service.ts) | Redis → WebSocket bridge |
| [src/infra/grpc/grpc-client.factory.ts](../../apps/gateway/src/infra/grpc/grpc-client.factory.ts) | Load proto + tạo client |
| [src/infra/grpc/report.client.ts](../../apps/gateway/src/infra/grpc/report.client.ts) | Report gRPC wrapper (7 RPC) |
| [src/infra/redis/rate-limiter.service.ts](../../apps/gateway/src/infra/redis/rate-limiter.service.ts) | Sliding window ZSET |
| [src/common/utils/url-validator.ts](../../apps/gateway/src/common/utils/url-validator.ts) | SSRF defence |
| [src/common/filters/all-exceptions.filter.ts](../../apps/gateway/src/common/filters/all-exceptions.filter.ts) | RFC 7807 error shape |
| [prisma/schema.prisma](../../apps/gateway/prisma/schema.prisma) | Data model |

---

## 12. Điểm nâng cấp khả dĩ

> Các ý sau không nằm trong scope đồ án nhưng nên nhận ra khi review:

- **JWT refresh**: hiện dùng opaque random token + SHA-256 hash trong DB. Có thể đổi sang JWT signed để stateless, tránh DB lookup — trade-off: revocation khó.
- **Rate limit**: sliding window qua ZSET tốt nhưng tốn memory khi traffic lớn. Production có thể dùng token bucket Lua script hoặc RedisCell module.
- **WebSocket scale**: Socket.IO single-node. Nếu scale horizontal cần Redis adapter (`socket.io-redis`).
- **Audit list**: pagination offset/limit. Nếu dữ liệu lớn, chuyển sang cursor-based (keyset) để tránh OFFSET chậm.
- **Email service**: hiện `forgot-password` chỉ tạo token Redis, chưa gửi email thật. Cần integrate SendGrid/Resend.
- **OpenAPI**: Swagger ok cho dev, nhưng có thể auto-gen TypeScript SDK cho frontend (bằng `openapi-typescript`) để giảm duplicate type.

---

## 13. Đi tiếp

- Hiểu downstream crawler → [02-crawler.md](02-crawler.md)
- Thiết kế UI tiêu thụ các endpoint → [31-page-specs.md](31-page-specs.md)
- Tra full contract → [21-api-contracts.md](21-api-contracts.md)
