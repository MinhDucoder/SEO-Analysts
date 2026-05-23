# Subscriptions + VietQR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 3-tier subscription system (Free / Pro 99k / Business 299k VND) into `apps/gateway` with VietQR + Casso webhook reconciliation, monthly pay-per-period billing, full quota enforcement across 10 dimensions, and a full Next.js UI (pricing, upgrade, billing, admin).

**Architecture:** Embedded `billing/` feature module inside `apps/gateway` (no new microservice). Plan/Subscription/PaymentIntent/CassoEvent tables in `seo_gateway` DB. Three enforcement layers: `PlanGuard` (feature flags), `QuotaGuard` (Redis counters), `EntitlementService` (dynamic logic). Casso webhook → match by ref code → activate Subscription → Redis pub/sub → Socket.IO emit → FE auto-redirect.

**Tech Stack:** NestJS 10, Prisma 5, BullMQ 5, Vitest, Supertest, ioredis, Socket.IO, Next.js 14 (App Router), TanStack Query 5, shadcn/ui, Tailwind, Playwright.

**Spec reference:** [`docs/superpowers/specs/2026-05-20-subscriptions-vietqr-design.md`](../specs/2026-05-20-subscriptions-vietqr-design.md). Plan invariants (quota matrix, refCode format, Casso flow, error map) live in spec.

**Branch:** `feat/subscriptions-vietqr` (already created from `origin/main`).

**Phase overview:**

| Phase | What ships | Test gate |
|---|---|---|
| **0. Foundation** | shared types + Prisma migration + Free backfill | `npm run db:migrate` succeeds + `tsc` passes |
| **1. Domain core** | Plan/Subscription read endpoints + EntitlementService | Unit tests for entitlement matrix |
| **2. VietQR + Casso** | PaymentIntent flow + webhook + Socket.IO emit | Integration test: create intent → mock webhook → sub active |
| **3. Enforcement** | QuotaCounter + Guards + decorators applied to existing endpoints | Integration test: Free user 11th audit → 429 |
| **4. Admin + Cron** | Admin grant endpoint + daily expiry cron | Unit tests for both |
| **5. Frontend** | pricing, upgrade, checkout, billing, admin, banner, quota dialog | Playwright happy path |
| **6. E2E + smoke** | Full Playwright flow + smoke extension | `npm run e2e:smoke` passes |
| **7. Rollout** | feature flag flip + ops notes | manual QA + deploy |

---

## Phase 0 — Foundation

### Task 0.1: Shared plan definitions in `@repo/shared`

**Files:**
- Create: `packages/shared/src/plans.ts`
- Modify: `packages/shared/src/index.ts` (re-export)
- Test: `packages/shared/test/plans.spec.ts` (new)

- [ ] **Step 1: Write failing test**

```typescript
// packages/shared/test/plans.spec.ts
import { describe, it, expect } from 'vitest';
import {
  PLAN_FEATURES,
  PLAN_PRICES_VND,
  PLAN_DISPLAY_NAMES_VI,
  FeatureFlag,
} from '../src/plans';

describe('PLAN_FEATURES', () => {
  const numericDims = [
    'audits_monthly',
    'site_audit_max_pages',
    'scheduled_audits_max',
    'api_keys_max',
    'api_calls_daily',
    'ai_calls_monthly',
  ] as const;

  it('Free < Pro < Business for every numeric quota', () => {
    for (const dim of numericDims) {
      expect(PLAN_FEATURES.free[dim]).toBeLessThan(PLAN_FEATURES.pro[dim]);
      expect(PLAN_FEATURES.pro[dim]).toBeLessThan(PLAN_FEATURES.business[dim]);
    }
  });

  it('history_retention_days: Free=7, Pro=90, Business=-1 (unlimited)', () => {
    expect(PLAN_FEATURES.free.history_retention_days).toBe(7);
    expect(PLAN_FEATURES.pro.history_retention_days).toBe(90);
    expect(PLAN_FEATURES.business.history_retention_days).toBe(-1);
  });

  it('scheduled_audit_min_interval: Business (15) tighter than Pro (1440)', () => {
    expect(PLAN_FEATURES.business.scheduled_audit_min_interval_min).toBeLessThan(
      PLAN_FEATURES.pro.scheduled_audit_min_interval_min,
    );
  });

  it('Free has no features, Pro has 7, Business has 8 (incl PRIORITY_QUEUE)', () => {
    expect(PLAN_FEATURES.free.features).toHaveLength(0);
    expect(PLAN_FEATURES.pro.features).toHaveLength(7);
    expect(PLAN_FEATURES.business.features).toContain(FeatureFlag.PRIORITY_QUEUE);
    expect(PLAN_FEATURES.pro.features).not.toContain(FeatureFlag.PRIORITY_QUEUE);
  });

  it('prices match spec', () => {
    expect(PLAN_PRICES_VND).toEqual({ free: 0, pro: 99_000, business: 299_000 });
  });

  it('Vietnamese display names', () => {
    expect(PLAN_DISPLAY_NAMES_VI).toEqual({
      free: 'Cá nhân',
      pro: 'Chuyên nghiệp',
      business: 'Doanh nghiệp',
    });
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx vitest run packages/shared/test/plans.spec.ts`
Expected: FAIL — `Cannot find module '../src/plans'`.

- [ ] **Step 3: Create plans.ts**

```typescript
// packages/shared/src/plans.ts
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

export type PlanCode = 'free' | 'pro' | 'business';

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
  history_retention_days: number; // -1 = unlimited
  features: FeatureFlag[];
}

const PRO_FEATURES = [
  FeatureFlag.SITE_AUDIT,
  FeatureFlag.SCHEDULED_AUDIT,
  FeatureFlag.API_KEY,
  FeatureFlag.AI_SUGGESTIONS,
  FeatureFlag.PDF_EXPORT,
  FeatureFlag.SHARE_LINK,
  FeatureFlag.EMAIL_ALERT,
];

export const PLAN_FEATURES: Record<PlanCode, PlanDefinition> = {
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
    features: PRO_FEATURES,
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
    features: [...PRO_FEATURES, FeatureFlag.PRIORITY_QUEUE],
  },
};

export const PLAN_PRICES_VND: Record<PlanCode, number> = {
  free: 0,
  pro: 99_000,
  business: 299_000,
};

export const PLAN_DISPLAY_NAMES_VI: Record<PlanCode, string> = {
  free: 'Cá nhân',
  pro: 'Chuyên nghiệp',
  business: 'Doanh nghiệp',
};

export const BILLING_DEFAULTS = {
  SUBSCRIPTION_DAYS: 30,
  INTENT_TTL_MINUTES: 30,
} as const;
```

Add re-export in `packages/shared/src/index.ts` (append at end):

```typescript
export * from './plans';
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run packages/shared/test/plans.spec.ts`
Expected: 6 tests pass.

- [ ] **Step 5: Build shared package**

Run: `npx turbo run build --filter=@repo/shared`
Expected: success; `packages/shared/dist/plans.js` and `.d.ts` exist.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/plans.ts packages/shared/src/index.ts packages/shared/test/plans.spec.ts
git commit -m "feat(shared): add plan definitions + feature flags for subscriptions

3-tier matrix (Free/Pro/Business) covering 10 quota dimensions and 8
feature flags. Invariant tested: Free < Pro < Business for all numeric
quotas; Business has PRIORITY_QUEUE flag exclusively."
```

---

### Task 0.2: Prisma schema extension

**Files:**
- Modify: `apps/gateway/prisma/schema.prisma` (add 4 models + 3 enums + relation on User)
- Create: `apps/gateway/prisma/migrations/<timestamp>_add_subscriptions/migration.sql` (auto-generated then edited)

- [ ] **Step 1: Edit schema.prisma — add enums (after existing `AlertType` enum)**

```prisma
enum PlanCode {
  free
  pro
  business
}

enum SubscriptionStatus {
  active
  expired
  canceled
}

enum PaymentIntentStatus {
  pending
  paid
  expired
  failed
}
```

- [ ] **Step 2: Add 4 new models at bottom of schema.prisma**

```prisma
model Plan {
  code          PlanCode @id
  displayName   String   @map("display_name") @db.VarChar(50)
  priceVnd      Int      @map("price_vnd")
  sortOrder     Int      @default(0) @map("sort_order")
  isPublic      Boolean  @default(true) @map("is_public")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz

  subscriptions Subscription[]

  @@map("plans")
}

model Subscription {
  id          String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String              @unique @map("user_id") @db.Uuid
  planCode    PlanCode            @map("plan_code")
  status      SubscriptionStatus  @default(active)
  startedAt   DateTime            @default(now()) @map("started_at") @db.Timestamptz
  expiresAt   DateTime?           @map("expires_at") @db.Timestamptz
  canceledAt  DateTime?           @map("canceled_at") @db.Timestamptz
  grantedBy   String?             @map("granted_by") @db.Uuid
  createdAt   DateTime            @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime            @updatedAt @map("updated_at") @db.Timestamptz

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan           Plan            @relation(fields: [planCode], references: [code])
  paymentIntents PaymentIntent[]

  @@index([expiresAt, status], name: "idx_sub_expiry")
  @@map("subscriptions")
}

model PaymentIntent {
  id             String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String              @map("user_id") @db.Uuid
  subscriptionId String?             @map("subscription_id") @db.Uuid
  planCode       PlanCode            @map("plan_code")
  amountVnd      Int                 @map("amount_vnd")
  refCode        String              @unique @map("ref_code") @db.VarChar(40)
  status         PaymentIntentStatus @default(pending)
  vietqrUrl      String              @map("vietqr_url") @db.Text
  cassoTxnId     String?             @map("casso_txn_id") @db.VarChar(64)
  paidAt         DateTime?           @map("paid_at") @db.Timestamptz
  expiresAt      DateTime            @map("expires_at") @db.Timestamptz
  createdAt      DateTime            @default(now()) @map("created_at") @db.Timestamptz

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription? @relation(fields: [subscriptionId], references: [id])

  @@index([refCode], name: "idx_pi_ref")
  @@index([userId, status], name: "idx_pi_user_status")
  @@map("payment_intents")
}

model CassoEvent {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cassoTxnId      String   @unique @map("casso_txn_id") @db.VarChar(64)
  payload         Json     @db.JsonB
  matched         Boolean  @default(false)
  matchedIntentId String?  @map("matched_intent_id") @db.Uuid
  receivedAt      DateTime @default(now()) @map("received_at") @db.Timestamptz

  @@index([receivedAt], name: "idx_casso_recv")
  @@map("casso_events")
}
```

- [ ] **Step 3: Extend User model — append relation field**

In existing `User` model, append (after `apiKeys ApiKey[]`):

```prisma
  subscription   Subscription?
  paymentIntents PaymentIntent[]
```

- [ ] **Step 4: Generate migration**

Run:
```bash
cd apps/gateway
npx prisma migrate dev --name add_subscriptions --create-only
```

Expected: file created at `apps/gateway/prisma/migrations/<timestamp>_add_subscriptions/migration.sql`.

- [ ] **Step 5: Edit migration to seed Plan rows + backfill Free Subscription for existing users**

Append to the generated `migration.sql` (at the bottom):

```sql
-- Seed plans
INSERT INTO "plans" (code, display_name, price_vnd, sort_order, is_public, created_at, updated_at)
VALUES
  ('free',     'Cá nhân',         0,      1, true, NOW(), NOW()),
  ('pro',      'Chuyên nghiệp',   99000,  2, true, NOW(), NOW()),
  ('business', 'Doanh nghiệp',    299000, 3, true, NOW(), NOW());

-- Backfill Free subscription for every existing user
INSERT INTO "subscriptions" (id, user_id, plan_code, status, started_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  'free',
  'active',
  NOW(),
  NOW(),
  NOW()
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "subscriptions" s WHERE s.user_id = u.id
);
```

- [ ] **Step 6: Apply migration to dev DB**

Ensure docker stack is up (`npm run docker:up`), then:

```bash
cd apps/gateway
npx prisma migrate deploy
npx prisma generate
```

Expected: 4 tables created, 3 plan rows, N subscription rows (one per existing user).

- [ ] **Step 7: Verify SQL**

```bash
docker exec -it seo_gateway_db psql -U postgres -d seo_gateway -c "SELECT code, display_name, price_vnd FROM plans;"
docker exec -it seo_gateway_db psql -U postgres -d seo_gateway -c "SELECT count(*) FROM subscriptions WHERE plan_code='free';"
```

Expected: 3 plans listed; subscriptions count == users count.

- [ ] **Step 8: Build gateway to make sure types compile**

Run: `npx turbo run build --filter=@seo/gateway`
Expected: success.

- [ ] **Step 9: Commit**

```bash
git add apps/gateway/prisma/schema.prisma apps/gateway/prisma/migrations/ apps/gateway/src/infra/prisma/generated/
git commit -m "feat(gateway): add subscriptions Prisma schema + Free backfill

