# Subscriptions + VietQR — Design Spec

> **Status**: Draft (awaiting user review)
> **Date**: 2026-05-20
> **Branch**: `feat/subscriptions-vietqr`
> **Owner**: Phạm Trọng Tuấn Nghĩa (đồ án tốt nghiệp)
> **Scope tier**: Large (proto-breaking: no · ≥2 apps touched: yes · Prisma migration: yes)

---

## 1. Mục tiêu

Thêm hệ thống **subscription 3 tier** (Free / Pro 99k / Business 299k VND/tháng) cho SEO Analysis Platform, với thanh toán thực qua **VietQR + Casso webhook**. Hệ thống phải:

- Phân hóa quota theo plan trên 10 dimension đã đồng thuận (audit/tháng, site-mode, scheduled, API key, AI calls, PDF, share, alert, retention, priority queue).
- Cho phép user **tự nâng cấp** bằng VietQR (Casso đối soát tự động).
- Cho phép **admin tay đổi plan** user (để demo + thầy cô trải nghiệm Pro/Business).
- Hết hạn tự rớt về Free, data vẫn giữ theo retention.
- Có UI đầy đủ: pricing page, upgrade flow, billing page, admin override, banner gia hạn, quota-exceeded CTA.

**Non-goals (YAGNI)**: yearly cycle, prorate, trial, invoice PDF, refund flow, AI credit pack, Telegram alert, multi-currency, team/multi-seat.

---

## 2. Quyết định đã chốt

| ID | Câu hỏi | Quyết định |
|---|---|---|
| Q1 | Phạm vi | (b) MVP demo + payment thật (VietQR) |
| Q2 | Cơ chế đối soát | (a) Casso webhook |
| Q3 | Số tier + giá | (a) Free 0đ / Pro 99k VND / Business 299k VND |
| Q4 | Quota matrix | (a) 10 dimension đầy đủ — xem §6 |
| Q5 | Cycle | (a) Monthly pay-per-period |
| Q5 | Trial | (t1) Không trial — Free là "trial vĩnh viễn" |
| Q6.I | User cũ | (i1) Tất cả về Free |
| Q6.II | FE scope | (f2) Đầy đủ — pricing + upgrade + billing + admin + banner + quota CTA |
| Q6.III | Admin override | (a1) Có |
| Approach | Kiến trúc | **Approach 1 — Embedded trong gateway service** (không tách microservice riêng) |

Bối cảnh: đồ án tốt nghiệp HCMUS, cost target < $40/tháng, tài khoản nhận tiền là tài khoản cá nhân của tác giả (demo).

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│  apps/web (Next.js)                                              │
│  - /pricing (public)                                             │
│  - /billing, /billing/upgrade, /billing/checkout/[intentId]      │
│  - /admin/subscriptions                                          │
│  - VietQrDisplay, ExpiryBanner, QuotaExceededDialog              │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP + Socket.IO
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  apps/gateway  (NestJS, +1 feature module: billing/)             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ billing/                                                 │    │
│  │  ├─ controllers/  (plans, subscriptions, intents,        │    │
│  │  │                 casso-webhook)                        │    │
│  │  ├─ services/     (plans, subscription, entitlement,     │    │
│  │  │                 quota-counter, payment-intent,        │    │
│  │  │                 casso-reconciler, expiry.cron)        │    │
│  │  ├─ domain/       (plan-features, feature-flags, errors) │    │
│  │  └─ dto/                                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  common/                                                         │
│  ├─ decorators/  @RequireFeature  @RequireQuota                  │
│  └─ guards/      PlanGuard  QuotaGuard                           │
│                                                                  │
│  infra/redis/     RateLimiterService (extended with monthly)     │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Prisma
                           ▼
┌──────────────────────────────────────────┐    ┌─────────────────┐
│  Postgres: seo_gateway                   │    │  Redis           │
│  +tables: plans, subscriptions,          │    │  +keys: quota:   │
│           payment_intents, casso_events  │    │   {uid}:{dim}:   │
│  +column: User.subscription (relation)   │    │   {YYYY-MM}      │
└──────────────────────────────────────────┘    └─────────────────┘
                                                         ▲
                                                         │ publish
                                                         │ "billing.confirmed"
                                                         │
                  ┌──────────────────────────────────────┘
                  │
            Webhook HTTPS
                  │
┌─────────────────┴────────────────────┐
│  Casso (third-party)                  │
│  detect bank txn → POST /webhooks/    │
│                       casso           │
└───────────────────────────────────────┘
```

**Architecture rules được tôn trọng**:
- Service boundary = DB boundary: subscription thuộc cùng aggregate `User` → ở cùng `seo_gateway`.
- Inter-service: không thêm gRPC call mới (zero impact lên crawler/seo-analyzer/keyword/report).
- Chỉ gateway expose HTTP công khai → webhook chỉ tới gateway.
- Plan + features định nghĩa song song: **giá + tên hiển thị ở DB** (admin chỉnh được), **quota cứng + feature flags ở code** (type-safe).

---

## 4. Module structure (`apps/gateway/src/billing/`)

```
apps/gateway/src/billing/
├── billing.module.ts
├── controllers/
│   ├── plans.controller.ts            # GET /api/v1/plans (public)
│   ├── subscriptions.controller.ts    # GET /me/subscription, POST /cancel
│   ├── payment-intents.controller.ts  # POST /payment-intents, GET /payment-intents/:id
│   └── casso-webhook.controller.ts    # POST /webhooks/casso (Public + HMAC verify)
├── services/
│   ├── plans.service.ts
│   ├── subscription.service.ts
│   ├── entitlement.service.ts         # canUserDo(userId, action, ctx)
│   ├── quota-counter.service.ts       # monthly Redis counters
│   ├── payment-intent.service.ts
│   ├── casso-reconciler.service.ts
│   └── expiry.cron.ts                 # @Cron daily 00:05
├── domain/
│   ├── plan-features.ts               # PLAN_FEATURES const
│   ├── feature-flags.ts               # enum FeatureFlag
│   └── billing.errors.ts              # FeatureNotAvailable, QuotaExceeded, ...
└── dto/
```

Shared infra mới (dùng ngoài billing module):
- `apps/gateway/src/common/decorators/require-feature.decorator.ts`
- `apps/gateway/src/common/decorators/require-quota.decorator.ts`
- `apps/gateway/src/common/guards/plan.guard.ts`
- `apps/gateway/src/common/guards/quota.guard.ts`

Shared package (xuyên service nếu sau này cần):
- `packages/shared/src/plans.ts` — `FeatureFlag` enum + `PLAN_FEATURES` const + types.

---

## 5. Database schema (Prisma migration)

**File**: `apps/gateway/prisma/migrations/<timestamp>_add_subscriptions/migration.sql`

```prisma
enum PlanCode { free pro business }
enum SubscriptionStatus { active expired canceled }
enum PaymentIntentStatus { pending paid expired failed }

model Plan {
  code         PlanCode @id
  displayName  String   @db.VarChar(50)
  priceVnd     Int      @map("price_vnd")
  sortOrder    Int      @default(0) @map("sort_order")
  isPublic     Boolean  @default(true) @map("is_public")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz
  subscriptions Subscription[]
  @@map("plans")
}

model Subscription {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String              @unique @map("user_id") @db.Uuid
  planCode        PlanCode            @map("plan_code")
  status          SubscriptionStatus  @default(active)
  startedAt       DateTime            @default(now()) @map("started_at") @db.Timestamptz
  expiresAt       DateTime?           @map("expires_at") @db.Timestamptz
  canceledAt      DateTime?           @map("canceled_at") @db.Timestamptz
  grantedBy       String?             @map("granted_by") @db.Uuid
  createdAt       DateTime            @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime            @updatedAt @map("updated_at") @db.Timestamptz
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan            Plan                @relation(fields: [planCode], references: [code])
  paymentIntents  PaymentIntent[]
  @@index([expiresAt, status], name: "idx_sub_expiry")
  @@map("subscriptions")
}