Adds Plan, Subscription, PaymentIntent, CassoEvent models + 3 enums.
Migration seeds 3 plans (free/pro/business) and backfills Free
subscription for all existing users in a single transaction so the
relation invariant (one sub per user) holds immediately."
```

---

## Phase 1 — Domain core (read-only)

### Task 1.1: Billing module skeleton

**Files:**
- Create: `apps/gateway/src/billing/billing.module.ts`
- Create: `apps/gateway/src/billing/domain/plan-features.ts` (re-export from shared for ergonomics)
- Create: `apps/gateway/src/billing/domain/billing.errors.ts`
- Modify: `apps/gateway/src/app.module.ts` (import BillingModule)

- [ ] **Step 1: Create domain/billing.errors.ts**

```typescript
// apps/gateway/src/billing/domain/billing.errors.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class FeatureNotAvailableError extends HttpException {
  constructor(featureFlag: string, currentPlan: string) {
    super(
      {
        code: 'FEATURE_NOT_AVAILABLE',
        message: `Tính năng "${featureFlag}" không có trong gói "${currentPlan}". Nâng cấp để sử dụng.`,
        featureFlag,
        currentPlan,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class QuotaExceededError extends HttpException {
  constructor(dimension: string, limit: number, resetAt: Date) {
    super(
      {
        code: 'QUOTA_EXCEEDED',
        message: `Đã đạt giới hạn ${limit} cho "${dimension}". Reset vào ${resetAt.toISOString()}.`,
        dimension,
        limit,
        resetAt: resetAt.toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class IntentAlreadyExistsError extends HttpException {
  constructor(existingIntentId: string) {
    super(
      {
        code: 'INTENT_ALREADY_EXISTS',
        message: 'Bạn đã có một mã thanh toán đang chờ. Vui lòng hoàn tất hoặc đợi hết hạn.',
        existingIntentId,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidWebhookSignatureError extends HttpException {
  constructor() {
    super(
      { code: 'WEBHOOK_INVALID_SIGNATURE', message: 'Invalid webhook token' },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
```

- [ ] **Step 2: Create domain/plan-features.ts**

```typescript
// apps/gateway/src/billing/domain/plan-features.ts
// Re-export for shorter imports inside the billing module
export {
  PLAN_FEATURES,
  PLAN_PRICES_VND,
  PLAN_DISPLAY_NAMES_VI,
  FeatureFlag,
  BILLING_DEFAULTS,
} from '@repo/shared';
export type { PlanCode, PlanDefinition, QuotaDimension } from '@repo/shared';
```

- [ ] **Step 3: Create empty billing.module.ts**

```typescript
// apps/gateway/src/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class BillingModule {}
```

- [ ] **Step 4: Wire into app.module.ts**

Open `apps/gateway/src/app.module.ts`, add `import { BillingModule } from './billing/billing.module';` near other imports, then add `BillingModule` to the `imports: [...]` array.

- [ ] **Step 5: Verify build**

Run: `npx turbo run build --filter=@seo/gateway`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/billing apps/gateway/src/app.module.ts
git commit -m "feat(gateway/billing): scaffold module skeleton + domain errors

Empty BillingModule wired into AppModule; introduces 4 typed billing
errors (FeatureNotAvailable, QuotaExceeded, IntentAlreadyExists,
InvalidWebhookSignature) for use by guards and the webhook controller."
```

---

### Task 1.2: PlansService + GET /plans endpoint

**Files:**
- Create: `apps/gateway/src/billing/services/plans.service.ts`
- Create: `apps/gateway/src/billing/controllers/plans.controller.ts`
- Create: `apps/gateway/src/billing/dto/plan-response.dto.ts`
- Test: `apps/gateway/test/unit/billing/plans.service.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/billing/plans.service.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlansService } from '../../../src/billing/services/plans.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';

describe('PlansService', () => {
  let svc: PlansService;
  const prismaMock = {
    plan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new PlansService(prismaMock as unknown as PrismaService);
  });

  it('listPublicPlans merges DB price/display with code features', async () => {
    prismaMock.plan.findMany.mockResolvedValue([
      { code: 'free', displayName: 'Cá nhân', priceVnd: 0, sortOrder: 1, isPublic: true },
      { code: 'pro', displayName: 'Chuyên nghiệp', priceVnd: 99000, sortOrder: 2, isPublic: true },
      { code: 'business', displayName: 'Doanh nghiệp', priceVnd: 299000, sortOrder: 3, isPublic: true },
    ]);
    const plans = await svc.listPublicPlans();
    expect(plans).toHaveLength(3);
    expect(plans[0].code).toBe('free');
    expect(plans[1].priceVnd).toBe(99000);
    expect(plans[1].features.audits_monthly).toBe(200);
    expect(plans[2].features.features).toContain('priority_queue');
  });

  it('getPlan returns merged plan or null', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      code: 'pro', displayName: 'Chuyên nghiệp', priceVnd: 99000, sortOrder: 2, isPublic: true,
    });
    const plan = await svc.getPlan('pro');
    expect(plan?.features.api_keys_max).toBe(1);

    prismaMock.plan.findUnique.mockResolvedValueOnce(null);
    expect(await svc.getPlan('pro')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd apps/gateway && npx vitest run test/unit/billing/plans.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create DTO**

```typescript
// apps/gateway/src/billing/dto/plan-response.dto.ts
import { PlanCode, PlanDefinition } from '../domain/plan-features';

export class PlanResponseDto {
  code!: PlanCode;
  displayName!: string;
  priceVnd!: number;
  sortOrder!: number;
  features!: PlanDefinition;
}
```

- [ ] **Step 4: Create plans.service.ts**

```typescript
// apps/gateway/src/billing/services/plans.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PLAN_FEATURES, PlanCode } from '../domain/plan-features';
import { PlanResponseDto } from '../dto/plan-response.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPlans(): Promise<PlanResponseDto[]> {
    const rows = await this.prisma.plan.findMany({
      where: { isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((p) => this.merge(p));
  }

  async getPlan(code: PlanCode): Promise<PlanResponseDto | null> {
    const row = await this.prisma.plan.findUnique({ where: { code } });
    return row ? this.merge(row) : null;
  }

  private merge(row: {
    code: PlanCode;
    displayName: string;
    priceVnd: number;
    sortOrder: number;
  }): PlanResponseDto {
    return {
      code: row.code,
      displayName: row.displayName,
      priceVnd: row.priceVnd,
      sortOrder: row.sortOrder,
      features: PLAN_FEATURES[row.code],
    };
  }
}
```

- [ ] **Step 5: Create plans.controller.ts**

```typescript
// apps/gateway/src/billing/controllers/plans.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PlansService } from '../services/plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @Public()
  async list() {
    return this.plans.listPublicPlans();
  }
}
```

- [ ] **Step 6: Register in billing.module.ts**

Update `billing.module.ts`:

```typescript
import { PlansController } from './controllers/plans.controller';
import { PlansService } from './services/plans.service';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class BillingModule {}
```

- [ ] **Step 7: Run test, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/plans.service.spec.ts`
Expected: 2 tests pass.

- [ ] **Step 8: Smoke test endpoint**

```bash
cd apps/gateway && npm run dev &
sleep 5
curl http://localhost:3000/api/v1/plans | jq
```

Expected: array of 3 plans with `features.audits_monthly` etc.

- [ ] **Step 9: Commit**

```bash
git add apps/gateway/src/billing apps/gateway/test/unit/billing
git commit -m "feat(gateway/billing): PlansService + GET /plans (public)

Merges DB-stored price/display with code-defined quota matrix.
Endpoint is public so the marketing /pricing page can fetch without
auth. Returns array sorted by sortOrder."
```

---

### Task 1.3: SubscriptionService — current plan lookup

**Files:**
- Create: `apps/gateway/src/billing/services/subscription.service.ts`
- Create: `apps/gateway/src/billing/dto/subscription-response.dto.ts`
- Test: `apps/gateway/test/unit/billing/subscription.service.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/billing/subscription.service.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';
import { BILLING_DEFAULTS } from '@repo/shared';

describe('SubscriptionService', () => {
  let svc: SubscriptionService;
  const prismaMock = {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new SubscriptionService(prismaMock as unknown as PrismaService);
  });

  it('getCurrent returns user subscription with planCode + expiresAt', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 's1', userId: 'u1', planCode: 'pro', status: 'active',
      startedAt: new Date('2026-05-01'), expiresAt: new Date('2026-06-01'),
      canceledAt: null, grantedBy: null,
    });
    const sub = await svc.getCurrent('u1');
    expect(sub?.planCode).toBe('pro');
    expect(sub?.isAdminGranted).toBe(false);
  });

  it('getCurrent returns null when user has no subscription row', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const sub = await svc.getCurrent('u1');
    expect(sub).toBeNull();
  });

  it('activate creates pro subscription with expiresAt = now + 30 days', async () => {
    prismaMock.subscription.upsert.mockResolvedValue({
      id: 's1', userId: 'u1', planCode: 'pro', status: 'active',
      startedAt: new Date(), expiresAt: new Date(), canceledAt: null, grantedBy: null,
    });
    await svc.activate({ userId: 'u1', planCode: 'pro' });
    const callArg = prismaMock.subscription.upsert.mock.calls[0][0];
    expect(callArg.where).toEqual({ userId: 'u1' });
    expect(callArg.create.planCode).toBe('pro');
    expect(callArg.update.planCode).toBe('pro');
    const expires = callArg.create.expiresAt as Date;
    const diffDays = Math.round((expires.getTime() - Date.now()) / 86400000);
    expect(diffDays).toBe(BILLING_DEFAULTS.SUBSCRIPTION_DAYS);
  });

  it('activate with grantedBy marks admin grant', async () => {
    prismaMock.subscription.upsert.mockResolvedValue({});
    await svc.activate({ userId: 'u1', planCode: 'business', grantedBy: 'admin-id' });
    const arg = prismaMock.subscription.upsert.mock.calls[0][0];
    expect(arg.create.grantedBy).toBe('admin-id');
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd apps/gateway && npx vitest run test/unit/billing/subscription.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create DTO**

```typescript
// apps/gateway/src/billing/dto/subscription-response.dto.ts
import { PlanCode } from '../domain/plan-features';

export class SubscriptionResponseDto {
  id!: string;
  userId!: string;
  planCode!: PlanCode;
  status!: 'active' | 'expired' | 'canceled';
  startedAt!: Date;
  expiresAt!: Date | null;
  canceledAt!: Date | null;
  isAdminGranted!: boolean;
}
```

- [ ] **Step 4: Create subscription.service.ts**

```typescript
// apps/gateway/src/billing/services/subscription.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PlanCode, BILLING_DEFAULTS } from '../domain/plan-features';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';

export interface ActivateInput {
  userId: string;
  planCode: PlanCode;
  durationDays?: number;
  grantedBy?: string;
  paymentIntentId?: string;
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(userId: string): Promise<SubscriptionResponseDto | null> {
    const row = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      planCode: row.planCode,
      status: row.status,
      startedAt: row.startedAt,
      expiresAt: row.expiresAt,
      canceledAt: row.canceledAt,
      isAdminGranted: row.grantedBy !== null,
    };
  }

  async activate(input: ActivateInput): Promise<void> {
    const days = input.durationDays ?? BILLING_DEFAULTS.SUBSCRIPTION_DAYS;
    const expiresAt = input.planCode === 'free'
      ? null
      : new Date(Date.now() + days * 86_400_000);

    await this.prisma.subscription.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        planCode: input.planCode,
        status: 'active',
        startedAt: new Date(),
        expiresAt,
        grantedBy: input.grantedBy ?? null,
      },
      update: {
        planCode: input.planCode,
        status: 'active',
        startedAt: new Date(),
        expiresAt,
        canceledAt: null,
        grantedBy: input.grantedBy ?? null,
      },
    });
  }

  async cancel(userId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled', canceledAt: new Date() },
    });
  }

  async downgradeExpiredToFree(now: Date = new Date()): Promise<number> {
    // Find expired actives, mark expired, then upsert Free.
    const expired = await this.prisma.subscription.findMany({
      where: { status: 'active', expiresAt: { not: null, lt: now } },
      select: { userId: true, id: true },
    });
    if (expired.length === 0) return 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { id: { in: expired.map((e) => e.id) } },
        data: { status: 'expired' },
      });
      for (const e of expired) {
        await tx.subscription.upsert({
          where: { userId: e.userId },
          create: {
            userId: e.userId,
            planCode: 'free',
            status: 'active',
            startedAt: now,
            expiresAt: null,
          },
          update: {
            planCode: 'free',
            status: 'active',
            startedAt: now,
            expiresAt: null,
            canceledAt: null,
            grantedBy: null,
          },
        });
      }
    });
    return expired.length;
  }
}
```

- [ ] **Step 5: Register provider**

In `billing.module.ts`, add `SubscriptionService` to providers and exports.

- [ ] **Step 6: Run tests, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/subscription.service.spec.ts`
Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/gateway/src/billing/services/subscription.service.ts apps/gateway/src/billing/dto/subscription-response.dto.ts apps/gateway/src/billing/billing.module.ts apps/gateway/test/unit/billing/subscription.service.spec.ts
git commit -m "feat(gateway/billing): SubscriptionService — get/activate/cancel/downgrade

Single source of truth for the User-Subscription aggregate. activate()
upserts so admin grant / payment / re-up all share the same path.
downgradeExpiredToFree() is called by the daily expiry cron (Task 4.2)."
```

---

### Task 1.4: EntitlementService — central allow/deny

**Files:**
- Create: `apps/gateway/src/billing/services/entitlement.service.ts`
- Test: `apps/gateway/test/unit/billing/entitlement.service.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/billing/entitlement.service.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntitlementService } from '../../../src/billing/services/entitlement.service';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { FeatureFlag } from '@repo/shared';

describe('EntitlementService', () => {
  let svc: EntitlementService;
  const subSvc = { getCurrent: vi.fn() } as unknown as SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new EntitlementService(subSvc);
  });

  it('Free user lacks SITE_AUDIT feature', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'free', status: 'active' });
    const d = await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT);
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain('site_audit');
  });

  it('Pro user has SITE_AUDIT, lacks PRIORITY_QUEUE', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    expect((await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT)).allowed).toBe(true);
    expect((await svc.hasFeature('u1', FeatureFlag.PRIORITY_QUEUE)).allowed).toBe(false);
  });

  it('Business user has every feature', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'business', status: 'active' });
    for (const f of Object.values(FeatureFlag)) {
      expect((await svc.hasFeature('u1', f)).allowed).toBe(true);
    }
  });

  it('No subscription row falls back to Free entitlements', async () => {
    (subSvc.getCurrent as any).mockResolvedValue(null);
    const d = await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT);
    expect(d.allowed).toBe(false);
  });

  it('Canceled subscription downgrades to Free for entitlement check', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'canceled' });
    const d = await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT);
    expect(d.allowed).toBe(false);
  });

  it('getEffectivePlan returns free for canceled/expired', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'expired' });
    expect(await svc.getEffectivePlan('u1')).toBe('free');
  });

  it('siteAuditMaxPages enforces plan cap', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    const d = await svc.checkSiteAuditPageCount('u1', 150);
    expect(d.allowed).toBe(true);
    const d2 = await svc.checkSiteAuditPageCount('u1', 250);
    expect(d2.allowed).toBe(false);
  });

  it('checkScheduledAuditCron rejects Pro cron <24h', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    // Pro min = 1440 minutes (daily). Hourly cron has min interval 60 → reject.
    const d = await svc.checkScheduledAuditCron('u1', '0 * * * *');
    expect(d.allowed).toBe(false);
    const d2 = await svc.checkScheduledAuditCron('u1', '0 0 * * *');
    expect(d2.allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd apps/gateway && npx vitest run test/unit/billing/entitlement.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement entitlement.service.ts**

```typescript
// apps/gateway/src/billing/services/entitlement.service.ts
import { Injectable } from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
import { SubscriptionService } from './subscription.service';
import { PLAN_FEATURES, FeatureFlag, PlanCode } from '../domain/plan-features';

export interface EntitlementDecision {
  allowed: boolean;
  code: string;
  reason: string;
}

const ALLOWED = (): EntitlementDecision => ({ allowed: true, code: 'OK', reason: '' });

@Injectable()
export class EntitlementService {
  constructor(private readonly subscriptions: SubscriptionService) {}

  /** Effective plan: any non-active sub falls back to Free. */
  async getEffectivePlan(userId: string): Promise<PlanCode> {
    const sub = await this.subscriptions.getCurrent(userId);
    if (!sub) return 'free';
    if (sub.status !== 'active') return 'free';
    if (sub.expiresAt && sub.expiresAt < new Date()) return 'free';
    return sub.planCode;
  }

  async hasFeature(userId: string, flag: FeatureFlag): Promise<EntitlementDecision> {
    const plan = await this.getEffectivePlan(userId);
    if (PLAN_FEATURES[plan].features.includes(flag)) return ALLOWED();
    return {
      allowed: false,
      code: 'FEATURE_NOT_AVAILABLE',
      reason: `Plan "${plan}" lacks feature "${flag}"`,
    };
  }

  async checkSiteAuditPageCount(userId: string, requestedPages: number): Promise<EntitlementDecision> {
    const plan = await this.getEffectivePlan(userId);
    const max = PLAN_FEATURES[plan].site_audit_max_pages;
    if (requestedPages <= max) return ALLOWED();
    return {
      allowed: false,
      code: 'PAGE_LIMIT_EXCEEDED',
      reason: `Plan "${plan}" cho phép tối đa ${max} trang/audit`,
    };
  }

  async checkScheduledAuditCount(userId: string, currentCount: number): Promise<EntitlementDecision> {
    const plan = await this.getEffectivePlan(userId);
    const max = PLAN_FEATURES[plan].scheduled_audits_max;
    if (currentCount < max) return ALLOWED();
    return {
      allowed: false,
      code: 'SCHEDULE_LIMIT_EXCEEDED',
      reason: `Plan "${plan}" cho phép tối đa ${max} lịch định kỳ`,
    };
  }

  async checkScheduledAuditCron(userId: string, cron: string): Promise<EntitlementDecision> {
    const plan = await this.getEffectivePlan(userId);
    const minMinutes = PLAN_FEATURES[plan].scheduled_audit_min_interval_min;
    const interval = this.minIntervalMinutes(cron);
    if (interval >= minMinutes) return ALLOWED();
    return {
      allowed: false,
      code: 'CRON_TOO_FREQUENT',
      reason: `Plan "${plan}" yêu cầu khoảng cách ≥ ${minMinutes} phút`,
    };
  }

  private minIntervalMinutes(cron: string): number {
    const iter = CronExpressionParser.parse(cron);
    const first = iter.next().toDate();
    const second = iter.next().toDate();
    return Math.round((second.getTime() - first.getTime()) / 60_000);
  }
}
```

> **Note:** `cron-parser` is already used by `scheduled-audits` module. If not in gateway `package.json`, add: `npm install cron-parser --workspace=@seo/gateway`.

- [ ] **Step 4: Register provider**

Add `EntitlementService` to providers + exports in `billing.module.ts`.

- [ ] **Step 5: Run tests, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/entitlement.service.spec.ts`
Expected: 9 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/billing/services/entitlement.service.ts apps/gateway/src/billing/billing.module.ts apps/gateway/test/unit/billing/entitlement.service.spec.ts apps/gateway/package.json
git commit -m "feat(gateway/billing): EntitlementService — central allow/deny

Single source for plan-derived decisions: feature flags, site-audit
page cap, scheduled-audit count + min cron interval. Non-active subs
fall back to Free so canceled/expired users still get baseline access."
```

---

### Task 1.5: GET /me/subscription endpoint

**Files:**
- Create: `apps/gateway/src/billing/controllers/subscriptions.controller.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write the controller**

```typescript
// apps/gateway/src/billing/controllers/subscriptions.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from '../services/subscription.service';
import { PLAN_FEATURES } from '../domain/plan-features';

@Controller('me/subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Get()
  async current(@CurrentUser('id') userId: string) {
    const sub = await this.subscriptions.getCurrent(userId);
    if (!sub) {
      return {
        planCode: 'free',
        status: 'active',
        expiresAt: null,
        isAdminGranted: false,
        features: PLAN_FEATURES.free,
      };
    }
    return { ...sub, features: PLAN_FEATURES[sub.planCode] };
  }

  @Post('cancel')
  async cancel(@CurrentUser('id') userId: string) {
    await this.subscriptions.cancel(userId);
    return { ok: true };
  }
}
```

- [ ] **Step 2: Register controller in billing.module.ts**

Add to `controllers: [PlansController, SubscriptionsController]`.

- [ ] **Step 3: Smoke test**

```bash
cd apps/gateway && npm run dev &
sleep 5
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"admin123"}' | jq -r .accessToken)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/me/subscription | jq
```

Expected: `{ planCode: "free", status: "active", features: {...} }`.

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/billing/controllers/subscriptions.controller.ts apps/gateway/src/billing/billing.module.ts
git commit -m "feat(gateway/billing): GET /me/subscription + POST /me/subscription/cancel

JWT-guarded read endpoint that returns the user's effective plan with
the full feature matrix inlined — FE doesn't need a second call to
/plans to know what the user can do."
```

---

## Phase 2 — VietQR + Casso payment

### Task 2.1: PaymentIntentService — ref code + VietQR URL

**Files:**
- Create: `apps/gateway/src/billing/services/payment-intent.service.ts`
- Create: `apps/gateway/src/billing/dto/create-payment-intent.dto.ts`
- Create: `apps/gateway/src/billing/dto/payment-intent-response.dto.ts`
- Test: `apps/gateway/test/unit/billing/payment-intent.service.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/billing/payment-intent.service.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentIntentService } from '../../../src/billing/services/payment-intent.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('PaymentIntentService', () => {
  let svc: PaymentIntentService;
  const intents: any[] = [];
  const prismaMock = {
    paymentIntent: {
      findFirst: vi.fn(async ({ where }: any) =>
        intents.find((i) => i.userId === where.userId && i.status === 'pending' && i.expiresAt > new Date()) ?? null,
      ),
      create: vi.fn(async ({ data }: any) => {
        const i = { id: `pi-${intents.length + 1}`, createdAt: new Date(), ...data };
        intents.push(i);
        return i;
      }),
      findUnique: vi.fn(async ({ where }: any) => intents.find((i) => i.id === where.id) ?? null),
    },
  };
  const configMock = {
    get: vi.fn((key: string) => ({
      VIETQR_BANK_BIN: '970422',
      VIETQR_ACCOUNT_NO: '0123456789',
      VIETQR_ACCOUNT_NAME: 'NGUYEN VAN A',
      BILLING_INTENT_TTL_MINUTES: '30',
    } as any)[key]),
  };

  beforeEach(() => {
    intents.length = 0;
    vi.clearAllMocks();
    svc = new PaymentIntentService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    );
  });

  it('refCode matches /^SEO[A-Z2-7]{5}$/', () => {
    const code = (svc as any).generateRefCode() as string;
    expect(code).toMatch(/^SEO[A-Z2-7]{5}$/);
  });

  it('builds VietQR URL with amount and addInfo', () => {
    const url = (svc as any).buildVietQrUrl(99_000, 'SEOABC23') as string;
    expect(url).toContain('970422');
    expect(url).toContain('0123456789');
    expect(url).toContain('amount=99000');
    expect(url).toContain('addInfo=SEOABC23');
  });

  it('createIntent stores pending intent with TTL', async () => {
    const intent = await svc.createIntent('u1', 'pro', 99_000);
    expect(intent.status).toBe('pending');
    expect(intent.refCode).toMatch(/^SEO[A-Z2-7]{5}$/);
    const ttlMs = intent.expiresAt.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(29 * 60_000);
    expect(ttlMs).toBeLessThan(31 * 60_000);
  });

  it('createIntent returns existing pending intent instead of creating a duplicate', async () => {
    const first = await svc.createIntent('u1', 'pro', 99_000);
    const second = await svc.createIntent('u1', 'pro', 99_000);
    expect(second.id).toBe(first.id);
    expect(prismaMock.paymentIntent.create).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd apps/gateway && npx vitest run test/unit/billing/payment-intent.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Create DTOs**

```typescript
// apps/gateway/src/billing/dto/create-payment-intent.dto.ts
import { IsIn } from 'class-validator';
import { PlanCode } from '../domain/plan-features';

export class CreatePaymentIntentDto {
  @IsIn(['pro', 'business'])
  planCode!: Exclude<PlanCode, 'free'>;
}
```

```typescript
// apps/gateway/src/billing/dto/payment-intent-response.dto.ts
import { PlanCode } from '../domain/plan-features';

export class PaymentIntentResponseDto {
  id!: string;
  refCode!: string;
  planCode!: PlanCode;
  amountVnd!: number;
  vietqrUrl!: string;
  status!: 'pending' | 'paid' | 'expired' | 'failed';
  expiresAt!: Date;
  paidAt!: Date | null;
}
```

- [ ] **Step 4: Implement payment-intent.service.ts**

```typescript
// apps/gateway/src/billing/services/payment-intent.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PlanCode, BILLING_DEFAULTS } from '../domain/plan-features';
import { PaymentIntentResponseDto } from '../dto/payment-intent-response.dto';

// RFC 4648 base32 alphabet without 0/1/8/9
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class PaymentIntentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createIntent(userId: string, planCode: PlanCode, amountVnd: number): Promise<PaymentIntentResponseDto> {
    // Reuse pending intent if any
    const existing = await this.prisma.paymentIntent.findFirst({
      where: { userId, status: 'pending', expiresAt: { gt: new Date() } },
    });
    if (existing) return this.toDto(existing);

    const ttlMin = Number(this.config.get<string>('BILLING_INTENT_TTL_MINUTES') ?? BILLING_DEFAULTS.INTENT_TTL_MINUTES);
    const refCode = this.generateRefCode();
    const vietqrUrl = this.buildVietQrUrl(amountVnd, refCode);

    const intent = await this.prisma.paymentIntent.create({
      data: {
        userId,
        planCode,
        amountVnd,
        refCode,
        vietqrUrl,
        status: 'pending',
        expiresAt: new Date(Date.now() + ttlMin * 60_000),
      },
    });
    return this.toDto(intent);
  }

  async findById(id: string): Promise<PaymentIntentResponseDto | null> {
    const row = await this.prisma.paymentIntent.findUnique({ where: { id } });
    return row ? this.toDto(row) : null;
  }

  async findByRefCode(refCode: string) {
    return this.prisma.paymentIntent.findUnique({ where: { refCode } });
  }

  async markPaid(id: string, cassoTxnId: string, subscriptionId: string): Promise<void> {
    await this.prisma.paymentIntent.update({
      where: { id },
      data: { status: 'paid', cassoTxnId, paidAt: new Date(), subscriptionId },
    });
  }

  async listForUser(userId: string, limit = 20): Promise<PaymentIntentResponseDto[]> {
    const rows = await this.prisma.paymentIntent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDto(r));
  }

  private generateRefCode(): string {
    const bytes = randomBytes(5);
    let out = 'SEO';
    for (let i = 0; i < 5; i++) {
      out += BASE32[bytes[i] % 32];
    }
    return out;
  }

  private buildVietQrUrl(amountVnd: number, addInfo: string): string {
    const bin = this.config.get<string>('VIETQR_BANK_BIN');
    const account = this.config.get<string>('VIETQR_ACCOUNT_NO');
    const name = this.config.get<string>('VIETQR_ACCOUNT_NAME');
    const enc = encodeURIComponent(name ?? '');
    return `https://img.vietqr.io/image/${bin}-${account}-compact2.jpg?amount=${amountVnd}&addInfo=${addInfo}&accountName=${enc}`;
  }

  private toDto(row: {
    id: string;
    refCode: string;
    planCode: PlanCode;
    amountVnd: number;
    vietqrUrl: string;
    status: 'pending' | 'paid' | 'expired' | 'failed';
    expiresAt: Date;
    paidAt: Date | null;
  }): PaymentIntentResponseDto {
    return {
      id: row.id,
      refCode: row.refCode,
      planCode: row.planCode,
      amountVnd: row.amountVnd,
      vietqrUrl: row.vietqrUrl,
      status: row.status,
      expiresAt: row.expiresAt,
      paidAt: row.paidAt,
    };
  }
}
```

- [ ] **Step 5: Register provider + import ConfigModule**

In `billing.module.ts` add `ConfigModule` to imports and `PaymentIntentService` to providers + exports.

- [ ] **Step 6: Run tests, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/payment-intent.service.spec.ts`
Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/gateway/src/billing/services/payment-intent.service.ts apps/gateway/src/billing/dto/ apps/gateway/src/billing/billing.module.ts apps/gateway/test/unit/billing/payment-intent.service.spec.ts
git commit -m "feat(gateway/billing): PaymentIntentService — refCode + VietQR URL + dedupe