model PaymentIntent {
  id             String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String               @map("user_id") @db.Uuid
  subscriptionId String?              @map("subscription_id") @db.Uuid
  planCode       PlanCode             @map("plan_code")
  amountVnd      Int                  @map("amount_vnd")
  refCode        String               @unique @map("ref_code") @db.VarChar(40)
  status         PaymentIntentStatus  @default(pending)
  vietqrUrl      String               @map("vietqr_url") @db.Text
  cassoTxnId     String?              @map("casso_txn_id") @db.VarChar(64)
  paidAt         DateTime?            @map("paid_at") @db.Timestamptz
  expiresAt      DateTime             @map("expires_at") @db.Timestamptz
  createdAt      DateTime             @default(now()) @map("created_at") @db.Timestamptz
  user           User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription   Subscription?        @relation(fields: [subscriptionId], references: [id])
  @@index([refCode], name: "idx_pi_ref")
  @@index([userId, status], name: "idx_pi_user_status")
  @@map("payment_intents")
}

model CassoEvent {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cassoTxnId       String   @unique @map("casso_txn_id") @db.VarChar(64)
  payload          Json     @db.JsonB
  matched          Boolean  @default(false)
  matchedIntentId  String?  @map("matched_intent_id") @db.Uuid
  receivedAt       DateTime @default(now()) @map("received_at") @db.Timestamptz
  @@index([receivedAt], name: "idx_casso_recv")
  @@map("casso_events")
}

model User {
  // ... existing fields
  subscription Subscription?
}
```

**Quota counters không cần bảng SQL**: dùng key Redis
```
quota:{userId}:{dimension}:{YYYY-MM}   TTL = 32 days
```
Cleanup tự động bằng TTL. Source of truth là Redis cho hot path; nếu cần historical rollup, dùng `UsageDaily` (đã có).

---

## 6. Plan + feature matrix (`packages/shared/src/plans.ts`)

```typescript
export enum FeatureFlag {
  SITE_AUDIT = 'site_audit',
  SCHEDULED_AUDIT = 'scheduled_audit',
  API_KEY = 'api_key',
  AI_SUGGESTIONS = 'ai_suggestions',
  PDF_EXPORT = 'pdf_export',
  SHARE_LINK = 'share_link',
  EMAIL_ALERT = 'email_alert',
  PRIORITY_QUEUE = 'priority_queue',
}

export type QuotaDimension =
  | 'audits_monthly'
  | 'site_audit_max_pages'
  | 'scheduled_audits_max'
  | 'scheduled_audit_min_interval_min'
  | 'api_keys_max'
  | 'api_calls_daily'
  | 'ai_calls_monthly'
  | 'history_retention_days';

export interface PlanDefinition {
  audits_monthly: number;
  site_audit_max_pages: number;
  scheduled_audits_max: number;
  scheduled_audit_min_interval_min: number;
  api_keys_max: number;
  api_calls_daily: number;
  ai_calls_monthly: number;
  history_retention_days: number;   // -1 = unlimited
  features: FeatureFlag[];
}

export const PLAN_FEATURES: Record<'free' | 'pro' | 'business', PlanDefinition> = {
  free: {
    audits_monthly: 10,
    site_audit_max_pages: 0,
    scheduled_audits_max: 0,
    scheduled_audit_min_interval_min: 1440,
    api_keys_max: 0,
    api_calls_daily: 0,
    ai_calls_monthly: 0,
    history_retention_days: 7,
    features: [],
  },
  pro: {
    audits_monthly: 200,
    site_audit_max_pages: 200,
    scheduled_audits_max: 5,
    scheduled_audit_min_interval_min: 1440,
    api_keys_max: 1,
    api_calls_daily: 1000,
    ai_calls_monthly: 100,
    history_retention_days: 90,
    features: [
      FeatureFlag.SITE_AUDIT,
      FeatureFlag.SCHEDULED_AUDIT,
      FeatureFlag.API_KEY,
      FeatureFlag.AI_SUGGESTIONS,
      FeatureFlag.PDF_EXPORT,
      FeatureFlag.SHARE_LINK,
      FeatureFlag.EMAIL_ALERT,
    ],
  },
  business: {
    audits_monthly: 1000,
    site_audit_max_pages: 2000,
    scheduled_audits_max: 30,
    scheduled_audit_min_interval_min: 15,
    api_keys_max: 5,
    api_calls_daily: 20_000,
    ai_calls_monthly: 1000,
    history_retention_days: -1,
    features: [
      FeatureFlag.SITE_AUDIT,
      FeatureFlag.SCHEDULED_AUDIT,
      FeatureFlag.API_KEY,
      FeatureFlag.AI_SUGGESTIONS,
      FeatureFlag.PDF_EXPORT,
      FeatureFlag.SHARE_LINK,
      FeatureFlag.EMAIL_ALERT,
      FeatureFlag.PRIORITY_QUEUE,
    ],
  },
};

export const PLAN_DISPLAY_NAMES_VI = {
  free: 'Cá nhân',
  pro: 'Chuyên nghiệp',
  business: 'Doanh nghiệp',
} as const;

export const PLAN_PRICES_VND = {
  free: 0,
  pro: 99_000,
  business: 299_000,
} as const;
```

**Invariant**: với mọi quota numeric dimension, `Free < Pro < Business` (test trong unit spec).

---

## 7. Enforcement (3 lớp)

### 7.1 `PlanGuard` (feature-flag check)

```typescript
@Post('site-crawl')
@UseGuards(JwtAuthGuard, PlanGuard)
@RequireFeature(FeatureFlag.SITE_AUDIT)
async siteAudit() { ... }
```

→ 403 `FEATURE_NOT_AVAILABLE` nếu `currentPlan.features` không chứa flag.

### 7.2 `QuotaGuard` (counter check + increment)

```typescript
@Post('audits')
@UseGuards(JwtAuthGuard, QuotaGuard)
@RequireQuota('audits_monthly', { increment: 1 })
async createAudit() { ... }
```

→ 429 `QUOTA_EXCEEDED` + header `X-Quota-Reset: <ISO date>` = đầu tháng sau.
- Increment thực hiện **trước** controller handler chạy (fail-closed).
- Nếu controller handler throw exception, **không rollback** counter (đơn giản, đồng nhất với pattern RateLimiterService hiện có; chấp nhận overcount nhẹ trong corner case).

### 7.3 `EntitlementService` (logic động)

Dùng cho check phức tạp không decorator hóa được (vd `scheduled-audit` cần check cả `scheduled_audits_max` + `scheduled_audit_min_interval_min`):

```typescript
const decision = await entitlement.check(userId, 'scheduled_audit.create', { cron: '0 */1 * * *' });
if (!decision.allowed) throw new ForbiddenException({ code: decision.code, reason: decision.reason });
```

---

## 8. VietQR + Casso payment flow

### 8.1 Sequence

```
FE                        Gateway BE                        Casso
 │                          │                                 │
 │ POST /payment-intents    │                                 │
 │ { planCode: "pro" }      │                                 │
 │─────────────────────────▶│                                 │
 │                          │ - validate (no active Pro/Biz)  │
 │                          │ - refCode = "SEO" + base32(5)   │
 │                          │ - INSERT payment_intent         │
 │                          │ - build vietqrUrl               │
 │ { intentId, refCode,     │                                 │
 │   vietqrUrl, expiresAt } │                                 │
 │◀─────────────────────────│                                 │
 │                          │                                 │
 │ socket.join              │                                 │
 │ `billing:{intentId}`     │                                 │
 │                          │                                 │
 │ (user quét QR + chuyển)  │                                 │
 │                          │                                 │
 │                          │      Bank confirms ~30-120s     │
 │                          │                                 │
 │                          │   POST /webhooks/casso          │
 │                          │   {tid, amount, description,...}│
 │                          │◀────────────────────────────────│
 │                          │                                 │
 │                          │ - verify HMAC                   │
 │                          │ - INSERT casso_events (UNIQUE   │
 │                          │   on tid → idempotent)          │
 │                          │ - parse refCode from desc       │
 │                          │ - find pending intent by ref +  │
 │                          │   amount                        │
 │                          │ - TRANSACTION:                  │
 │                          │     update intent → paid        │
 │                          │     upsert Subscription         │
 │                          │ - redis.publish                 │
 │                          │   'billing.confirmed'           │
 │                          │      → Socket.IO emit            │
 │ ws: billing:confirmed    │                                 │
 │◀─────────────────────────│                                 │
 │ navigate /billing?paid=1 │                                 │