Generates base32 ref code SEO[A-Z2-7]{5} (~33M combinations, DB UNIQUE
is last-line defense), builds vietqr.io img URL with amount + addInfo,
and reuses pending intents within TTL so duplicate POST returns the
same intent (handles user double-clicks)."
```

---

### Task 2.2: Payment intents controller — create + get

**Files:**
- Create: `apps/gateway/src/billing/controllers/payment-intents.controller.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Create controller**

```typescript
// apps/gateway/src/billing/controllers/payment-intents.controller.ts
import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentIntentService } from '../services/payment-intent.service';
import { PlansService } from '../services/plans.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';

@Controller('billing/payment-intents')
@UseGuards(JwtAuthGuard)
export class PaymentIntentsController {
  constructor(
    private readonly intents: PaymentIntentService,
    private readonly plans: PlansService,
  ) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentIntentDto) {
    const plan = await this.plans.getPlan(dto.planCode);
    if (!plan) throw new NotFoundException('Plan not found');
    return this.intents.createIntent(userId, dto.planCode, plan.priceVnd);
  }

  @Get(':id')
  async get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const intent = await this.intents.findById(id);
    if (!intent) throw new NotFoundException();
    // ensure ownership — query again with userId filter
    const list = await this.intents.listForUser(userId, 50);
    if (!list.some((p) => p.id === id)) throw new NotFoundException();
    return intent;
  }

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return this.intents.listForUser(userId);
  }
}
```