```

### 8.2 VietQR URL build

Dùng `vietqr.io` free image API:

```
https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NO}-compact2.jpg?amount={amount}&addInfo={refCode}&accountName={URL-encoded-name}
```

`BANK_BIN` + `ACCOUNT_NO` + `ACCOUNT_NAME` lấy từ env. `compact2` template hiển thị logo bank + STK + số tiền + nội dung.

### 8.3 Casso webhook verification

Header `Secure-Token` chứa secret cố định Casso gửi (theo doc Casso). So sánh bằng `crypto.timingSafeEqual` với `CASSO_WEBHOOK_SECRET`. Reject 401 nếu sai.

### 8.4 Idempotency

- DB layer: `casso_events.casso_txn_id` UNIQUE constraint → duplicate webhook tự reject ở INSERT.
- Code layer: catch `P2002` (Prisma unique violation) → return 200 (Casso không retry).

### 8.5 Edge cases (handle list)

| Tình huống | Behavior |
|---|---|
| Webhook đến trước khi user tạo intent | `casso_events.matched=false`; lưu lại; admin xem dashboard |
| Webhook duplicate (cùng tid) | UNIQUE chặn; 200 OK |
| Amount khác `amountVnd` của intent | Không match; lưu unmatched; log warning |
| RefCode trong description sai format | Regex không khớp → unmatched; log |
| Intent expired trước khi webhook đến | Không match (status != pending); admin có quyền force-match qua admin UI |
| User tạo intent thứ 2 khi intent 1 còn pending | 409 `INTENT_ALREADY_EXISTS` + return intent cũ |
| User upgrade Pro → Business giữa kỳ | Tạo intent Business 299k; activate → Subscription mới (planCode=business, expiresAt=NOW+30d); **không prorate** (giữ tinh thần pay-per-period); thời gian Pro còn lại bị overwrite |

### 8.6 RefCode format

`SEO[A-Z2-7]{5}` (8 ký tự total: "SEO" + 5 chars base32 RFC 4648 alphabet without confusables 0/1/8/9). Va chạm xác suất ~ 1/32^5 ≈ 1/33M; UNIQUE index trong DB là last-line defense.

---

## 9. Admin override

Endpoint: `POST /api/v1/admin/subscriptions` (`@Roles('admin')`)

Body:
```json
{ "userId": "<uuid>", "planCode": "pro", "days": 30 }
```

Behavior: upsert `Subscription { userId, planCode, status='active', expiresAt=NOW+days, grantedBy=<admin-user-id> }`. Gửi email tùy chọn (optional, behind flag).

UI billing của user hiển thị "Cấp bởi admin (không qua thanh toán)" khi `grantedBy IS NOT NULL` — minh bạch cho user.

---

## 10. Cron jobs

**File**: `apps/gateway/src/billing/services/expiry.cron.ts`

`@Cron('5 0 * * *', { name: 'subscription-expiry' })` chạy hàng ngày 00:05:

```sql
UPDATE subscriptions
SET status = 'expired', updated_at = NOW()
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

-- Sau đó upsert lại Free cho các user vừa expire
INSERT INTO subscriptions (user_id, plan_code, status, started_at)
SELECT user_id, 'free', 'active', NOW() FROM ... WHERE expired_at_step_above;
```

Implementation: 1 transaction Prisma, dùng `$transaction(async tx => ...)`.

**Cron 2 — Reminder email**: `@Cron('0 9 * * *', { name: 'expiry-reminder' })` — gửi email nhắc khi `expires_at - NOW() BETWEEN 0 AND 3 days`. Cần infra email; nếu chưa có, log warning + để banner UI làm reminder chính.

---

## 11. Frontend (`apps/web`)

### 11.1 Routes

```
(marketing)/pricing/page.tsx                          # Public, so sánh 3 tier
(dashboard)/billing/page.tsx                          # "Gói của tôi" + history
(dashboard)/billing/upgrade/page.tsx                  # Chọn plan (vào từ banner / CTA)
(dashboard)/billing/checkout/[intentId]/page.tsx      # QR + countdown + listen socket
(dashboard)/admin/subscriptions/page.tsx              # Admin grant/extend/revoke
```

### 11.2 Components

```
components/billing/
├── PlanCard.tsx
├── PlanComparisonTable.tsx
├── VietQrDisplay.tsx           # countdown 30:00 + auto-refresh + socket listener
├── PlanStatusBadge.tsx
├── ExpiryBanner.tsx            # mount ở dashboard layout
├── QuotaExceededDialog.tsx     # global axios interceptor trigger
└── PaymentSuccessConfetti.tsx
```

### 11.3 State / hooks

| Hook | Mô tả |
|---|---|
| `useSubscription()` | TanStack Query, key `['me', 'subscription']`, staleTime 5min |
| `usePlans()` | TanStack Query, key `['plans']`, staleTime 1h |
| `useCreatePaymentIntent()` | Mutation; onSuccess → router.push(`/billing/checkout/${id}`) |
| `usePaymentIntentStatus(id)` | Socket.IO listener + polling fallback (10s); resolves on `status=paid` |
| `useQuotaError()` | Axios interceptor: 429/403 with quota codes → open `QuotaExceededDialog` |

### 11.4 Error UI map

| HTTP / code | UI |
|---|---|
| 401 `UNAUTHENTICATED` | redirect /auth/login |
| 403 `FEATURE_NOT_AVAILABLE` | `QuotaExceededDialog` với feature name |
| 429 `QUOTA_EXCEEDED` | `QuotaExceededDialog` + reset date |
| 409 `INTENT_ALREADY_EXISTS` | redirect tới intent cũ |
| QR expired (poll) | render "Mã hết hạn" + nút "Tạo mã mới" |

---

## 12. Configuration

`.env.docker.example` thêm:

```
# VietQR
VIETQR_BANK_BIN=970422
VIETQR_ACCOUNT_NO=
VIETQR_ACCOUNT_NAME=

# Casso
CASSO_WEBHOOK_SECRET=
CASSO_WEBHOOK_PATH=/api/v1/webhooks/casso