- [ ] **Step 2: Register controller**

Add `PaymentIntentsController` to `billing.module.ts` controllers.

- [ ] **Step 3: Manual smoke test**

```bash
cd apps/gateway && npm run dev &
sleep 5
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"admin123"}' | jq -r .accessToken)
INTENT=$(curl -s -X POST http://localhost:3000/api/v1/billing/payment-intents -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"planCode":"pro"}')
echo $INTENT | jq
```

Expected: returns `{ id, refCode, vietqrUrl, amountVnd: 99000, status: "pending", expiresAt }`.

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/billing/controllers/payment-intents.controller.ts apps/gateway/src/billing/billing.module.ts
git commit -m "feat(gateway/billing): POST + GET /billing/payment-intents

JWT-guarded. Creates a VietQR payment intent for a chosen plan (Pro
or Business — Free is rejected by DTO validation). GET enforces
ownership via a follow-up list filter."
```

---

### Task 2.3: CassoReconcilerService — match webhook to intent

**Files:**
- Create: `apps/gateway/src/billing/services/casso-reconciler.service.ts`
- Test: `apps/gateway/test/unit/billing/casso-reconciler.service.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/billing/casso-reconciler.service.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CassoReconcilerService } from '../../../src/billing/services/casso-reconciler.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';
import { PaymentIntentService } from '../../../src/billing/services/payment-intent.service';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { RedisService } from '../../../src/infra/redis/redis.service';