# Billing
BILLING_INTENT_TTL_MINUTES=30
BILLING_SUBSCRIPTION_DAYS=30
BILLING_FEATURE_ENABLED=false
```

`BILLING_FEATURE_ENABLED=false` → guards chỉ log không enforce → an toàn cho rollout dần.

---

## 13. Testing

### 13.1 Unit (`apps/gateway/test/unit/billing/`)

- `plan-features.spec.ts` — invariant Free < Pro < Business cho mọi quota numeric.
- `entitlement.service.spec.ts` — `canUserDo` cho mọi action × plan.
- `quota-counter.service.spec.ts` — Redis counter monthly key + reset.
- `casso-reconciler.service.spec.ts` — refCode regex, amount match, idempotency 2× cùng tid.
- `payment-intent.service.spec.ts` — VietQR URL build, refCode collision (mock crypto), expiry.
- `subscription.service.spec.ts` — activate, expire, cancel, admin grant.
- `expiry.cron.spec.ts` — đúng ngày downgrade về Free.

### 13.2 Integration (`apps/gateway/test/integration/billing.e2e-spec.ts`)

- Full happy path: create intent → mock webhook fire → sub active → quota refresh.
- Webhook token verify: header `Secure-Token` sai → 401; đúng → 200.
- Concurrent webhook race: 2× cùng tid → chỉ 1 sub active.
- Admin grant → `grantedBy` đúng admin id.
- Quota: Free user gọi audit thứ 11 trong tháng → 429.

### 13.3 E2E (`apps/web/tests/e2e/billing.spec.ts`, Playwright)

- /pricing → click Pro → require login → đăng nhập → /billing/checkout/[id] → QR hiển thị.
- Mock Casso webhook gửi tới gateway → server emit socket → page auto-redirect /billing → Pro badge hiện.
- Admin grant flow.

### 13.4 Smoke (extend `npm run e2e:smoke`)

- Free user, tạo 11 audit → audit thứ 11 phải 429.
- Pro user (granted by admin), tạo site-audit 100 pages → 200.

Target: coverage ≥80% cho `apps/gateway/src/billing/`.

---

## 14. Rollout plan

1. **Migration**: tạo bảng + seed 3 Plan + backfill Subscription Free cho mọi user hiện hữu (cùng 1 migration, transaction).
2. Deploy gateway với `BILLING_FEATURE_ENABLED=false` → guards log only.
3. Deploy web (UI mới nhưng `/billing` page disable nếu env flag false).
4. Test manual: tạo Casso sandbox account, đăng ký bank, chuyển 1k thử.
5. Bật `BILLING_FEATURE_ENABLED=true`.
6. Demo cho thầy cô: admin grant Pro cho 1 account → screenshot vào báo cáo.

---

## 15. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Casso không cấp tài khoản sandbox kịp | Medium | Mock provider behind interface (`PaymentReconcilerProvider`); thay thật khi sẵn sàng. |
| User chuyển khoản nhưng quên ghi refCode | Low | UI nhấn mạnh "BẮT BUỘC ghi đúng nội dung"; giao dịch lạc → admin reconcile tay. |
| Webhook delay > intent TTL (30min) | Low | Tăng TTL lên 60min nếu cần; admin force-match nếu giao dịch về trễ. |
| Bank tạm dừng dịch vụ → webhook không về | Low | Banner báo "Đang xử lý" + nút "Liên hệ admin". |
| User tạo Subscription qua admin route mà chưa có Plan trong DB | Low | Foreign key constraint + seed Plan trong migration → chặn ở DB. |
| Logic feature flag bị bypass do quên `@UseGuards` | Medium | Lint rule + integration test gọi tất cả endpoint cần gate xem có 403 với Free user. |

---

## 16. Out-of-scope (note cho phase sau)

- Yearly billing cycle + prorate
- Invoice PDF + email
- Refund flow
- AI credit pack (one-time purchase)
- Telegram/Slack notify admin về giao dịch lạc
- Multi-currency / USD
- Team / multi-seat
- Auto-renew via stored payment method (cần Stripe, không phải VietQR)

---

## 17. Tham chiếu

- `apps/CLAUDE.md` — cross-service map
- `apps/gateway/CLAUDE.md` — gateway DDD layout
- `apps/gateway/prisma/schema.prisma` — existing User/Audit/ApiKey/UsageDaily/ScheduledAudit
- `packages/shared/src/index.ts` — `RATE_LIMIT`, `PUBLIC_API_RATE_LIMITS`, `SITE_CRAWL_LIMITS`
- `apps/gateway/src/infra/redis/rate-limiter.service.ts` — pattern hiện có sẽ extend
- `apps/gateway/src/public-api/services/public-api-rate-limit.service.ts` — pattern public-API rate limit
- `docs/seo-tool-strategy.md` (lines 1820-1828) — draft pricing ban đầu (đã được hoàn thiện trong spec này)
- Casso docs: https://docs.casso.vn/
- VietQR generator: https://vietqr.io/