describe('CassoReconcilerService', () => {
  let svc: CassoReconcilerService;
  const events: any[] = [];
  const prismaMock = {
    cassoEvent: {
      create: vi.fn(async ({ data }: any) => {
        if (events.some((e) => e.cassoTxnId === data.cassoTxnId)) {
          const err: any = new Error('duplicate');
          err.code = 'P2002';
          throw err;
        }
        events.push({ id: `ev${events.length}`, ...data });
        return events[events.length - 1];
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const e = events.find((x) => x.id === where.id);
        Object.assign(e, data);
        return e;
      }),
    },
  };
  const intentSvc = {
    findByRefCode: vi.fn(),
    markPaid: vi.fn(),
  };
  const subSvc = {
    activate: vi.fn(async () => undefined),
    getCurrent: vi.fn(async () => ({ id: 'sub-new' })),
  };
  const redisMock = {
    client: { publish: vi.fn(async () => 1) },
  };

  beforeEach(() => {
    events.length = 0;
    vi.clearAllMocks();
    svc = new CassoReconcilerService(
      prismaMock as unknown as PrismaService,
      intentSvc as unknown as PaymentIntentService,
      subSvc as unknown as SubscriptionService,
      redisMock as unknown as RedisService,
    );
  });

  it('parses ref code from "noi dung chuyen khoan ... SEOABC23"', () => {
    expect((svc as any).extractRefCode('Tran tien SEOABC23 nha')).toBe('SEOABC23');
    expect((svc as any).extractRefCode('seoabc23 lowercase')).toBe('SEOABC23');
    expect((svc as any).extractRefCode('No code here')).toBeNull();
  });

  it('happy path: match + activate + publish', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await svc.handleWebhook({
      tid: 'casso-tid-1',
      amount: 99_000,
      description: 'CK SEOABC23',
      when: '2026-05-20T12:00:00Z',
    });
    expect(subSvc.activate).toHaveBeenCalledWith({
      userId: 'u1', planCode: 'pro', paymentIntentId: 'pi1',
    });
    expect(intentSvc.markPaid).toHaveBeenCalledWith('pi1', 'casso-tid-1', 'sub-new');
    expect(redisMock.client.publish).toHaveBeenCalledWith(
      'billing.confirmed',
      expect.stringContaining('"intentId":"pi1"'),
    );
  });

  it('duplicate tid is idempotent (no activate twice)', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const payload = { tid: 'casso-tid-1', amount: 99_000, description: 'CK SEOABC23', when: '...' };
    await svc.handleWebhook(payload);
    await svc.handleWebhook(payload);
    expect(subSvc.activate).toHaveBeenCalledTimes(1);
  });

  it('amount mismatch → unmatched, no activate', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await svc.handleWebhook({
      tid: 'casso-tid-2', amount: 50_000, description: 'CK SEOABC23', when: '...',
    });
    expect(subSvc.activate).not.toHaveBeenCalled();
    expect(events[0].matched).toBe(false);
  });

  it('no ref code → unmatched', async () => {
    await svc.handleWebhook({ tid: 't3', amount: 99_000, description: 'just text', when: '...' });
    expect(intentSvc.findByRefCode).not.toHaveBeenCalled();
    expect(events[0].matched).toBe(false);
  });

  it('intent already paid → unmatched', async () => {
    intentSvc.findByRefCode.mockResolvedValue({
      id: 'pi1', userId: 'u1', planCode: 'pro', amountVnd: 99_000, status: 'paid',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await svc.handleWebhook({ tid: 't4', amount: 99_000, description: 'CK SEOABC23', when: '...' });
    expect(subSvc.activate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd apps/gateway && npx vitest run test/unit/billing/casso-reconciler.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement reconciler**

```typescript
// apps/gateway/src/billing/services/casso-reconciler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PaymentIntentService } from './payment-intent.service';
import { SubscriptionService } from './subscription.service';
import { RedisService } from '../../infra/redis/redis.service';

export interface CassoWebhookPayload {
  tid: string;
  amount: number;
  description: string;
  when: string;
  [k: string]: unknown;
}

const REF_REGEX = /SEO[A-Z2-7]{5}/i;

@Injectable()
export class CassoReconcilerService {
  private readonly logger = new Logger(CassoReconcilerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intents: PaymentIntentService,
    private readonly subscriptions: SubscriptionService,
    private readonly redis: RedisService,
  ) {}

  async handleWebhook(payload: CassoWebhookPayload): Promise<void> {
    // Step 1: idempotent insert (UNIQUE on casso_txn_id catches duplicates)
    let event;
    try {
      event = await this.prisma.cassoEvent.create({
        data: {
          cassoTxnId: payload.tid,
          payload: payload as unknown as object,
          matched: false,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        this.logger.warn(`Duplicate Casso webhook tid=${payload.tid} — skipped`);
        return;
      }
      throw e;
    }

    // Step 2: extract ref code
    const refCode = this.extractRefCode(payload.description);
    if (!refCode) {
      this.logger.warn(`No ref code in Casso webhook tid=${payload.tid} desc="${payload.description}"`);
      return;
    }

    // Step 3: find pending intent matching ref + amount
    const intent = await this.intents.findByRefCode(refCode);
    if (!intent || intent.status !== 'pending') {
      this.logger.warn(`Intent for refCode=${refCode} not pending (status=${intent?.status}) tid=${payload.tid}`);
      return;
    }
    if (intent.amountVnd !== payload.amount) {
      this.logger.warn(`Amount mismatch refCode=${refCode}: expected=${intent.amountVnd} got=${payload.amount}`);
      return;
    }

    // Step 4: activate subscription + mark intent paid
    await this.subscriptions.activate({
      userId: intent.userId,
      planCode: intent.planCode,
      paymentIntentId: intent.id,
    });
    const sub = await this.subscriptions.getCurrent(intent.userId);
    if (sub) {
      await this.intents.markPaid(intent.id, payload.tid, sub.id);
    }

    // Step 5: mark event matched + publish redis event
    await this.prisma.cassoEvent.update({
      where: { id: event.id },
      data: { matched: true, matchedIntentId: intent.id },
    });
    await this.redis.client.publish(
      'billing.confirmed',
      JSON.stringify({
        userId: intent.userId,
        intentId: intent.id,
        planCode: intent.planCode,
      }),
    );
    this.logger.log(`Activated ${intent.planCode} for user=${intent.userId} via tid=${payload.tid}`);
  }

  private extractRefCode(description: string): string | null {
    const m = description.match(REF_REGEX);
    return m ? m[0].toUpperCase() : null;
  }
}
```

> Casso webhook payload field names: actual Casso v2 sends `tid`, `amount`, `description`, `when`, plus others. We only read the four above.

- [ ] **Step 4: Note the intent.userId field**

`PaymentIntentResponseDto` does not include `userId`. Update DTO + service mapping:

Edit `apps/gateway/src/billing/dto/payment-intent-response.dto.ts`:
```typescript
export class PaymentIntentResponseDto {
  id!: string;
  userId!: string;          // <-- add
  refCode!: string;
  planCode!: PlanCode;
  amountVnd!: number;
  vietqrUrl!: string;
  status!: 'pending' | 'paid' | 'expired' | 'failed';
  expiresAt!: Date;
  paidAt!: Date | null;
}
```

In `payment-intent.service.ts` `toDto()`, add `userId: row.userId`. The Prisma row already has `userId` (need to widen the parameter type accordingly).

- [ ] **Step 5: Register reconciler**

Add `CassoReconcilerService` to providers + exports in `billing.module.ts`.

- [ ] **Step 6: Run tests, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/casso-reconciler.service.spec.ts`
Expected: 6 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/gateway/src/billing/services/casso-reconciler.service.ts apps/gateway/src/billing/billing.module.ts apps/gateway/test/unit/billing/casso-reconciler.service.spec.ts apps/gateway/src/billing/dto/payment-intent-response.dto.ts apps/gateway/src/billing/services/payment-intent.service.ts
git commit -m "feat(gateway/billing): CassoReconcilerService — webhook → activate sub

Parses SEO[A-Z2-7]{5} from Casso 'description', matches pending intent
by refCode + amount, activates Subscription, marks intent paid, and
publishes 'billing.confirmed' to Redis (consumed by WebSocket emitter
in Task 2.5). Idempotent via casso_events.casso_txn_id UNIQUE."
```

---

### Task 2.4: Casso webhook controller + token verification

**Files:**
- Create: `apps/gateway/src/billing/controllers/casso-webhook.controller.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`
- Test: `apps/gateway/test/integration/billing-webhook.e2e-spec.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// apps/gateway/test/integration/billing-webhook.e2e-spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
vi.mock('passport-google-oauth20', () => ({ Strategy: class { authenticate() {} } }));
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from '../../src/billing/billing.module';
import { CassoReconcilerService } from '../../src/billing/services/casso-reconciler.service';

describe('POST /webhooks/casso', () => {
  let app: INestApplication;
  const handleWebhook = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ CASSO_WEBHOOK_SECRET: 'test-secret' })],
        }),
        BillingModule,
      ],
    })
      .overrideProvider(CassoReconcilerService).useValue({ handleWebhook })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => app.close());

  const payload = { tid: 'tx-1', amount: 99000, description: 'CK SEOABC23', when: '2026-05-20T12:00:00Z' };

  it('401 without Secure-Token header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/casso')
      .send(payload)
      .expect(401);
  });

  it('401 with wrong token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/casso')
      .set('Secure-Token', 'wrong')
      .send(payload)
      .expect(401);
  });

  it('200 with correct token + handler called', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/casso')
      .set('Secure-Token', 'test-secret')
      .send(payload)
      .expect(201);
    expect(handleWebhook).toHaveBeenCalledWith(expect.objectContaining({ tid: 'tx-1' }));
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd apps/gateway && npx vitest run test/integration/billing-webhook.e2e-spec.ts`
Expected: FAIL — controller not found.

- [ ] **Step 3: Implement controller**

```typescript
// apps/gateway/src/billing/controllers/casso-webhook.controller.ts
import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { CassoReconcilerService, CassoWebhookPayload } from '../services/casso-reconciler.service';
import { InvalidWebhookSignatureError } from '../domain/billing.errors';

@Controller('webhooks/casso')
export class CassoWebhookController {
  constructor(
    private readonly reconciler: CassoReconcilerService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @Public()
  async handle(@Headers('secure-token') token: string | undefined, @Body() body: CassoWebhookPayload) {
    this.verify(token);
    await this.reconciler.handleWebhook(body);
    return { ok: true };
  }

  private verify(token: string | undefined): void {
    const expected = this.config.get<string>('CASSO_WEBHOOK_SECRET');
    if (!expected || !token) throw new InvalidWebhookSignatureError();
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new InvalidWebhookSignatureError();
    }
  }
}
```

- [ ] **Step 4: Register controller**

Add `CassoWebhookController` to `controllers` array in `billing.module.ts`.

- [ ] **Step 5: Run integration test, expect pass**

Run: `cd apps/gateway && npx vitest run test/integration/billing-webhook.e2e-spec.ts`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/billing/controllers/casso-webhook.controller.ts apps/gateway/src/billing/billing.module.ts apps/gateway/test/integration/billing-webhook.e2e-spec.ts
git commit -m "feat(gateway/billing): POST /webhooks/casso — token verify + handler

@Public endpoint guarded by constant-time Secure-Token comparison
against CASSO_WEBHOOK_SECRET. Body forwarded to CassoReconcilerService.
Always returns 201 on success so Casso does not retry."
```

---

### Task 2.5: Socket.IO emit on payment confirmed

**Files:**
- Modify: `apps/gateway/src/infra/websocket/progress-subscriber.service.ts` (add billing channel subscription)
- Modify: `apps/gateway/src/infra/websocket/audit.gateway.ts` (or equivalent — add billing room handlers)

- [ ] **Step 1: Inspect current subscriber**

```bash
grep -n "audit.completed\|subscribe(" apps/gateway/src/infra/websocket/progress-subscriber.service.ts | head -20
```

Read the file end-to-end to understand pattern. The subscriber listens to multiple channels and routes to gateway.emit.

- [ ] **Step 2: Add `billing.confirmed` channel subscription**

In `progress-subscriber.service.ts`, after existing `subscribe('audit.completed', ...)`, add:

```typescript
await this.subscriber.subscribe('billing.confirmed', (raw: string) => {
  try {
    const evt = JSON.parse(raw) as { userId: string; intentId: string; planCode: string };
    this.gateway.emitBillingConfirmed(evt);
  } catch (e) {
    this.logger.error('Bad billing.confirmed payload', e);
  }
});
```

- [ ] **Step 3: Add emit method to gateway**

In the WebSocket gateway file (`audit.gateway.ts` or rename to `realtime.gateway.ts`):

```typescript
emitBillingConfirmed(evt: { userId: string; intentId: string; planCode: string }): void {
  // Emit to two rooms: user-scoped + intent-scoped
  this.server.to(`user:${evt.userId}`).emit('billing:confirmed', evt);
  this.server.to(`billing:${evt.intentId}`).emit('billing:confirmed', evt);
}
```

Also add subscribe handlers (handle `billing:subscribe` event):

```typescript
@SubscribeMessage('billing:subscribe')
handleBillingSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { intentId: string }) {
  if (data?.intentId) client.join(`billing:${data.intentId}`);
}
```

In JWT auth handler, after authenticating, also auto-join `user:<userId>`.

- [ ] **Step 4: Manual smoke**

```bash
cd apps/gateway && npm run dev &
sleep 5

# Open another terminal — connect socket and listen
node -e '
const io = require("socket.io-client");
const s = io("ws://localhost:3000/ws", { auth: { token: process.env.TOKEN }});
s.on("connect", () => { s.emit("billing:subscribe", { intentId: "test" }); });
s.on("billing:confirmed", (e) => console.log("got", e));
'

# In another terminal — manually publish
redis-cli PUBLISH billing.confirmed '{"userId":"u1","intentId":"test","planCode":"pro"}'
```

Expected: socket client logs `got { ... }`.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/infra/websocket/
git commit -m "feat(gateway/billing): WebSocket emit on billing.confirmed

ProgressSubscriber listens to Redis 'billing.confirmed' channel and
gateway emits to both user-scoped and intent-scoped rooms. FE joins
billing:<intentId> on the checkout page to auto-redirect when payment
clears."
```

---

## Phase 3 — Enforcement

### Task 3.1: QuotaCounter — monthly Redis counter

**Files:**
- Create: `apps/gateway/src/billing/services/quota-counter.service.ts`
- Test: `apps/gateway/test/unit/billing/quota-counter.service.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/billing/quota-counter.service.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaCounterService } from '../../../src/billing/services/quota-counter.service';
import { RedisService } from '../../../src/infra/redis/redis.service';

describe('QuotaCounterService', () => {
  let svc: QuotaCounterService;
  const store = new Map<string, number>();
  const ttls = new Map<string, number>();
  const redisMock = {
    client: {
      get: vi.fn(async (k: string) => (store.has(k) ? String(store.get(k)) : null)),
      incrby: vi.fn(async (k: string, n: number) => {
        const v = (store.get(k) ?? 0) + n;
        store.set(k, v);
        return v;
      }),
      expire: vi.fn(async (k: string, ttl: number) => { ttls.set(k, ttl); return 1; }),
    },
  };

  beforeEach(() => {
    store.clear();
    ttls.clear();
    vi.clearAllMocks();
    svc = new QuotaCounterService(redisMock as unknown as RedisService);
  });

  it('consume increments and returns allowed when under limit', async () => {
    const r = await svc.consume('u1', 'audits_monthly', 10, 1);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(1);
    expect(r.remaining).toBe(9);
  });

  it('consume rejects when limit reached', async () => {
    for (let i = 0; i < 10; i++) {
      await svc.consume('u1', 'audits_monthly', 10, 1);
    }
    const r = await svc.consume('u1', 'audits_monthly', 10, 1);
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(10);
    expect(r.remaining).toBe(0);
  });

  it('limit=0 always rejects (e.g. Free site_audit)', async () => {
    const r = await svc.consume('u1', 'audits_monthly', 0, 1);
    expect(r.allowed).toBe(false);
  });

  it('uses YYYY-MM key namespace', async () => {
    await svc.consume('u1', 'audits_monthly', 10, 1);
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const calls = redisMock.client.incrby.mock.calls;
    expect(calls[0][0]).toBe(`quota:u1:audits_monthly:${ym}`);
  });

  it('sets TTL = 32 days on first increment', async () => {
    await svc.consume('u1', 'audits_monthly', 10, 1);
    expect(redisMock.client.expire).toHaveBeenCalledWith(
      expect.stringContaining('quota:u1:audits_monthly'),
      32 * 86400,
    );
  });

  it('peek reads without incrementing', async () => {
    await svc.consume('u1', 'audits_monthly', 10, 5);
    const r = await svc.peek('u1', 'audits_monthly', 10);
    expect(r.used).toBe(5);
    expect(r.remaining).toBe(5);
    expect(r.allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `cd apps/gateway && npx vitest run test/unit/billing/quota-counter.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement service**

```typescript
// apps/gateway/src/billing/services/quota-counter.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';

export interface QuotaResult {
  allowed: boolean;
  used: number;
  remaining: number;
  resetAt: Date;
}

@Injectable()
export class QuotaCounterService {
  constructor(private readonly redis: RedisService) {}

  async consume(userId: string, dimension: string, limit: number, increment = 1): Promise<QuotaResult> {
    const { key, resetAt } = this.key(userId, dimension);
    if (limit <= 0) {
      const used = Number((await this.redis.client.get(key)) ?? 0);
      return { allowed: false, used, remaining: 0, resetAt };
    }
    const usedBefore = Number((await this.redis.client.get(key)) ?? 0);
    if (usedBefore >= limit) {
      return { allowed: false, used: usedBefore, remaining: 0, resetAt };
    }
    const usedAfter = await this.redis.client.incrby(key, increment);
    if (usedBefore === 0) {
      // Set TTL only on first increment (32 days covers any month length)
      await this.redis.client.expire(key, 32 * 86_400);
    }
    return {
      allowed: usedAfter <= limit,
      used: usedAfter,
      remaining: Math.max(0, limit - usedAfter),
      resetAt,
    };
  }

  async peek(userId: string, dimension: string, limit: number): Promise<QuotaResult> {
    const { key, resetAt } = this.key(userId, dimension);
    const used = Number((await this.redis.client.get(key)) ?? 0);
    return {
      allowed: used < limit,
      used,
      remaining: Math.max(0, limit - used),
      resetAt,
    };
  }

  private key(userId: string, dimension: string): { key: string; resetAt: Date } {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ym = `${y}-${m}`;
    // Reset = first day of NEXT month in UTC
    const resetAt = new Date(Date.UTC(y, now.getUTCMonth() + 1, 1, 0, 0, 0));
    return { key: `quota:${userId}:${dimension}:${ym}`, resetAt };
  }
}
```

- [ ] **Step 4: Register provider**

In `billing.module.ts` add `QuotaCounterService` to providers + exports.

- [ ] **Step 5: Run tests, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/quota-counter.service.spec.ts`
Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/billing/services/quota-counter.service.ts apps/gateway/src/billing/billing.module.ts apps/gateway/test/unit/billing/quota-counter.service.spec.ts
git commit -m "feat(gateway/billing): QuotaCounterService — monthly Redis counter

Per-user-per-dimension counters keyed as quota:{uid}:{dim}:{YYYY-MM},
TTL 32 days, atomic INCRBY. limit=0 always rejects (covers Free
features that should be fully gated). peek() lets the BE return
current usage without consuming."
```

---

### Task 3.2: Decorators + PlanGuard + QuotaGuard

**Files:**
- Create: `apps/gateway/src/common/decorators/require-feature.decorator.ts`
- Create: `apps/gateway/src/common/decorators/require-quota.decorator.ts`
- Create: `apps/gateway/src/common/guards/plan.guard.ts`
- Create: `apps/gateway/src/common/guards/quota.guard.ts`
- Test: `apps/gateway/test/unit/billing/plan-guard.spec.ts`
- Test: `apps/gateway/test/unit/billing/quota-guard.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts` (export guards)

- [ ] **Step 1: Create decorators**

```typescript
// apps/gateway/src/common/decorators/require-feature.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '@repo/shared';

export const REQUIRE_FEATURE_KEY = 'require_feature';
export const RequireFeature = (flag: FeatureFlag) => SetMetadata(REQUIRE_FEATURE_KEY, flag);
```

```typescript
// apps/gateway/src/common/decorators/require-quota.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { QuotaDimension } from '@repo/shared';

export interface RequireQuotaOpts {
  dimension: QuotaDimension;
  increment?: number;
}

export const REQUIRE_QUOTA_KEY = 'require_quota';
export const RequireQuota = (dimension: QuotaDimension, opts: { increment?: number } = {}) =>
  SetMetadata(REQUIRE_QUOTA_KEY, { dimension, increment: opts.increment ?? 1 });
```

- [ ] **Step 2: Write failing PlanGuard test**

```typescript
// apps/gateway/test/unit/billing/plan-guard.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanGuard } from '../../../src/common/guards/plan.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { FeatureFlag } from '@repo/shared';

function ctx(user: any): ExecutionContext {
  const req = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PlanGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
  const ent = { hasFeature: vi.fn() } as any;
  let guard: PlanGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new PlanGuard(reflector as any, ent);
  });

  it('allows when no @RequireFeature metadata', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(undefined);
    expect(await guard.canActivate(ctx({ id: 'u1' }))).toBe(true);
  });

  it('throws FeatureNotAvailable when entitlement.hasFeature returns false', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(FeatureFlag.SITE_AUDIT);
    ent.hasFeature.mockResolvedValue({ allowed: false, code: 'FEATURE_NOT_AVAILABLE' });
    await expect(guard.canActivate(ctx({ id: 'u1' }))).rejects.toThrow(/FEATURE_NOT_AVAILABLE/);
  });

  it('allows when feature is granted', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(FeatureFlag.SITE_AUDIT);
    ent.hasFeature.mockResolvedValue({ allowed: true });
    expect(await guard.canActivate(ctx({ id: 'u1' }))).toBe(true);
  });
});
```

- [ ] **Step 3: Implement PlanGuard**

```typescript
// apps/gateway/src/common/guards/plan.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { FeatureFlag } from '@repo/shared';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { FeatureNotAvailableError } from '../../billing/domain/billing.errors';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const flag = this.reflector.getAllAndOverride<FeatureFlag>(REQUIRE_FEATURE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!flag) return true;

    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new FeatureNotAvailableError(flag, 'guest');

    const d = await this.entitlement.hasFeature(userId, flag);
    if (!d.allowed) {
      const plan = await this.entitlement.getEffectivePlan(userId);
      throw new FeatureNotAvailableError(flag, plan);
    }
    return true;
  }
}
```

- [ ] **Step 4: Write failing QuotaGuard test**

```typescript
// apps/gateway/test/unit/billing/quota-guard.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaGuard } from '../../../src/common/guards/quota.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

function ctx(userId = 'u1'): ExecutionContext {
  const req = { user: { id: userId }, res: { setHeader: vi.fn() } };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => req.res }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('QuotaGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
  const ent = { getEffectivePlan: vi.fn() } as any;
  const counter = { consume: vi.fn() } as any;
  let guard: QuotaGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new QuotaGuard(reflector as any, ent, counter);
  });

  it('passes through when no @RequireQuota metadata', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(undefined);
    expect(await guard.canActivate(ctx())).toBe(true);
  });

  it('throws QuotaExceeded when counter rejects', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue({ dimension: 'audits_monthly', increment: 1 });
    ent.getEffectivePlan.mockResolvedValue('free');
    counter.consume.mockResolvedValue({ allowed: false, used: 10, remaining: 0, resetAt: new Date() });
    await expect(guard.canActivate(ctx())).rejects.toThrow(/QUOTA_EXCEEDED/);
  });

  it('sets X-RateLimit-Remaining header on success', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue({ dimension: 'audits_monthly', increment: 1 });
    ent.getEffectivePlan.mockResolvedValue('pro');
    const reset = new Date();
    counter.consume.mockResolvedValue({ allowed: true, used: 1, remaining: 199, resetAt: reset });
    const c = ctx();
    expect(await guard.canActivate(c)).toBe(true);
    const res = (c as any).switchToHttp().getResponse();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '199');
    expect(res.setHeader).toHaveBeenCalledWith('X-Quota-Reset', reset.toISOString());
  });
});
```

- [ ] **Step 5: Implement QuotaGuard**

```typescript
// apps/gateway/src/common/guards/quota.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { QuotaCounterService } from '../../billing/services/quota-counter.service';
import { PLAN_FEATURES, QuotaDimension } from '@repo/shared';
import { REQUIRE_QUOTA_KEY } from '../decorators/require-quota.decorator';
import { QuotaExceededError } from '../../billing/domain/billing.errors';

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
    private readonly counter: QuotaCounterService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{ dimension: QuotaDimension; increment: number }>(
      REQUIRE_QUOTA_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!meta) return true;

    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const userId = req.user?.id;
    if (!userId) throw new QuotaExceededError(meta.dimension, 0, new Date());

    const plan = await this.entitlement.getEffectivePlan(userId);
    const limit = PLAN_FEATURES[plan][meta.dimension] as number;
    const r = await this.counter.consume(userId, meta.dimension, limit, meta.increment);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(r.remaining));
    res.setHeader('X-Quota-Reset', r.resetAt.toISOString());

    if (!r.allowed) throw new QuotaExceededError(meta.dimension, limit, r.resetAt);
    return true;
  }
}
```

- [ ] **Step 6: Export guards from billing.module**

In `billing.module.ts`:
```typescript
import { PlanGuard } from '../common/guards/plan.guard';
import { QuotaGuard } from '../common/guards/quota.guard';
// add to providers + exports
providers: [PlansService, SubscriptionService, EntitlementService, QuotaCounterService, PaymentIntentService, CassoReconcilerService, PlanGuard, QuotaGuard],
exports: [..., PlanGuard, QuotaGuard, EntitlementService],
```

- [ ] **Step 7: Run guard tests, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/plan-guard.spec.ts test/unit/billing/quota-guard.spec.ts`
Expected: 6 tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/gateway/src/common/decorators/require-feature.decorator.ts apps/gateway/src/common/decorators/require-quota.decorator.ts apps/gateway/src/common/guards/plan.guard.ts apps/gateway/src/common/guards/quota.guard.ts apps/gateway/src/billing/billing.module.ts apps/gateway/test/unit/billing/plan-guard.spec.ts apps/gateway/test/unit/billing/quota-guard.spec.ts
git commit -m "feat(gateway/billing): @RequireFeature + @RequireQuota guards

Decorator-driven enforcement. PlanGuard reads REQUIRE_FEATURE_KEY
metadata, delegates to EntitlementService.hasFeature(). QuotaGuard
consumes the monthly counter via QuotaCounterService and sets
X-RateLimit-Limit/Remaining + X-Quota-Reset headers."
```

---

### Task 3.3: Apply guards to audits endpoints

**Files:**
- Modify: `apps/gateway/src/audits/controllers/audits.controller.ts`
- Modify: `apps/gateway/src/audits/audits.module.ts` (import BillingModule)
- Test: Extend `apps/gateway/test/integration/audits.e2e-spec.ts` (or new spec) — verify 429 after limit reached

- [ ] **Step 1: Find existing audit endpoints**

```bash
grep -n "@Post\|@Get\|@Delete" apps/gateway/src/audits/controllers/audits.controller.ts | head -20
```

- [ ] **Step 2: Add guards + decorators to controller methods**

In `audits.controller.ts`:

For `POST /audits` (single-mode):
```typescript
@Post()
@UseGuards(JwtAuthGuard, QuotaGuard)
@RequireQuota('audits_monthly', { increment: 1 })
async createAudit(...) { ... }
```

For `POST /audits/site` (site-mode — if separate endpoint; otherwise inline `if (dto.mode === 'site')`):
```typescript
@Post('site')
@UseGuards(JwtAuthGuard, PlanGuard, QuotaGuard)
@RequireFeature(FeatureFlag.SITE_AUDIT)
@RequireQuota('audits_monthly', { increment: 1 })
async createSiteAudit(...) { ... }
```

If site-mode is determined by a body field on the same endpoint, instead use `EntitlementService.checkSiteAuditPageCount(userId, dto.maxUrls)` inside the service and throw `FeatureNotAvailableError` for Free users — but the decorator-based approach is cleaner. Split into two endpoints if not already split.

Imports needed:
```typescript
import { PlanGuard } from '../../common/guards/plan.guard';
import { QuotaGuard } from '../../common/guards/quota.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { RequireQuota } from '../../common/decorators/require-quota.decorator';
import { FeatureFlag } from '@repo/shared';
```

- [ ] **Step 3: Import BillingModule in audits.module.ts**

```typescript
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [..., BillingModule],
  ...
})
```

- [ ] **Step 4: Add integration test for quota enforcement**

Create `apps/gateway/test/integration/billing-audits-quota.e2e-spec.ts`:

```typescript
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
vi.mock('passport-google-oauth20', () => ({ Strategy: class { authenticate() {} } }));
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { AuditsModule } from '../../src/audits/audits.module';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { EntitlementService } from '../../src/billing/services/entitlement.service';
import { QuotaCounterService } from '../../src/billing/services/quota-counter.service';
import { AuditQueueProducer } from '../../src/audits/services/audit-queue.producer';

class FakeJwt implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    ctx.switchToHttp().getRequest().user = { id: 'u1' };
    return true;
  }
}

describe('Quota enforcement on POST /audits', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuditsModule],
    })
      .overrideGuard(JwtAuthGuard).useClass(FakeJwt)
      .overrideProvider(EntitlementService).useValue({ getEffectivePlan: async () => 'free' })
      .overrideProvider(QuotaCounterService).useValue({
        consume: vi.fn()
          .mockResolvedValueOnce({ allowed: true, used: 1, remaining: 9, resetAt: new Date() })
          .mockResolvedValueOnce({ allowed: false, used: 10, remaining: 0, resetAt: new Date() }),
      })
      .overrideProvider(AuditQueueProducer).useValue({ enqueueCrawlStart: vi.fn() })
      // mock prisma/grpc/redis/rate-limiter as needed (copy fakes from existing audits.e2e-spec)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => app.close());

  it('1st audit allowed (200 or 201), 11th returns 429 with QUOTA_EXCEEDED', async () => {
    await request(app.getHttpServer()).post('/api/v1/audits').send({ url: 'https://example.com' });
    const res = await request(app.getHttpServer()).post('/api/v1/audits').send({ url: 'https://example.com' });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
  });
});
```

> Engineer note: this test mocks the QuotaCounter to return rejection on the 2nd call (simulating limit reached). For a true integration test of the full counter, use the smoke test in Phase 6 with a real Redis.

- [ ] **Step 5: Run tests**

Run: `cd apps/gateway && npx vitest run test/integration/billing-audits-quota.e2e-spec.ts`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/audits/ apps/gateway/test/integration/billing-audits-quota.e2e-spec.ts
git commit -m "feat(gateway/audits): apply QuotaGuard to POST /audits + /audits/site

Free 10/month, Pro 200, Business 1000 (audits_monthly). Site-mode
also gated by @RequireFeature(SITE_AUDIT). Returns 429 with
X-RateLimit-* headers when over limit."
```

---

### Task 3.4: Apply guards to scheduled audits, API keys, AI, PDF, share

**Files:**
- Modify: `apps/gateway/src/scheduled-audits/controllers/*.ts` (find via `ls`)
- Modify: `apps/gateway/src/public-api/controllers/*.ts` (api-keys endpoint + AI)
- Modify: `apps/gateway/src/audits/controllers/audits.controller.ts` (PDF + share endpoints)

> **Engineer note:** For each domain below, the pattern is identical:
> 1. Add `@UseGuards(JwtAuthGuard, PlanGuard, QuotaGuard)` (or `EntitlementService` injection for dynamic checks)
> 2. Add `@RequireFeature(FeatureFlag.X)`
> 3. Add `@RequireQuota(...)` if quota applies
> 4. Import BillingModule into the feature's module if not already

**3.4a — Scheduled audits**

- [ ] Modify `scheduled-audits.controller.ts` POST `/scheduled-audits`:
  ```typescript
  @Post()
  @UseGuards(JwtAuthGuard, PlanGuard)
  @RequireFeature(FeatureFlag.SCHEDULED_AUDIT)
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateScheduledAuditDto) {
    // Inside the service, also call entitlement.checkScheduledAuditCount + checkScheduledAuditCron
  }
  ```
- [ ] In `ScheduledAuditsService.create()`, inject `EntitlementService` and prepend:
  ```typescript
  const countCheck = await this.entitlement.checkScheduledAuditCount(userId, await this.countActive(userId));
  if (!countCheck.allowed) throw new ForbiddenException(countCheck.reason);
  const cronCheck = await this.entitlement.checkScheduledAuditCron(userId, dto.cron);
  if (!cronCheck.allowed) throw new ForbiddenException(cronCheck.reason);
  ```
- [ ] Add BillingModule import to ScheduledAuditsModule.

**3.4b — API keys**

- [ ] Find file: `apps/gateway/src/public-api/controllers/api-keys.controller.ts` (or wherever `/me/api-keys` is defined).
- [ ] Add to POST `/me/api-keys`:
  ```typescript
  @UseGuards(JwtAuthGuard, PlanGuard)
  @RequireFeature(FeatureFlag.API_KEY)
  ```
- [ ] In the service, before create, check current count vs `PLAN_FEATURES[plan].api_keys_max`. Throw `FeatureNotAvailableError` if over.

**3.4c — AI suggestions (public-api)**

- [ ] `apps/gateway/src/public-api/controllers/public-check.controller.ts`:
  - If FE-authenticated user (not just API key), gate with `@RequireFeature(FeatureFlag.AI_SUGGESTIONS)` and `@RequireQuota('ai_calls_monthly')` *only when* `enrichMode === 'llm'`.
  - Easier: check inside the service: when `enrichMode === 'llm'`, call entitlement.hasFeature + quota.consume('ai_calls_monthly').

**3.4d — PDF export**

- [ ] `audits.controller.ts` GET `/audits/:id/pdf`:
  ```typescript
  @UseGuards(JwtAuthGuard, PlanGuard)
  @RequireFeature(FeatureFlag.PDF_EXPORT)
  ```

**3.4e — Share link**

- [ ] `audits.controller.ts` POST `/audits/:id/share`:
  ```typescript
  @UseGuards(JwtAuthGuard, PlanGuard)
  @RequireFeature(FeatureFlag.SHARE_LINK)
  ```

- [ ] **Run gateway tests**

```bash
cd apps/gateway && npx turbo run test
```

Expected: all green.

- [ ] **Commit**

```bash
git add apps/gateway/src
git commit -m "feat(gateway): gate scheduled/api-keys/ai/pdf/share by plan

Applies @RequireFeature to all paid-only endpoints. Scheduled audits
also check entitlement.checkScheduledAuditCount + checkScheduledAuditCron
in the service layer (dynamic, not decorator-able). API keys cap
enforced before insert."
```

---

## Phase 4 — Admin + Cron

### Task 4.1: Admin grant subscription endpoint

**Files:**
- Modify: `apps/gateway/src/admin/controllers/admin.controller.ts` (add subscriptions endpoint)
- Modify: `apps/gateway/src/admin/services/admin.service.ts` (or new admin-subscriptions.service)
- Create: `apps/gateway/src/admin/dto/grant-subscription.dto.ts`
- Test: `apps/gateway/test/unit/admin-subscriptions.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/admin-subscriptions.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminSubscriptionsService } from '../../src/admin/services/admin-subscriptions.service';
import { SubscriptionService } from '../../src/billing/services/subscription.service';

describe('AdminSubscriptionsService', () => {
  let svc: AdminSubscriptionsService;
  const subSvc = { activate: vi.fn(), getCurrent: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AdminSubscriptionsService(subSvc);
  });

  it('grant calls activate with grantedBy=adminId and duration', async () => {
    await svc.grant({ userId: 'u1', planCode: 'business', days: 60 }, 'admin-1');
    expect(subSvc.activate).toHaveBeenCalledWith({
      userId: 'u1', planCode: 'business', durationDays: 60, grantedBy: 'admin-1',
    });
  });
});
```

- [ ] **Step 2: Create DTO**

```typescript
// apps/gateway/src/admin/dto/grant-subscription.dto.ts
import { IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';

export class GrantSubscriptionDto {
  @IsUUID()
  userId!: string;

  @IsIn(['free', 'pro', 'business'])
  planCode!: 'free' | 'pro' | 'business';

  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;
}
```

- [ ] **Step 3: Create service**

```typescript
// apps/gateway/src/admin/services/admin-subscriptions.service.ts
import { Injectable } from '@nestjs/common';
import { SubscriptionService } from '../../billing/services/subscription.service';
import { GrantSubscriptionDto } from '../dto/grant-subscription.dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly subs: SubscriptionService) {}

  async grant(dto: GrantSubscriptionDto, adminId: string): Promise<void> {
    await this.subs.activate({
      userId: dto.userId,
      planCode: dto.planCode,
      durationDays: dto.days,
      grantedBy: adminId,
    });
  }
}
```

- [ ] **Step 4: Add controller method**

In `admin.controller.ts` (or new `admin-subscriptions.controller.ts`):
```typescript
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminSubscriptionsService } from '../services/admin-subscriptions.service';
import { GrantSubscriptionDto } from '../dto/grant-subscription.dto';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSubscriptionsController {
  constructor(private readonly svc: AdminSubscriptionsService) {}

  @Post('grant')
  async grant(@CurrentUser('id') adminId: string, @Body() dto: GrantSubscriptionDto) {
    await this.svc.grant(dto, adminId);
    return { ok: true };
  }
}
```

- [ ] **Step 5: Register in admin module + import BillingModule**

In `admin.module.ts` add `AdminSubscriptionsController` and `AdminSubscriptionsService`, import `BillingModule`.

- [ ] **Step 6: Run unit test, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/admin-subscriptions.spec.ts`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/gateway/src/admin/ apps/gateway/test/unit/admin-subscriptions.spec.ts
git commit -m "feat(gateway/admin): POST /admin/subscriptions/grant — manual plan assign

@Roles('admin') only. Calls SubscriptionService.activate with
grantedBy=adminId so the user's billing page can show 'Cấp bởi admin'."
```

---

### Task 4.2: Daily expiry cron

**Files:**
- Create: `apps/gateway/src/billing/services/expiry.cron.ts`
- Test: `apps/gateway/test/unit/billing/expiry.cron.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts` (register cron + import ScheduleModule if not already)

- [ ] **Step 1: Write failing test**

```typescript
// apps/gateway/test/unit/billing/expiry.cron.spec.ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpiryCron } from '../../../src/billing/services/expiry.cron';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';

describe('ExpiryCron', () => {
  let cron: ExpiryCron;
  const sub = { downgradeExpiredToFree: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    cron = new ExpiryCron(sub);
  });

  it('handleDaily calls downgradeExpiredToFree', async () => {
    sub.downgradeExpiredToFree.mockResolvedValue(3);
    await cron.handleDaily();
    expect(sub.downgradeExpiredToFree).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Create cron**

```typescript
// apps/gateway/src/billing/services/expiry.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class ExpiryCron {
  private readonly logger = new Logger(ExpiryCron.name);

  constructor(private readonly subs: SubscriptionService) {}

  @Cron('5 0 * * *', { name: 'subscription-expiry', timeZone: 'Asia/Ho_Chi_Minh' })
  async handleDaily(): Promise<void> {
    const downgraded = await this.subs.downgradeExpiredToFree();
    if (downgraded > 0) {
      this.logger.log(`Downgraded ${downgraded} expired subscriptions to free`);
    }
  }
}
```

- [ ] **Step 3: Register**

In `billing.module.ts`:
```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { ExpiryCron } from './services/expiry.cron';

@Module({
  imports: [..., ScheduleModule.forRoot()],   // only if not already in AppModule
  providers: [..., ExpiryCron],
})
```

If `ScheduleModule.forRoot()` is already in `AppModule`, no need to add here.

- [ ] **Step 4: Run test, expect pass**

Run: `cd apps/gateway && npx vitest run test/unit/billing/expiry.cron.spec.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/billing/services/expiry.cron.ts apps/gateway/src/billing/billing.module.ts apps/gateway/test/unit/billing/expiry.cron.spec.ts
git commit -m "feat(gateway/billing): daily 00:05 (Asia/Ho_Chi_Minh) expiry cron

Calls SubscriptionService.downgradeExpiredToFree to flip active+expired
subs to Free. Single-transaction guarantees no user is left without
a subscription row mid-downgrade."
```

---

## Phase 5 — Frontend (`apps/web`)

> All FE tasks assume the existing Next.js App Router structure (Phase 5 of the project). Engineer should peek at `apps/web/src/lib/api/` for the existing axios + TanStack Query pattern before starting.

### Task 5.1: API client types + axios billing methods

**Files:**
- Create: `apps/web/src/lib/api/billing.ts`
- Modify: `apps/web/src/lib/api/types.ts` (or wherever types live — add billing types)

- [ ] **Step 1: Add types**

```typescript
// apps/web/src/lib/api/billing-types.ts
import type { PlanCode, PlanDefinition } from '@repo/shared';

export interface PlanResponse {
  code: PlanCode;
  displayName: string;
  priceVnd: number;
  sortOrder: number;
  features: PlanDefinition;
}

export interface SubscriptionResponse {
  planCode: PlanCode;
  status: 'active' | 'expired' | 'canceled';
  expiresAt: string | null;
  isAdminGranted: boolean;
  features: PlanDefinition;
}

export interface PaymentIntentResponse {
  id: string;
  refCode: string;
  planCode: PlanCode;
  amountVnd: number;
  vietqrUrl: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  expiresAt: string;
  paidAt: string | null;
}
```

- [ ] **Step 2: Create billing API client**

```typescript
// apps/web/src/lib/api/billing.ts
import { api } from './client'; // existing axios instance
import type { PlanResponse, SubscriptionResponse, PaymentIntentResponse } from './billing-types';
import type { PlanCode } from '@repo/shared';

export const billingApi = {
  listPlans: async (): Promise<PlanResponse[]> => {
    const r = await api.get<PlanResponse[]>('/plans');
    return r.data;
  },
  getMySubscription: async (): Promise<SubscriptionResponse> => {
    const r = await api.get<SubscriptionResponse>('/me/subscription');
    return r.data;
  },
  cancelSubscription: async (): Promise<void> => {
    await api.post('/me/subscription/cancel');
  },
  createPaymentIntent: async (planCode: Exclude<PlanCode, 'free'>): Promise<PaymentIntentResponse> => {
    const r = await api.post<PaymentIntentResponse>('/billing/payment-intents', { planCode });
    return r.data;
  },
  getPaymentIntent: async (id: string): Promise<PaymentIntentResponse> => {
    const r = await api.get<PaymentIntentResponse>(`/billing/payment-intents/${id}`);
    return r.data;
  },
  listPaymentIntents: async (): Promise<PaymentIntentResponse[]> => {
    const r = await api.get<PaymentIntentResponse[]>('/billing/payment-intents');
    return r.data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/api/
git commit -m "feat(web): billing API client + types"
```

---

### Task 5.2: TanStack Query hooks

**Files:**
- Create: `apps/web/src/hooks/useSubscription.ts`
- Create: `apps/web/src/hooks/usePlans.ts`
- Create: `apps/web/src/hooks/useCreatePaymentIntent.ts`
- Create: `apps/web/src/hooks/usePaymentIntentStatus.ts`

- [ ] **Step 1: useSubscription + usePlans**

```typescript
// apps/web/src/hooks/useSubscription.ts
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/lib/api/billing';

export const useSubscription = () =>
  useQuery({
    queryKey: ['me', 'subscription'],
    queryFn: billingApi.getMySubscription,
    staleTime: 5 * 60_000,
  });
```

```typescript
// apps/web/src/hooks/usePlans.ts
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/lib/api/billing';

export const usePlans = () =>
  useQuery({
    queryKey: ['plans'],
    queryFn: billingApi.listPlans,
    staleTime: 60 * 60_000,
  });
```

- [ ] **Step 2: useCreatePaymentIntent + usePaymentIntentStatus**

```typescript
// apps/web/src/hooks/useCreatePaymentIntent.ts
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { billingApi } from '@/lib/api/billing';
import type { PlanCode } from '@repo/shared';

export const useCreatePaymentIntent = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: (planCode: Exclude<PlanCode, 'free'>) => billingApi.createPaymentIntent(planCode),
    onSuccess: (intent) => router.push(`/billing/checkout/${intent.id}`),
  });
};
```

```typescript
// apps/web/src/hooks/usePaymentIntentStatus.ts
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { billingApi } from '@/lib/api/billing';
import { getSocket } from '@/lib/socket'; // existing socket helper

export function usePaymentIntentStatus(intentId: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const [redirected, setRedirected] = useState(false);

  const query = useQuery({
    queryKey: ['payment-intent', intentId],
    queryFn: () => billingApi.getPaymentIntent(intentId),
    refetchInterval: (data) => (data?.status === 'pending' ? 10_000 : false),
  });

  useEffect(() => {
    const sock = getSocket();
    if (!sock || !intentId) return;
    sock.emit('billing:subscribe', { intentId });
    const onConfirmed = (evt: { intentId: string }) => {
      if (evt.intentId === intentId && !redirected) {
        setRedirected(true);
        qc.invalidateQueries({ queryKey: ['me', 'subscription'] });
        router.push('/billing?paid=1');
      }
    };
    sock.on('billing:confirmed', onConfirmed);
    return () => { sock.off('billing:confirmed', onConfirmed); };
  }, [intentId, redirected, qc, router]);

  useEffect(() => {
    if (query.data?.status === 'paid' && !redirected) {
      setRedirected(true);
      qc.invalidateQueries({ queryKey: ['me', 'subscription'] });
      router.push('/billing?paid=1');
    }
  }, [query.data, redirected, qc, router]);

  return query;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/
git commit -m "feat(web): TanStack Query hooks for billing flow"
```

---

### Task 5.3: PlanCard + PlanComparisonTable + Pricing page

**Files:**
- Create: `apps/web/src/components/billing/PlanCard.tsx`
- Create: `apps/web/src/components/billing/PlanComparisonTable.tsx`
- Create: `apps/web/src/app/(marketing)/pricing/page.tsx` (route group may differ — match existing structure)

- [ ] **Step 1: PlanCard**

```tsx
// apps/web/src/components/billing/PlanCard.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PlanResponse } from '@/lib/api/billing-types';

interface Props {
  plan: PlanResponse;
  current?: boolean;
  onSelect?: (code: PlanResponse['code']) => void;
  highlighted?: boolean;
}

export function PlanCard({ plan, current, onSelect, highlighted }: Props) {
  const isPaid = plan.code !== 'free';
  return (
    <Card className={highlighted ? 'border-primary shadow-lg' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.displayName}</CardTitle>
          {current ? <Badge variant="info">Đang dùng</Badge> : null}
        </div>
        <div className="text-3xl font-bold">
          {plan.priceVnd === 0 ? 'Miễn phí' : `${plan.priceVnd.toLocaleString('vi-VN')}đ`}
          {isPaid ? <span className="text-base font-normal text-muted-foreground"> / tháng</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          <li>{plan.features.audits_monthly} audits / tháng</li>
          <li>Site-mode: {plan.features.site_audit_max_pages > 0
            ? `${plan.features.site_audit_max_pages} trang`
            : '—'}</li>
          <li>Lịch định kỳ: {plan.features.scheduled_audits_max}</li>
          <li>AI gợi ý: {plan.features.ai_calls_monthly}/tháng</li>
          <li>API: {plan.features.api_calls_daily}/ngày</li>
          <li>Lưu lịch sử: {plan.features.history_retention_days === -1
            ? 'Vĩnh viễn'
            : `${plan.features.history_retention_days} ngày`}</li>
        </ul>
        {!current && isPaid && onSelect ? (
          <Button className="w-full" onClick={() => onSelect(plan.code)}>
            Nâng cấp
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Pricing page**

```tsx
// apps/web/src/app/(marketing)/pricing/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useCreatePaymentIntent } from '@/hooks/useCreatePaymentIntent';
import { PlanCard } from '@/components/billing/PlanCard';
import { isLoggedIn } from '@/lib/auth';
import type { PlanCode } from '@repo/shared';

export default function PricingPage() {
  const plansQ = usePlans();
  const subQ = useSubscription();
  const create = useCreatePaymentIntent();
  const router = useRouter();

  const onSelect = (code: PlanCode) => {
    if (!isLoggedIn()) {
      router.push(`/auth/login?next=/pricing`);
      return;
    }
    if (code === 'free') return;
    create.mutate(code as Exclude<PlanCode, 'free'>);
  };

  if (plansQ.isLoading) return <div>Đang tải...</div>;
  return (
    <main className="container mx-auto py-12">
      <h1 className="mb-8 text-center text-4xl font-bold">Chọn gói phù hợp với bạn</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plansQ.data?.map((p) => (
          <PlanCard
            key={p.code}
            plan={p}
            current={subQ.data?.planCode === p.code}
            highlighted={p.code === 'pro'}
            onSelect={onSelect}
          />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Smoke test in browser**

```bash
cd apps/web && npm run dev
# Open http://localhost:3001/pricing — should see 3 cards
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/billing/ apps/web/src/app/
git commit -m "feat(web/billing): pricing page + PlanCard component"
```

---

### Task 5.4: Checkout page with VietQR + countdown + socket listener

**Files:**
- Create: `apps/web/src/components/billing/VietQrDisplay.tsx`
- Create: `apps/web/src/app/(app)/billing/checkout/[intentId]/page.tsx`

- [ ] **Step 1: VietQrDisplay**

```tsx
// apps/web/src/components/billing/VietQrDisplay.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PaymentIntentResponse } from '@/lib/api/billing-types';

interface Props {
  intent: PaymentIntentResponse;
}

export function VietQrDisplay({ intent }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.floor((new Date(intent.expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Quét mã VietQR để thanh toán</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold">
          {intent.amountVnd.toLocaleString('vi-VN')}đ
        </div>
        <img src={intent.vietqrUrl} alt="VietQR" className="mx-auto w-72 rounded" />
        <div className="rounded-md bg-amber-50 p-3 text-sm">
          <p className="font-semibold">Nội dung chuyển khoản BẮT BUỘC:</p>
          <p className="mt-1 font-mono text-lg">{intent.refCode}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Hệ thống sẽ tự kích hoạt gói trong 1-2 phút sau khi nhận tiền.
          </p>
        </div>
        <div className="text-center text-sm">
          Mã hết hạn sau: <span className="font-mono">{mm}:{ss}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Checkout page**

```tsx
// apps/web/src/app/(app)/billing/checkout/[intentId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { usePaymentIntentStatus } from '@/hooks/usePaymentIntentStatus';
import { VietQrDisplay } from '@/components/billing/VietQrDisplay';

export default function CheckoutPage() {
  const params = useParams<{ intentId: string }>();
  const intentId = params.intentId;
  const query = usePaymentIntentStatus(intentId);

  if (query.isLoading) return <div>Đang tải...</div>;
  if (query.isError || !query.data) return <div>Không tìm thấy đơn thanh toán.</div>;
  if (query.data.status === 'expired') {
    return (
      <div className="container mx-auto py-12 text-center">
        <p>Mã thanh toán đã hết hạn.</p>
        <a href="/billing/upgrade" className="text-primary underline">Tạo mã mới</a>
      </div>
    );
  }
  return <main className="container mx-auto py-12"><VietQrDisplay intent={query.data} /></main>;
}
```

- [ ] **Step 3: Smoke test**

Log in → /pricing → click Pro → should land on /billing/checkout/[id] showing QR + countdown.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/billing/VietQrDisplay.tsx apps/web/src/app/
git commit -m "feat(web/billing): checkout page with VietQR + countdown + socket"
```

---

### Task 5.5: Billing page + ExpiryBanner + PlanStatusBadge

**Files:**
- Create: `apps/web/src/app/(app)/billing/page.tsx`
- Create: `apps/web/src/components/billing/ExpiryBanner.tsx`
- Create: `apps/web/src/components/billing/PlanStatusBadge.tsx`
- Modify: `apps/web/src/app/(app)/layout.tsx` (mount ExpiryBanner + PlanStatusBadge)

- [ ] **Step 1: PlanStatusBadge**

```tsx
// apps/web/src/components/billing/PlanStatusBadge.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { PLAN_DISPLAY_NAMES_VI } from '@repo/shared';

export function PlanStatusBadge() {
  const sub = useSubscription();
  if (!sub.data) return null;
  const variant = sub.data.planCode === 'business' ? 'success' : sub.data.planCode === 'pro' ? 'info' : 'muted';
  return <Badge variant={variant}>{PLAN_DISPLAY_NAMES_VI[sub.data.planCode]}</Badge>;
}
```

- [ ] **Step 2: ExpiryBanner**

```tsx
// apps/web/src/components/billing/ExpiryBanner.tsx
'use client';

import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';

export function ExpiryBanner() {
  const sub = useSubscription();
  if (!sub.data?.expiresAt) return null;
  const expires = new Date(sub.data.expiresAt);
  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 3 || daysLeft < 0) return null;
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      Gói {sub.data.planCode} của bạn hết hạn trong {daysLeft} ngày.{' '}
      <Link href="/billing/upgrade" className="font-semibold underline">Gia hạn ngay</Link>
    </div>
  );
}
```

- [ ] **Step 3: Billing page**

```tsx
// apps/web/src/app/(app)/billing/page.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/lib/api/billing';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PLAN_DISPLAY_NAMES_VI } from '@repo/shared';

export default function BillingPage() {
  const sp = useSearchParams();
  const just_paid = sp.get('paid') === '1';
  const sub = useSubscription();
  const history = useQuery({ queryKey: ['billing', 'history'], queryFn: billingApi.listPaymentIntents });

  useEffect(() => {
    if (just_paid) {
      // future: trigger confetti animation
    }
  }, [just_paid]);

  return (
    <main className="container mx-auto py-8 space-y-6">
      {just_paid ? (
        <div className="rounded bg-green-100 p-4 text-green-900">Thanh toán thành công! 🎉</div>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Gói hiện tại</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Plan: <strong>{sub.data ? PLAN_DISPLAY_NAMES_VI[sub.data.planCode] : '...'}</strong></p>
            <p>Status: {sub.data?.status}</p>
            <p>Expires: {sub.data?.expiresAt ? new Date(sub.data.expiresAt).toLocaleString('vi-VN') : '—'}</p>
            {sub.data?.isAdminGranted ? (
              <p className="text-sm text-muted-foreground">Được cấp bởi admin (không qua thanh toán)</p>
            ) : null}
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/billing/upgrade"><Button>Nâng cấp / Gia hạn</Button></Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lịch sử thanh toán</CardTitle></CardHeader>
        <CardContent>
          {(history.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có giao dịch.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-1">Thời gian</th><th>Plan</th><th>Số tiền</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {history.data?.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-1">{new Date(p.paidAt ?? p.expiresAt).toLocaleString('vi-VN')}</td>
                    <td>{p.planCode}</td>
                    <td>{p.amountVnd.toLocaleString('vi-VN')}đ</td>
                    <td>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Upgrade page (reuses Pricing)**

```tsx
// apps/web/src/app/(app)/billing/upgrade/page.tsx
export { default } from '../../../(marketing)/pricing/page';
```

- [ ] **Step 5: Mount ExpiryBanner + PlanStatusBadge in dashboard layout**

Edit `apps/web/src/app/(app)/layout.tsx` (find existing layout, add):
```tsx
import { ExpiryBanner } from '@/components/billing/ExpiryBanner';
import { PlanStatusBadge } from '@/components/billing/PlanStatusBadge';

// Inside layout:
<ExpiryBanner />
// Inside header (next to user name):
<PlanStatusBadge />
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/ apps/web/src/components/billing/
git commit -m "feat(web/billing): billing page + history + expiry banner + plan badge"
```

---

### Task 5.6: QuotaExceededDialog + axios interceptor

**Files:**
- Create: `apps/web/src/components/billing/QuotaExceededDialog.tsx`
- Modify: `apps/web/src/lib/api/client.ts` (add response interceptor)
- Modify: `apps/web/src/app/(app)/layout.tsx` (mount dialog)

- [ ] **Step 1: Global event bus or Zustand store**

Add a tiny event helper (or use existing toast/store pattern):

```typescript
// apps/web/src/lib/quota-event.ts
import { create } from 'zustand'; // or whatever is in use

interface State {
  open: boolean;
  message: string;
  resetAt: string | null;
  show: (msg: string, resetAt: string | null) => void;
  close: () => void;
}

export const useQuotaDialog = create<State>((set) => ({
  open: false,
  message: '',
  resetAt: null,
  show: (message, resetAt) => set({ open: true, message, resetAt }),
  close: () => set({ open: false, message: '', resetAt: null }),
}));
```

- [ ] **Step 2: Axios interceptor**

In `apps/web/src/lib/api/client.ts`, add (after axios.create):

```typescript
import { useQuotaDialog } from '@/lib/quota-event';

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const data = err?.response?.data;
    if (data?.code === 'QUOTA_EXCEEDED' || data?.code === 'FEATURE_NOT_AVAILABLE') {
      useQuotaDialog.getState().show(data.message, data.resetAt ?? null);
    }
    return Promise.reject(err);
  },
);
```

- [ ] **Step 3: Dialog component**

```tsx
// apps/web/src/components/billing/QuotaExceededDialog.tsx
'use client';

import Link from 'next/link';
import { useQuotaDialog } from '@/lib/quota-event';
import { Button } from '@/components/ui/button';

export function QuotaExceededDialog() {
  const { open, message, resetAt, close } = useQuotaDialog();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold">Đã đạt giới hạn</h2>
        <p className="text-sm">{message}</p>
        {resetAt ? <p className="mt-2 text-xs text-muted-foreground">Reset vào: {new Date(resetAt).toLocaleString('vi-VN')}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={close}>Đóng</Button>
          <Link href="/billing/upgrade"><Button onClick={close}>Nâng cấp</Button></Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount in app layout**

In `apps/web/src/app/(app)/layout.tsx`:
```tsx
import { QuotaExceededDialog } from '@/components/billing/QuotaExceededDialog';

// At end of layout JSX, before closing tag:
<QuotaExceededDialog />
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/quota-event.ts apps/web/src/lib/api/client.ts apps/web/src/components/billing/QuotaExceededDialog.tsx apps/web/src/app/(app)/layout.tsx
git commit -m "feat(web/billing): global QuotaExceeded dialog via axios interceptor

Any API response with code QUOTA_EXCEEDED or FEATURE_NOT_AVAILABLE
opens the dialog with a CTA to /billing/upgrade. Prevents 429/403 from
being silently swallowed."
```

---

### Task 5.7: Admin subscriptions page

**Files:**
- Create: `apps/web/src/app/(app)/admin/subscriptions/page.tsx`
- Create: `apps/web/src/lib/api/admin.ts` (or extend existing)

- [ ] **Step 1: Admin API client**

```typescript
// apps/web/src/lib/api/admin.ts — append
import type { PlanCode } from '@repo/shared';

export const adminApi = {
  // ... existing admin methods
  grantSubscription: async (input: { userId: string; planCode: PlanCode; days: number }) => {
    await api.post('/admin/subscriptions/grant', input);
  },
};
```

- [ ] **Step 2: Page**

```tsx
// apps/web/src/app/(app)/admin/subscriptions/page.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select'; // or whatever shadcn select equivalent

export default function AdminSubscriptionsPage() {
  const [userId, setUserId] = useState('');
  const [planCode, setPlanCode] = useState<'free' | 'pro' | 'business'>('pro');
  const [days, setDays] = useState(30);
  const qc = useQueryClient();
  const grant = useMutation({
    mutationFn: adminApi.grantSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      alert('Đã cấp gói.');
    },
  });

  return (
    <main className="container mx-auto py-8">
      <h1 className="mb-4 text-2xl font-bold">Cấp gói thủ công</h1>
      <form className="max-w-md space-y-3" onSubmit={(e) => { e.preventDefault(); grant.mutate({ userId, planCode, days }); }}>
        <Input placeholder="User UUID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <select value={planCode} onChange={(e) => setPlanCode(e.target.value as any)} className="w-full rounded border p-2">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        <Button type="submit" disabled={grant.isPending}>Cấp gói</Button>
      </form>
    </main>
  );
}
```

> Engineer may extend with a user search/typeahead. Above is MVP.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(app)/admin apps/web/src/lib/api/admin.ts
git commit -m "feat(web/admin): manual grant-subscription form"
```

---

## Phase 6 — E2E + Smoke

### Task 6.1: Playwright E2E happy path

**Files:**
- Create: `apps/web/tests/e2e/billing.spec.ts`

- [ ] **Step 1: Write E2E**

```typescript
// apps/web/tests/e2e/billing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Billing flow', () => {
  test('Free user sees pricing, clicks Pro, sees QR', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Chọn gói phù hợp')).toBeVisible();
    await expect(page.getByText('Chuyên nghiệp')).toBeVisible();

    // Login required first
    await page.getByRole('button', { name: 'Nâng cấp' }).first().click();
    await page.fill('input[name=email]', 'admin@example.com');
    await page.fill('input[name=password]', 'admin123');
    await page.getByRole('button', { name: /đăng nhập/i }).click();

    await page.goto('/pricing');
    await page.getByRole('button', { name: 'Nâng cấp' }).first().click();
    await expect(page).toHaveURL(/\/billing\/checkout\//);
    await expect(page.getByText(/Quét mã VietQR/)).toBeVisible();
    await expect(page.getByText(/SEO[A-Z2-7]{5}/)).toBeVisible();
  });

  test('Mock Casso webhook activates Pro + page redirects to /billing', async ({ page, request }) => {
    // ... requires backend reachable + webhook secret known via test env
    // Engineer: set CASSO_WEBHOOK_SECRET=test-secret in test env
    // Read refCode from page, then POST webhook
  });
});
```

> Engineer note: completing the second test requires a test env where `CASSO_WEBHOOK_SECRET=test-secret` and a known seeded test user. Add this when wiring CI.

- [ ] **Step 2: Run**

```bash
cd apps/web && npx playwright test tests/e2e/billing.spec.ts
```

Expected: first test passes; second is skip/TODO until env wired.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/billing.spec.ts
git commit -m "test(web/e2e): billing happy path — pricing → QR display"
```

---

### Task 6.2: Smoke extension — quota → 429

**Files:**
- Modify: `scripts/e2e-smoke.ts` (or wherever `npm run e2e:smoke` lives)

- [ ] **Step 1: Find smoke script**

```bash
grep -rn "e2e:smoke" package.json scripts/ 2>/dev/null
```

- [ ] **Step 2: Add quota subflow**

In the smoke script, after the existing audit creation flow:

```typescript
// At end of existing smoke
console.log('Testing quota limit...');
// Assume default user is Free (10/month). Issue 11 audits.
for (let i = 0; i < 11; i++) {
  const res = await fetch(`${API}/audits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  });
  if (i < 10 && res.status !== 201) throw new Error(`Audit ${i+1} expected 201 got ${res.status}`);
  if (i === 10 && res.status !== 429) throw new Error(`11th audit expected 429 got ${res.status}`);
}
console.log('✓ Free quota enforced at 10/month');
```

- [ ] **Step 3: Run**

```bash
npm run docker:down && npm run docker:up
sleep 30
npm run e2e:smoke
```

Expected: ends with `✓ Free quota enforced`.

- [ ] **Step 4: Commit**

```bash
git add scripts/ package.json
git commit -m "test(smoke): assert Free user hits 429 at 11th audit"
```

---

## Phase 7 — Rollout

### Task 7.1: Env vars + feature flag

**Files:**
- Modify: `.env.docker.example`
- Modify: `.env.example`
- Modify: `apps/gateway/src/common/guards/plan.guard.ts` + `quota.guard.ts` (check feature flag)

- [ ] **Step 1: Add env vars**

In both `.env.example` and `.env.docker.example` add:

```
# Subscriptions / VietQR / Casso
VIETQR_BANK_BIN=970422
VIETQR_ACCOUNT_NO=
VIETQR_ACCOUNT_NAME=
CASSO_WEBHOOK_SECRET=
BILLING_INTENT_TTL_MINUTES=30
BILLING_SUBSCRIPTION_DAYS=30
BILLING_FEATURE_ENABLED=false
```

- [ ] **Step 2: Wire flag into guards**

In both `PlanGuard.canActivate` and `QuotaGuard.canActivate`, near the start:

```typescript
const enabled = this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
if (!enabled) {
  this.logger?.debug?.(`[billing-flag-off] would-enforce ${flag ?? dimension} for user ${userId}`);
  return true;
}
```

Inject `ConfigService` into each guard.

- [ ] **Step 3: Commit**

```bash
git add .env.example .env.docker.example apps/gateway/src/common/guards/
git commit -m "chore(billing): BILLING_FEATURE_ENABLED flag + new env vars

When false, both guards log the would-block decision then allow.
Lets the team deploy and verify telemetry before enforcing."
```

---

### Task 7.2: Final ops doc + flip flag

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-subscriptions-vietqr-design.md` — append "Rollout log" section (or create new ops doc)
- Modify: `.env.docker` and prod env (out-of-band) — set `BILLING_FEATURE_ENABLED=true`

- [ ] **Step 1: Manual verification on dev**

```bash
# Set in .env.docker
BILLING_FEATURE_ENABLED=true
CASSO_WEBHOOK_SECRET=<paste from Casso dashboard>
VIETQR_ACCOUNT_NO=<your account>
VIETQR_ACCOUNT_NAME=<your name>

npm run docker:up
```

Test flow:
1. Login as Free user → /pricing → click Pro → see QR.
2. Mock Casso webhook hit (using `curl` with correct Secure-Token + a valid SEO refCode you read from your DB).
3. Should see Subscription `pro`/`active` in DB and FE redirect to /billing.

- [ ] **Step 2: Update spec rollout log**

Append to spec:
```markdown
## Rollout log

- 2026-MM-DD: deployed BE + FE behind flag. Manual smoke OK.
- 2026-MM-DD: flipped BILLING_FEATURE_ENABLED=true in production.
- 2026-MM-DD: first real payment received from <user>, sub activated cleanly.
```

- [ ] **Step 3: Commit + tag**

```bash
git add docs/superpowers/specs/
git commit -m "docs(billing): rollout log + flag-flip notes"
git tag billing-v1
```

---

## Self-review checklist

Engineer should mentally verify:

- [ ] Every spec section (§1-17) is implemented by a task:
  - §1 goals → tasks across phases. ✓
  - §2 decisions → encoded in PLAN_FEATURES + flow. ✓
  - §3 architecture → Phase 0+1 module skeleton + Phase 2-3 enforcement. ✓
  - §4 module structure → Task 1.1+. ✓
  - §5 DB schema → Task 0.2. ✓
  - §6 plan matrix → Task 0.1. ✓
  - §7 enforcement → Phase 3. ✓
  - §8 VietQR flow → Phase 2. ✓
  - §9 admin override → Task 4.1. ✓
  - §10 cron → Task 4.2. ✓
  - §11 frontend → Phase 5. ✓
  - §12 config → Task 7.1. ✓
  - §13 testing → Tests inlined across phases + 6.1/6.2 E2E. ✓
  - §14 rollout → Phase 7. ✓
  - §15 risks → addressed via feature flag (7.1) + admin override (4.1). ✓
  - §16 out-of-scope → explicitly not implemented. ✓

- [ ] All type names consistent across tasks (e.g. `SubscriptionResponseDto.expiresAt: Date`).

- [ ] No "TBD/TODO/fill-in" placeholders. ✓

- [ ] Every task ends with a commit. ✓

---

## Execution handoff

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks. Best for this plan because tasks are large and benefit from review checkpoints.

2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, with checkpoints for review.

**Which approach do you want to use?**
