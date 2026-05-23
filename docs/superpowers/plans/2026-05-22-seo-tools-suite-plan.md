# SEO Tools Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 public SEO tools under `/tools/*` (Google preview, Social preview, Schema preview, Sitemap+Robots validator, Favicon checker) with anonymous + paid tiering, SSRF-safe fetcher, and full TDD coverage.

**Architecture:** New module `apps/gateway/src/tools/` exposes 5 `POST /api/v1/tools/*` endpoints. A new `LiteFetcherService` (undici + Cheerio) performs SSRF-checked HTTP fetches with response caching in Redis. Quota uses a new dimension `tools_fetches_daily` plugged into the existing `QuotaCounterService` (extended to support daily windows). Anonymous users get 3 req/h via the existing sliding-window `RateLimiterService`. FE lives under `apps/web/src/app/[locale]/(marketing)/tools/` with one route per tool, plus `apps/web/src/components/tools/` for components and `apps/web/src/lib/queries/use-tools.ts` for TanStack Query hooks.

**Tech Stack:** NestJS 10 + Vitest + undici + Cheerio + fast-xml-parser + robots-parser + ip-address + image-size on gateway; Next 15 + React 19 + TanStack Query + shadcn/ui + Tailwind + next-intl + Playwright on web.

**Spec:** [`docs/superpowers/specs/2026-05-22-seo-tools-suite-design.md`](../specs/2026-05-22-seo-tools-suite-design.md)

---

## Pre-requisites

Run these once before starting Phase 1.

- [ ] **P.1: Create isolated worktree off main**

```bash
cd /Users/minhducoder/SEO-Analysts
git fetch origin main
git worktree add ../seo-analysts-tools origin/main -b feat/seo-tools-suite
cd ../seo-analysts-tools
npm install
```

Expected: new worktree at `../seo-analysts-tools` on branch `feat/seo-tools-suite`. Use the `superpowers:using-git-worktrees` skill for this.

- [ ] **P.2: Verify dev environment**

```bash
npm run docker:up          # postgres + redis up
npm run dev:gateway        # gateway watch on :3000
```

Expected: gateway responds `GET /health` 200.

- [ ] **P.3: Sanity-check existing tests pass on the new branch**

```bash
npm --workspace @seo/gateway run test
npm --workspace @repo/shared run test
```

Expected: all existing tests green. If red on a fresh branch, fix or roll back before starting.

---

## File Structure

### `packages/shared/`

- Modify: `packages/shared/src/plans.ts` — add `tools_fetches_daily` to `QuotaDimension` and `PlanDefinition`; set values per plan.
- Modify: `packages/shared/test/plans.spec.ts` — extend coverage.

### `apps/gateway/src/`

- Modify: `apps/gateway/src/billing/services/quota-counter.service.ts` — support daily windows for `_daily`-suffixed dimensions.
- Modify: `apps/gateway/src/billing/services/quota-counter.service.spec.ts` — daily test coverage.
- Create: `apps/gateway/src/common/decorators/optional-auth.decorator.ts` — `@OptionalAuth()` marker.
- Modify: `apps/gateway/src/auth/guards/jwt-auth.guard.ts` — honor `OPTIONAL_AUTH` metadata.
- Create: `apps/gateway/src/tools/tools.module.ts`
- Create: `apps/gateway/src/tools/domain/ssrf-policy.ts`
- Create: `apps/gateway/src/tools/domain/fetch-error.ts`
- Create: `apps/gateway/src/tools/services/lite-fetcher.service.ts`
- Create: `apps/gateway/src/tools/services/tools-quota.service.ts`
- Create: `apps/gateway/src/tools/services/google-preview.service.ts`
- Create: `apps/gateway/src/tools/services/social-preview.service.ts`
- Create: `apps/gateway/src/tools/services/schema-preview.service.ts`
- Create: `apps/gateway/src/tools/services/sitemap-validator.service.ts`
- Create: `apps/gateway/src/tools/services/favicon-checker.service.ts`
- Create: `apps/gateway/src/tools/controllers/<five>.controller.ts`
- Create: `apps/gateway/src/tools/dto/<various>.dto.ts`
- Create: `apps/gateway/src/tools/domain/validators/{article,product,faq,breadcrumb,organization,local-business}.validator.ts`
- Modify: `apps/gateway/src/app.module.ts` — import `ToolsModule`.

### `apps/gateway/test/`

- Create: `apps/gateway/test/fixtures/tools/google/*.html`
- Create: `apps/gateway/test/fixtures/tools/social/*.html`
- Create: `apps/gateway/test/fixtures/tools/schema/*.{json,html}`
- Create: `apps/gateway/test/fixtures/tools/sitemap/*.{xml,txt}`
- Create: `apps/gateway/test/fixtures/tools/favicon/*.{html,ico,png,json}`
- Create: `apps/gateway/test/integration/tools.e2e-spec.ts`
- Create: `apps/gateway/src/tools/services/*.spec.ts` (one per service)

### `apps/web/src/`

- Create: `apps/web/src/lib/api/tools.ts`
- Create: `apps/web/src/lib/queries/use-tools.ts`
- Modify: `apps/web/src/lib/queries/keys.ts` — add `tools` namespace.
- Create: `apps/web/src/components/tools/tool-shell.tsx`
- Create: `apps/web/src/components/tools/quota-banner.tsx`
- Create: `apps/web/src/components/tools/google-serp-card.tsx`
- Create: `apps/web/src/components/tools/facebook-og-card.tsx`
- Create: `apps/web/src/components/tools/twitter-card.tsx`
- Create: `apps/web/src/components/tools/linkedin-og-card.tsx`
- Create: `apps/web/src/components/tools/schema-tree.tsx`
- Create: `apps/web/src/components/tools/robots-rules-table.tsx`
- Create: `apps/web/src/components/tools/sitemap-url-table.tsx`
- Create: `apps/web/src/components/tools/favicon-grid.tsx`
- Create: `apps/web/src/app/[locale]/(marketing)/tools/page.tsx` (index)
- Create: `apps/web/src/app/[locale]/(marketing)/tools/google-preview/page.tsx`
- Create: `apps/web/src/app/[locale]/(marketing)/tools/social-preview/page.tsx`
- Create: `apps/web/src/app/[locale]/(marketing)/tools/schema-preview/page.tsx`
- Create: `apps/web/src/app/[locale]/(marketing)/tools/sitemap-validator/page.tsx`
- Create: `apps/web/src/app/[locale]/(marketing)/tools/favicon-checker/page.tsx`
- Create: `apps/web/src/app/[locale]/(marketing)/tools/bot/page.tsx` (bot UA disclosure docs)
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/vi.json` — add `tools.*` keys.
- Modify: `apps/web/src/app/sitemap.ts` or equivalent — add tool pages to sitemap.

### `apps/web/tests/`

- Create: `apps/web/tests/e2e/tools/<each-tool>.spec.ts` (5 files)
- Create: `apps/web/src/components/tools/*.test.tsx` (RTL tests)

---

## Phase 1 — Foundation

### Task 1: Add `tools_fetches_daily` quota dimension

**Files:**
- Modify: `packages/shared/src/plans.ts`
- Modify: `packages/shared/test/plans.spec.ts`

- [ ] **Step 1: Write failing test**

Add to `packages/shared/test/plans.spec.ts`:

```ts
describe('tools_fetches_daily', () => {
  it('free plan grants 10 daily tool fetches', () => {
    expect(PLAN_FEATURES.free.tools_fetches_daily).toBe(10);
  });

  it('pro plan grants unlimited (-1) daily tool fetches', () => {
    expect(PLAN_FEATURES.pro.tools_fetches_daily).toBe(-1);
  });

  it('business plan grants unlimited (-1) daily tool fetches', () => {
    expect(PLAN_FEATURES.business.tools_fetches_daily).toBe(-1);
  });

  it('tools_fetches_daily is a valid QuotaDimension', () => {
    const dimension: QuotaDimension = 'tools_fetches_daily';
    expect(dimension).toBe('tools_fetches_daily');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm --workspace @repo/shared run test -- plans
```

Expected: failures on `Property 'tools_fetches_daily' does not exist`.

- [ ] **Step 3: Implement — update `packages/shared/src/plans.ts`**

```ts
export type QuotaDimension =
  | 'audits_monthly'
  | 'site_audit_max_pages'
  | 'scheduled_audits_max'
  | 'scheduled_audit_min_interval_min'
  | 'api_keys_max'
  | 'api_calls_daily'
  | 'ai_calls_monthly'
  | 'tools_fetches_daily'    // NEW
  | 'history_retention_days';

export interface PlanDefinition {
  audits_monthly: number;
  site_audit_max_pages: number;
  scheduled_audits_max: number;
  scheduled_audit_min_interval_min: number;
  api_keys_max: number;
  api_calls_daily: number;
  ai_calls_monthly: number;
  tools_fetches_daily: number;   // NEW: -1 = unlimited (soft cap 1000)
  history_retention_days: number;
  features: FeatureFlag[];
}
```

Then update `PLAN_FEATURES`:

```ts
export const PLAN_FEATURES: Record<PlanCode, PlanDefinition> = {
  free: {
    // ...existing fields unchanged...
    tools_fetches_daily: 10,
  },
  pro: {
    // ...existing fields unchanged...
    tools_fetches_daily: -1,
  },
  business: {
    // ...existing fields unchanged...
    tools_fetches_daily: -1,
  },
};
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npm --workspace @repo/shared run test -- plans
```

Expected: all green.

- [ ] **Step 5: Rebuild shared package so consumers see new types**

```bash
npm --workspace @repo/shared run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Verify gateway compiles**

```bash
npm --workspace @seo/gateway run check-types
```

Expected: green (no `tools_fetches_daily` references yet, so no breakage).

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/plans.ts packages/shared/test/plans.spec.ts
git commit -m "feat(shared): add tools_fetches_daily quota dimension"
```

---

### Task 2: Extend `QuotaCounterService` to support daily windows

Reason: current key format is `quota:${userId}:${dimension}:${YYYY-MM}` (monthly). We need `quota:${userId}:${dimension}:${YYYY-MM-DD}` when the dimension name ends in `_daily`.

**Files:**
- Modify: `apps/gateway/src/billing/services/quota-counter.service.ts`
- Modify or Create: `apps/gateway/src/billing/services/quota-counter.service.spec.ts`

- [ ] **Step 1: Write failing test for daily key + reset**

In `apps/gateway/src/billing/services/quota-counter.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaCounterService } from './quota-counter.service';
import type { RedisService } from '../../infra/redis/redis.service';

function mockRedis() {
  const store = new Map<string, number>();
  const expirations = new Map<string, number>();
  return {
    store,
    expirations,
    client: {
      get: vi.fn(async (k: string) => (store.has(k) ? String(store.get(k)) : null)),
      incrby: vi.fn(async (k: string, n: number) => {
        const next = (store.get(k) ?? 0) + n;
        store.set(k, next);
        return next;
      }),
      expire: vi.fn(async (k: string, ttl: number) => {
        expirations.set(k, ttl);
        return 1;
      }),
    },
  };
}

describe('QuotaCounterService daily dimension', () => {
  it('uses YYYY-MM-DD key for *_daily dimensions', async () => {
    const redis = mockRedis();
    const svc = new QuotaCounterService(redis as unknown as RedisService);
    await svc.consume('user-1', 'tools_fetches_daily', 10);
    const keys = Array.from(redis.store.keys());
    expect(keys[0]).toMatch(/^quota:user-1:tools_fetches_daily:\d{4}-\d{2}-\d{2}$/);
  });

  it('sets TTL to roughly 26h on first consume for daily dimension', async () => {
    const redis = mockRedis();
    const svc = new QuotaCounterService(redis as unknown as RedisService);
    await svc.consume('user-1', 'tools_fetches_daily', 10);
    const keys = Array.from(redis.expirations.keys());
    expect(redis.expirations.get(keys[0])).toBe(26 * 3600);
  });

  it('still uses YYYY-MM key for non-daily dimensions', async () => {
    const redis = mockRedis();
    const svc = new QuotaCounterService(redis as unknown as RedisService);
    await svc.consume('user-1', 'audits_monthly', 100);
    const keys = Array.from(redis.store.keys());
    expect(keys[0]).toMatch(/^quota:user-1:audits_monthly:\d{4}-\d{2}$/);
  });

  it('resetAt for daily dimension is start of next UTC day', async () => {
    const redis = mockRedis();
    const svc = new QuotaCounterService(redis as unknown as RedisService);
    const res = await svc.consume('user-1', 'tools_fetches_daily', 10);
    const now = new Date();
    const expectedReset = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
    );
    expect(res.resetAt.getTime()).toBe(expectedReset);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npm --workspace @seo/gateway run test -- quota-counter
```

Expected: 4 failures.

- [ ] **Step 3: Implement — update `quota-counter.service.ts`**

Replace the existing `key()` method with a window-aware version:

```ts
private key(userId: string, dimension: string): { key: string; resetAt: Date; ttlSeconds: number } {
  const now = new Date();
  const isDaily = dimension.endsWith('_daily');
  if (isDaily) {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const ymd = `${y}-${m}-${d}`;
    const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return { key: `quota:${userId}:${dimension}:${ymd}`, resetAt, ttlSeconds: 26 * 3600 };
  }
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ym = `${y}-${m}`;
  const resetAt = new Date(Date.UTC(y, now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { key: `quota:${userId}:${dimension}:${ym}`, resetAt, ttlSeconds: 32 * 86_400 };
}
```

Then update `consume()` to use the new `ttlSeconds` instead of the hardcoded `32 * 86_400`:

```ts
async consume(userId: string, dimension: string, limit: number, increment = 1): Promise<QuotaResult> {
  const { key, resetAt, ttlSeconds } = this.key(userId, dimension);
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
    await this.redis.client.expire(key, ttlSeconds);
  }
  return {
    allowed: usedAfter <= limit,
    used: usedAfter,
    remaining: Math.max(0, limit - usedAfter),
    resetAt,
  };
}
```

Same for `peek()` — only needs the `key`+`resetAt`, the new shape is backward compatible.

- [ ] **Step 4: Run, expect PASS**

```bash
npm --workspace @seo/gateway run test -- quota-counter
```

Expected: green, including existing monthly tests.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/billing/services/quota-counter.service.ts apps/gateway/src/billing/services/quota-counter.service.spec.ts
git commit -m "feat(gateway): QuotaCounterService supports *_daily dimensions"
```

---

### Task 3: `@OptionalAuth()` decorator + JwtAuthGuard support

Tools must allow anonymous *and* authed users in the same handler. Existing `@Public()` skips JWT entirely (no user populated). We need a third state: "verify JWT if present, but don't reject if absent."

**Files:**
- Create: `apps/gateway/src/common/decorators/optional-auth.decorator.ts`
- Modify: `apps/gateway/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/gateway/src/auth/guards/jwt-auth.guard.spec.ts` (if it doesn't exist) or modify existing.

- [ ] **Step 1: Write the decorator file**

`apps/gateway/src/common/decorators/optional-auth.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_AUTH_KEY = 'optional_auth';
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
```

- [ ] **Step 2: Write failing test for guard behavior**

`apps/gateway/src/auth/guards/jwt-auth.guard.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { OPTIONAL_AUTH_KEY } from '../../common/decorators/optional-auth.decorator';

describe('JwtAuthGuard with @OptionalAuth', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    guard = new JwtAuthGuard(reflector);
    // Stub super.canActivate to record calls
    vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockResolvedValue(true);
  });

  const mockCtx = () => ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  }) as any;

  it('returns true when @Public()', async () => {
    (reflector.getAllAndOverride as any).mockImplementation((k: symbol) =>
      k === IS_PUBLIC_KEY ? true : undefined,
    );
    await expect(guard.canActivate(mockCtx())).resolves.toBe(true);
  });

  it('with @OptionalAuth, returns true when no Authorization header', async () => {
    (reflector.getAllAndOverride as any).mockImplementation((k: symbol) =>
      k === OPTIONAL_AUTH_KEY ? true : undefined,
    );
    await expect(guard.canActivate(mockCtx())).resolves.toBe(true);
  });

  it('with @OptionalAuth and Authorization header, delegates to passport', async () => {
    (reflector.getAllAndOverride as any).mockImplementation((k: symbol) =>
      k === OPTIONAL_AUTH_KEY ? true : undefined,
    );
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer xyz' } }) }),
    } as any;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    // super.canActivate should have been called
  });

  it('without any decorator, requires JWT (delegates to passport)', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(undefined);
    await expect(guard.canActivate(mockCtx())).resolves.toBe(true);
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

```bash
npm --workspace @seo/gateway run test -- jwt-auth.guard
```

Expected: 2 failures (the optional-auth cases).

- [ ] **Step 4: Implement — update `jwt-auth.guard.ts`**

```ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { OPTIONAL_AUTH_KEY } from '../../common/decorators/optional-auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isOptional) {
      const req = context.switchToHttp().getRequest();
      const hasAuth = !!(req?.headers?.authorization || req?.headers?.Authorization);
      if (!hasAuth) return true;
      // fall through to super to verify token if present
    }

    return super.canActivate(context);
  }

  // Override handleRequest so a bad JWT under @OptionalAuth doesn't throw — just leaves req.user undefined.
  handleRequest<TUser = any>(err: any, user: any, _info: any, context: ExecutionContext): TUser {
    const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isOptional && (err || !user)) return undefined as unknown as TUser;
    if (err || !user) throw err || new Error('Unauthorized');
    return user;
  }
}
```

- [ ] **Step 5: Run, expect PASS**

```bash
npm --workspace @seo/gateway run test -- jwt-auth.guard
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/common/decorators/optional-auth.decorator.ts apps/gateway/src/auth/guards/jwt-auth.guard.ts apps/gateway/src/auth/guards/jwt-auth.guard.spec.ts
git commit -m "feat(gateway): @OptionalAuth decorator + JwtAuthGuard fall-through"
```

---

### Task 4: SSRF policy — private IP block list

**Files:**
- Create: `apps/gateway/src/tools/domain/ssrf-policy.ts`
- Create: `apps/gateway/src/tools/domain/ssrf-policy.spec.ts`

- [ ] **Step 1: Add dependency**

```bash
npm --workspace @seo/gateway install ip-address
```

Expected: `ip-address` added to gateway `package.json`.

- [ ] **Step 2: Write failing tests**

`apps/gateway/src/tools/domain/ssrf-policy.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isBlockedIp, ALLOWED_PORTS, isAllowedPort, isAllowedProtocol } from './ssrf-policy';

describe('SSRF policy — isBlockedIp', () => {
  describe('IPv4 blocks', () => {
    it.each([
      ['127.0.0.1', '127.0.0.0/8 loopback'],
      ['127.255.255.255', '127.0.0.0/8 broadcast'],
      ['10.0.0.1', '10.0.0.0/8 private'],
      ['10.255.255.255', '10.0.0.0/8 edge'],
      ['172.16.0.1', '172.16.0.0/12 private'],
      ['172.31.255.255', '172.16.0.0/12 edge'],
      ['192.168.0.1', '192.168.0.0/16 private'],
      ['192.168.255.255', '192.168.0.0/16 edge'],
      ['169.254.169.254', 'AWS metadata'],
      ['169.254.0.1', '169.254.0.0/16 link-local'],
      ['224.0.0.1', '224.0.0.0/4 multicast'],
      ['0.0.0.0', '0.0.0.0/8'],
    ])('blocks %s (%s)', (ip) => {
      expect(isBlockedIp(ip)).toBe(true);
    });

    it.each([
      ['8.8.8.8'],
      ['1.1.1.1'],
      ['172.15.255.255'],   // just outside 172.16/12
      ['172.32.0.0'],        // just outside 172.16/12
      ['11.0.0.1'],          // outside 10/8
    ])('allows public %s', (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    });
  });

  describe('IPv6 blocks', () => {
    it.each([
      ['::1', 'loopback'],
      ['fc00::1', 'unique local'],
      ['fd00::1', 'unique local'],
      ['fe80::1', 'link-local'],
      ['ff00::1', 'multicast'],
    ])('blocks %s (%s)', (ip) => {
      expect(isBlockedIp(ip)).toBe(true);
    });

    it('allows public IPv6 2606:4700::1111 (Cloudflare)', () => {
      expect(isBlockedIp('2606:4700::1111')).toBe(false);
    });
  });
});

describe('SSRF policy — port whitelist', () => {
  it.each([80, 443, 8080, 8443])('allows port %i', (p) => {
    expect(isAllowedPort(p)).toBe(true);
  });

  it.each([22, 25, 3306, 5432, 6379, 9200, 11211, 27017])('blocks port %i', (p) => {
    expect(isAllowedPort(p)).toBe(false);
  });

  it('ALLOWED_PORTS contains exactly 4 ports', () => {
    expect(ALLOWED_PORTS).toEqual([80, 443, 8080, 8443]);
  });
});

describe('SSRF policy — protocol whitelist', () => {
  it.each(['http:', 'https:'])('allows %s', (p) => {
    expect(isAllowedProtocol(p)).toBe(true);
  });
  it.each(['file:', 'ftp:', 'gopher:', 'data:', 'dict:', 'ws:', 'wss:'])('blocks %s', (p) => {
    expect(isAllowedProtocol(p)).toBe(false);
  });
});
```

- [ ] **Step 3: Run, expect FAIL** — module not found.

```bash
npm --workspace @seo/gateway run test -- ssrf-policy
```

- [ ] **Step 4: Implement**

`apps/gateway/src/tools/domain/ssrf-policy.ts`:

```ts
import { Address4, Address6 } from 'ip-address';

export const ALLOWED_PORTS = [80, 443, 8080, 8443] as const;
export const ALLOWED_PROTOCOLS = ['http:', 'https:'] as const;

const IPV4_BLOCKED_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '224.0.0.0/4',
];

const IPV6_BLOCKED_CIDRS = [
  '::1/128',
  'fc00::/7',
  'fe80::/10',
  'ff00::/8',
];

export function isAllowedPort(port: number): boolean {
  return (ALLOWED_PORTS as readonly number[]).includes(port);
}

export function isAllowedProtocol(protocol: string): boolean {
  return (ALLOWED_PROTOCOLS as readonly string[]).includes(protocol);
}

export function isBlockedIp(ip: string): boolean {
  // Try IPv4 first
  if (Address4.isValid(ip)) {
    const addr = new Address4(ip);
    return IPV4_BLOCKED_CIDRS.some((cidr) => addr.isInSubnet(new Address4(cidr)));
  }
  if (Address6.isValid(ip)) {
    const addr = new Address6(ip);
    return IPV6_BLOCKED_CIDRS.some((cidr) => addr.isInSubnet(new Address6(cidr)));
  }
  // Unparseable → safest to block
  return true;
}
```

- [ ] **Step 5: Run, expect PASS**

```bash
npm --workspace @seo/gateway run test -- ssrf-policy
```

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/package.json apps/gateway/src/tools/domain/ssrf-policy.ts apps/gateway/src/tools/domain/ssrf-policy.spec.ts
git commit -m "feat(gateway): SSRF policy — private IP/port/protocol gates"
```

---

### Task 5: `FetchError` class + error codes

**Files:**
- Create: `apps/gateway/src/tools/domain/fetch-error.ts`
- Create: `apps/gateway/src/tools/domain/fetch-error.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { FetchError, FETCH_ERROR_CODES } from './fetch-error';

describe('FetchError', () => {
  it('carries code + message', () => {
    const e = new FetchError('SSRF_BLOCKED', 'blocked by policy');
    expect(e.code).toBe('SSRF_BLOCKED');
    expect(e.message).toBe('blocked by policy');
    expect(e.name).toBe('FetchError');
  });

  it('exposes all expected codes', () => {
    expect(FETCH_ERROR_CODES).toEqual(
      expect.arrayContaining([
        'SSRF_BLOCKED', 'TIMEOUT', 'TOO_LARGE',
        'INVALID_PROTOCOL', 'INVALID_PORT', 'BAD_STATUS',
        'TOO_MANY_REDIRECTS', 'DNS_FAIL',
      ]),
    );
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npm --workspace @seo/gateway run test -- fetch-error
```

- [ ] **Step 3: Implement**

`apps/gateway/src/tools/domain/fetch-error.ts`:

```ts
export const FETCH_ERROR_CODES = [
  'SSRF_BLOCKED',
  'TIMEOUT',
  'TOO_LARGE',
  'INVALID_PROTOCOL',
  'INVALID_PORT',
  'BAD_STATUS',
  'TOO_MANY_REDIRECTS',
  'DNS_FAIL',
] as const;
export type FetchErrorCode = (typeof FETCH_ERROR_CODES)[number];

export class FetchError extends Error {
  constructor(public readonly code: FetchErrorCode, message: string) {
    super(message);
    this.name = 'FetchError';
  }
}
```

- [ ] **Step 4: Run, expect PASS, then commit**

```bash
npm --workspace @seo/gateway run test -- fetch-error
git add apps/gateway/src/tools/domain/fetch-error.ts apps/gateway/src/tools/domain/fetch-error.spec.ts
git commit -m "feat(gateway): FetchError taxonomy for tools"
```

---

### Task 6: `LiteFetcherService` — DNS resolve + IP guard + headers

**Files:**
- Create: `apps/gateway/src/tools/services/lite-fetcher.service.ts`
- Create: `apps/gateway/src/tools/services/lite-fetcher.service.spec.ts`

This task is the security core. Write multiple tests up front, then implement.

- [ ] **Step 1: Add dependencies**

```bash
npm --workspace @seo/gateway install undici cheerio
```

Expected: `undici` (HTTP client) + `cheerio` already-or-now in `apps/gateway/package.json`.

- [ ] **Step 2: Write failing tests covering SSRF gates**

`apps/gateway/src/tools/services/lite-fetcher.service.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteFetcherService } from './lite-fetcher.service';
import { FetchError } from '../domain/fetch-error';

// Mock DNS resolver
vi.mock('node:dns/promises', () => ({
  default: {
    lookup: vi.fn(),
  },
  lookup: vi.fn(),
}));

import dns from 'node:dns/promises';

describe('LiteFetcherService — SSRF gates', () => {
  let svc: LiteFetcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new LiteFetcherService();
  });

  it('rejects non-http(s) protocol', async () => {
    await expect(svc.get('file:///etc/passwd')).rejects.toMatchObject({ code: 'INVALID_PROTOCOL' });
    await expect(svc.get('gopher://x')).rejects.toMatchObject({ code: 'INVALID_PROTOCOL' });
    await expect(svc.get('ftp://x')).rejects.toMatchObject({ code: 'INVALID_PROTOCOL' });
  });

  it('rejects non-whitelisted port', async () => {
    await expect(svc.get('http://example.com:22/')).rejects.toMatchObject({ code: 'INVALID_PORT' });
    await expect(svc.get('http://example.com:5432/')).rejects.toMatchObject({ code: 'INVALID_PORT' });
  });

  it('accepts implicit port (80, 443)', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    // We don't care about response here — only that gate didn't throw early
    await expect(svc.get('http://example.com/')).rejects.not.toMatchObject({ code: 'INVALID_PORT' });
  });

  it('rejects when DNS resolves to private IPv4', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '10.0.0.5', family: 4 }] as any);
    await expect(svc.get('http://internal.example.com/')).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
  });

  it('rejects when DNS resolves to AWS metadata 169.254.169.254', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '169.254.169.254', family: 4 }] as any);
    await expect(svc.get('http://rebound.example.com/')).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
  });

  it('rejects when DNS resolves to private IPv6 (fc00::/7)', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: 'fc00::1', family: 6 }] as any);
    await expect(svc.get('http://v6.example.com/')).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
  });

  it('rejects on DNS failure', async () => {
    vi.mocked(dns.lookup).mockRejectedValue(new Error('ENOTFOUND'));
    await expect(svc.get('http://does-not-exist.example.com/')).rejects.toMatchObject({ code: 'DNS_FAIL' });
  });
});
```

- [ ] **Step 3: Run, expect FAIL** (module not found / behaviors not implemented).

- [ ] **Step 4: Implement minimum to pass — `apps/gateway/src/tools/services/lite-fetcher.service.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import dns from 'node:dns/promises';
import { isAllowedPort, isAllowedProtocol, isBlockedIp } from '../domain/ssrf-policy';
import { FetchError } from '../domain/fetch-error';

export interface LiteFetchResult {
  url: string;             // final URL after redirects
  status: number;
  headers: Record<string, string>;
  body: string;            // utf-8 decoded; binary tools use bodyBuffer
  bodyBuffer: Buffer;
  contentType: string;
  durationMs: number;
}

@Injectable()
export class LiteFetcherService {
  private readonly logger = new Logger(LiteFetcherService.name);

  async get(rawUrl: string, opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {}): Promise<LiteFetchResult> {
    const url = this.parseUrl(rawUrl);
    if (!isAllowedProtocol(url.protocol)) throw new FetchError('INVALID_PROTOCOL', `Disallowed protocol: ${url.protocol}`);

    const port = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
    if (!isAllowedPort(port)) throw new FetchError('INVALID_PORT', `Disallowed port: ${port}`);

    let resolvedIp: string;
    try {
      const lookup = await dns.lookup(url.hostname, { all: true });
      // Block if ANY address is blocked
      for (const { address } of lookup) {
        if (isBlockedIp(address)) throw new FetchError('SSRF_BLOCKED', `Hostname resolves to blocked IP: ${address}`);
      }
      resolvedIp = lookup[0].address;
    } catch (e) {
      if (e instanceof FetchError) throw e;
      throw new FetchError('DNS_FAIL', `DNS lookup failed for ${url.hostname}`);
    }

    // Subsequent steps wired in Task 7.
    throw new Error('NOT_YET_IMPLEMENTED — wired in Task 7');
  }

  private parseUrl(raw: string): URL {
    try { return new URL(raw); } catch { throw new FetchError('INVALID_PROTOCOL', 'Malformed URL'); }
  }
}
```

- [ ] **Step 5: Run, expect PASS for SSRF gate tests**

```bash
npm --workspace @seo/gateway run test -- lite-fetcher
```

Expected: all SSRF-gate tests pass. The "implicit port" test passes because we no longer throw `INVALID_PORT`, but throws `NOT_YET_IMPLEMENTED` instead. The test uses `rejects.not.toMatchObject({ code: 'INVALID_PORT' })` — this still passes because the rejection's code isn't `INVALID_PORT`.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/package.json apps/gateway/src/tools/services/lite-fetcher.service.ts apps/gateway/src/tools/services/lite-fetcher.service.spec.ts
git commit -m "feat(gateway): LiteFetcher SSRF gates (protocol, port, DNS, IP block)"
```

---

### Task 7: `LiteFetcherService` — actual fetch with rebinding guard, redirect re-check, size + timeout

**Files:** Modify `apps/gateway/src/tools/services/lite-fetcher.service.ts` + `.spec.ts`.

- [ ] **Step 1: Add tests for redirect, oversize, timeout, success path**

Append to `lite-fetcher.service.spec.ts`:

```ts
describe('LiteFetcherService — fetch behavior', () => {
  // Stub for undici Agent — we'll inject a fake dispatcher via a constructor port.
  // For brevity, integration tests cover the real undici path; here we test our orchestration logic.
  // Implementation note: the service uses `request()` from undici and accepts an injectable dispatcher.

  it('happy path — fetches public URL and returns body string', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);

    const svc = new LiteFetcherService({
      dispatcherFactory: () => ({
        // minimal fake: returns 200 OK with body "hello"
        request: async () => ({
          statusCode: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
          body: { async *[Symbol.asyncIterator]() { yield Buffer.from('hello'); } },
        }),
      } as any),
    });

    const res = await svc.get('http://example.com/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('hello');
    expect(res.contentType).toContain('text/html');
  });

  it('aborts when response exceeds maxBytes', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const big = Buffer.alloc(6 * 1024 * 1024, 0x41);
    const svc = new LiteFetcherService({
      dispatcherFactory: () => ({
        request: async () => ({
          statusCode: 200,
          headers: { 'content-type': 'text/html' },
          body: { async *[Symbol.asyncIterator]() { yield big; } },
        }),
      } as any),
    });
    await expect(svc.get('http://example.com/', { maxBytes: 5 * 1024 * 1024 }))
      .rejects.toMatchObject({ code: 'TOO_LARGE' });
  });

  it('rejects on non-2xx after retries', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const svc = new LiteFetcherService({
      dispatcherFactory: () => ({
        request: async () => ({
          statusCode: 500,
          headers: {},
          body: { async *[Symbol.asyncIterator]() { yield Buffer.from(''); } },
        }),
      } as any),
    });
    await expect(svc.get('http://example.com/')).rejects.toMatchObject({ code: 'BAD_STATUS' });
  });

  it('follows redirect within limit and re-checks IP', async () => {
    vi.mocked(dns.lookup)
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }] as any)  // initial
      .mockResolvedValueOnce([{ address: '8.8.4.4', family: 4 }] as any); // after redirect

    let call = 0;
    const svc = new LiteFetcherService({
      dispatcherFactory: () => ({
        request: async () => {
          call++;
          if (call === 1) {
            return {
              statusCode: 302,
              headers: { location: 'http://example.org/' },
              body: { async *[Symbol.asyncIterator]() { yield Buffer.from(''); } },
            };
          }
          return {
            statusCode: 200,
            headers: { 'content-type': 'text/html' },
            body: { async *[Symbol.asyncIterator]() { yield Buffer.from('final'); } },
          };
        },
      } as any),
    });
    const res = await svc.get('http://example.com/');
    expect(res.body).toBe('final');
    expect(res.url).toBe('http://example.org/');
  });

  it('rejects redirect to private IP', async () => {
    vi.mocked(dns.lookup)
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }] as any)   // initial public
      .mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }] as any); // redirect to private

    const svc = new LiteFetcherService({
      dispatcherFactory: () => ({
        request: async () => ({
          statusCode: 302,
          headers: { location: 'http://internal.example.com/' },
          body: { async *[Symbol.asyncIterator]() { yield Buffer.from(''); } },
        }),
      } as any),
    });
    await expect(svc.get('http://example.com/')).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
  });

  it('rejects after exceeding maxRedirects', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const svc = new LiteFetcherService({
      dispatcherFactory: () => ({
        request: async () => ({
          statusCode: 302,
          headers: { location: 'http://a.example.com/' },
          body: { async *[Symbol.asyncIterator]() { yield Buffer.from(''); } },
        }),
      } as any),
    });
    await expect(svc.get('http://example.com/', { maxRedirects: 2 }))
      .rejects.toMatchObject({ code: 'TOO_MANY_REDIRECTS' });
  });
});
```

- [ ] **Step 2: Run, expect new tests FAIL** (still on `NOT_YET_IMPLEMENTED`).

- [ ] **Step 3: Implement — replace the throw at the end of `get()` with a real fetch flow**

```ts
// At top:
import { request, Agent, type Dispatcher } from 'undici';

// Constructor with optional dispatcher factory for testing:
constructor(
  private readonly opts: { dispatcherFactory?: () => Dispatcher } = {},
) {}

private readonly DEFAULTS = {
  timeoutMs: 10_000,
  maxBytes: 5 * 1024 * 1024,
  maxRedirects: 3,
  userAgent: 'SEOAnalystsBot/1.0 (+https://seoanalysts.io/tools/bot)',
};

async get(rawUrl: string, opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {}): Promise<LiteFetchResult> {
  const timeoutMs = opts.timeoutMs ?? this.DEFAULTS.timeoutMs;
  const maxBytes = opts.maxBytes ?? this.DEFAULTS.maxBytes;
  const maxRedirects = opts.maxRedirects ?? this.DEFAULTS.maxRedirects;
  const startedAt = Date.now();

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const { url, ip } = await this.validateAndResolve(currentUrl);

    // Bind socket to verified IP (rebinding guard) via custom Agent connect.
    const dispatcher = this.opts.dispatcherFactory?.() ?? this.buildAgent(ip);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Awaited<ReturnType<typeof request>>;
    try {
      res = await request(url.toString(), {
        method: 'GET',
        headers: {
          'user-agent': this.DEFAULTS.userAgent,
          'accept': 'text/html,application/xml,application/json;q=0.9,*/*;q=0.8',
        },
        dispatcher,
        signal: controller.signal,
        // We follow redirects manually so we can re-check IPs.
        maxRedirections: 0,
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') throw new FetchError('TIMEOUT', `Timeout after ${timeoutMs}ms`);
      throw new FetchError('BAD_STATUS', e?.message ?? 'Fetch failed');
    } finally {
      clearTimeout(timer);
    }

    const status = res.statusCode;

    if (status >= 300 && status < 400 && res.headers.location) {
      // Drain to release socket.
      try { for await (const _chunk of res.body) { /* ignore */ } } catch {}
      const next = new URL(String(res.headers.location), url).toString();
      currentUrl = next;
      continue;
    }

    if (status < 200 || status >= 300) {
      try { for await (const _chunk of res.body) { /* ignore */ } } catch {}
      throw new FetchError('BAD_STATUS', `Upstream returned ${status}`);
    }

    // Read body with size cap.
    const chunks: Buffer[] = [];
    let received = 0;
    try {
      for await (const chunk of res.body as AsyncIterable<Buffer>) {
        received += chunk.length;
        if (received > maxBytes) throw new FetchError('TOO_LARGE', `Response exceeds ${maxBytes} bytes`);
        chunks.push(Buffer.from(chunk));
      }
    } catch (e) {
      if (e instanceof FetchError) throw e;
      throw new FetchError('BAD_STATUS', (e as Error).message);
    }
    const bodyBuffer = Buffer.concat(chunks);
    const headers = this.flattenHeaders(res.headers);
    return {
      url: url.toString(),
      status,
      headers,
      body: bodyBuffer.toString('utf-8'),
      bodyBuffer,
      contentType: headers['content-type'] ?? '',
      durationMs: Date.now() - startedAt,
    };
  }

  throw new FetchError('TOO_MANY_REDIRECTS', `Exceeded ${maxRedirects} redirects`);
}

private async validateAndResolve(rawUrl: string): Promise<{ url: URL; ip: string }> {
  const url = this.parseUrl(rawUrl);
  if (!isAllowedProtocol(url.protocol)) throw new FetchError('INVALID_PROTOCOL', `Disallowed: ${url.protocol}`);
  const port = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
  if (!isAllowedPort(port)) throw new FetchError('INVALID_PORT', `Disallowed: ${port}`);
  let resolved: { address: string; family: number }[];
  try {
    resolved = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new FetchError('DNS_FAIL', `DNS lookup failed for ${url.hostname}`);
  }
  for (const { address } of resolved) {
    if (isBlockedIp(address)) throw new FetchError('SSRF_BLOCKED', `Blocked IP: ${address}`);
  }
  return { url, ip: resolved[0].address };
}

private buildAgent(boundIp: string): Agent {
  return new Agent({
    connect: { lookup: (_h, _o, cb) => cb(null, boundIp, boundIp.includes(':') ? 6 : 4) },
  });
}

private flattenHeaders(h: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h ?? {})) {
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
  }
  return out;
}
```

- [ ] **Step 4: Run, expect PASS for new tests**

```bash
npm --workspace @seo/gateway run test -- lite-fetcher
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/tools/services/lite-fetcher.service.ts apps/gateway/src/tools/services/lite-fetcher.service.spec.ts
git commit -m "feat(gateway): LiteFetcher fetch with redirect re-check + size/timeout caps"
```

---

### Task 8: `LiteFetcherService` — Redis raw-fetch cache

**Files:**
- Modify: `apps/gateway/src/tools/services/lite-fetcher.service.ts` (+ spec)

- [ ] **Step 1: Add test for cache hit/miss**

Append:

```ts
describe('LiteFetcherService — caching', () => {
  it('on second call within TTL, returns cached body without re-fetching', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    let fetchCalls = 0;
    const fakeRedis = (() => {
      const store = new Map<string, string>();
      return {
        client: {
          get: vi.fn(async (k: string) => store.get(k) ?? null),
          set: vi.fn(async (k: string, v: string) => { store.set(k, v); return 'OK'; }),
          expire: vi.fn(async () => 1),
        },
      };
    })();

    const svc = new LiteFetcherService(
      { dispatcherFactory: () => ({
          request: async () => {
            fetchCalls++;
            return {
              statusCode: 200,
              headers: { 'content-type': 'text/html' },
              body: { async *[Symbol.asyncIterator]() { yield Buffer.from('cached!'); } },
            };
          },
        } as any) },
      fakeRedis as any,
    );

    const a = await svc.get('http://example.com/');
    const b = await svc.get('http://example.com/');
    expect(a.body).toBe('cached!');
    expect(b.body).toBe('cached!');
    expect(fetchCalls).toBe(1);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement — add Redis to constructor and wrap `get()`**

```ts
constructor(
  private readonly opts: { dispatcherFactory?: () => Dispatcher } = {},
  private readonly redis?: { client: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<string>; expire: (k: string, ttl: number) => Promise<number> } },
) {}

private async cacheKey(url: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return `tools:fetch:${createHash('sha256').update(url).digest('hex')}`;
}

private readonly CACHE_TTL = 10 * 60; // 10 min

// At the top of get(), before validating:
async get(rawUrl: string, opts = {}): Promise<LiteFetchResult> {
  if (this.redis) {
    const key = await this.cacheKey(rawUrl);
    const hit = await this.redis.client.get(key);
    if (hit) {
      const parsed = JSON.parse(hit) as LiteFetchResult;
      parsed.bodyBuffer = Buffer.from(parsed.body, 'utf-8');
      (parsed as any).cached = true;
      return parsed;
    }
  }
  // ...existing fetch logic...
  // After successful response, before returning:
  if (this.redis) {
    const key = await this.cacheKey(rawUrl);
    const toCache = { url: result.url, status: result.status, headers: result.headers, body: result.body, contentType: result.contentType, durationMs: result.durationMs };
    await this.redis.client.set(key, JSON.stringify(toCache));
    await this.redis.client.expire(key, this.CACHE_TTL);
  }
  return result;
}
```

(The exact wrap can be cleaner by extracting the fetch body into a private `doFetch()` method. The above shows the intent.)

- [ ] **Step 4: Run, expect PASS**

```bash
npm --workspace @seo/gateway run test -- lite-fetcher
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/tools/services/lite-fetcher.service.ts apps/gateway/src/tools/services/lite-fetcher.service.spec.ts
git commit -m "feat(gateway): LiteFetcher 10-min Redis cache (tools:fetch:<sha256>)"
```

---

### Task 9: `ToolsQuotaService` — orchestrate user quota + anon rate-limit

Reuses existing `EntitlementService` + `QuotaCounterService` + `RateLimiterService`.

**Files:**
- Create: `apps/gateway/src/tools/services/tools-quota.service.ts`
- Create: `apps/gateway/src/tools/services/tools-quota.service.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolsQuotaService } from './tools-quota.service';

describe('ToolsQuotaService', () => {
  let entitlement: any, counter: any, rateLimiter: any, config: any, svc: ToolsQuotaService;

  beforeEach(() => {
    entitlement = { getEffectivePlan: vi.fn() };
    counter = { consume: vi.fn(), peek: vi.fn() };
    rateLimiter = { consume: vi.fn() };
    config = { get: vi.fn().mockReturnValue('true') };
    svc = new ToolsQuotaService(entitlement, counter, rateLimiter, config);
  });

  it('anonymous → consumes IP sliding-window bucket', async () => {
    rateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    const r = await svc.checkAndIncrement({ userId: undefined, ip: '203.0.113.1' });
    expect(r).toMatchObject({ scope: 'ip-hour', used: 1, limit: 3 });
    expect(rateLimiter.consume).toHaveBeenCalledWith('rate_limit:tools:anon:203.0.113.1', 3, 3600);
  });

  it('anonymous over limit → throws 429 with TOOLS_ANON_RATE_LIMIT', async () => {
    rateLimiter.consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 1200 });
    await expect(svc.checkAndIncrement({ userId: undefined, ip: '203.0.113.1' }))
      .rejects.toMatchObject({ status: 429, response: { code: 'TOOLS_ANON_RATE_LIMIT' } });
  });

  it('authed free → consumes tools_fetches_daily', async () => {
    entitlement.getEffectivePlan.mockResolvedValue('free');
    counter.consume.mockResolvedValue({ allowed: true, used: 1, remaining: 9, resetAt: new Date() });
    const r = await svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' });
    expect(r).toMatchObject({ scope: 'user-day', used: 1, limit: 10 });
    expect(counter.consume).toHaveBeenCalledWith('u1', 'tools_fetches_daily', 10, 1);
  });

  it('authed free over quota → throws TOOLS_QUOTA_EXCEEDED', async () => {
    entitlement.getEffectivePlan.mockResolvedValue('free');
    counter.consume.mockResolvedValue({ allowed: false, used: 11, remaining: 0, resetAt: new Date() });
    await expect(svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' }))
      .rejects.toMatchObject({ status: 429, response: { code: 'TOOLS_QUOTA_EXCEEDED' } });
  });

  it('authed pro → uses 1000 soft cap when limit is -1', async () => {
    entitlement.getEffectivePlan.mockResolvedValue('pro');
    counter.consume.mockResolvedValue({ allowed: true, used: 50, remaining: 950, resetAt: new Date() });
    const r = await svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' });
    expect(counter.consume).toHaveBeenCalledWith('u1', 'tools_fetches_daily', 1000, 1);
    expect(r.limit).toBe(1000);
  });

  it('billing feature off → skips quota, still applies anon rate-limit', async () => {
    config.get.mockReturnValue('false');
    rateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    const r = await svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' });
    expect(counter.consume).not.toHaveBeenCalled();
    expect(r).toMatchObject({ scope: 'user-day', limit: -1 });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement — `apps/gateway/src/tools/services/tools-quota.service.ts`**

```ts
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PLAN_FEATURES } from '@repo/shared';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { QuotaCounterService } from '../../billing/services/quota-counter.service';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';

const ANON_LIMIT = 3;
const ANON_WINDOW_SECONDS = 3600;
const SOFT_CAP = 1000;

export interface ToolsQuotaResult {
  scope: 'user-day' | 'ip-hour';
  used: number;
  limit: number;
  remaining: number;
  resetAt?: Date;
  softCap?: boolean;
}

@Injectable()
export class ToolsQuotaService {
  constructor(
    private readonly entitlement: EntitlementService,
    private readonly counter: QuotaCounterService,
    private readonly rateLimiter: RateLimiterService,
    private readonly config: ConfigService,
  ) {}

  async checkAndIncrement(ctx: { userId?: string; ip: string }): Promise<ToolsQuotaResult> {
    if (!ctx.userId) {
      const r = await this.rateLimiter.consume(`rate_limit:tools:anon:${ctx.ip}`, ANON_LIMIT, ANON_WINDOW_SECONDS);
      if (!r.allowed) {
        throw new HttpException(
          { code: 'TOOLS_ANON_RATE_LIMIT', message: 'Sign in for more requests' },
          429,
        );
      }
      return { scope: 'ip-hour', used: ANON_LIMIT - r.remaining, limit: ANON_LIMIT, remaining: r.remaining };
    }

    const enabled = this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
    if (!enabled) {
      return { scope: 'user-day', used: 0, limit: -1, remaining: -1 };
    }

    const plan = await this.entitlement.getEffectivePlan(ctx.userId);
    const planLimit = PLAN_FEATURES[plan].tools_fetches_daily as number;
    const effectiveLimit = planLimit === -1 ? SOFT_CAP : planLimit;
    const r = await this.counter.consume(ctx.userId, 'tools_fetches_daily', effectiveLimit, 1);
    if (!r.allowed) {
      throw new HttpException(
        {
          code: planLimit === -1 ? 'TOOLS_SOFT_CAP' : 'TOOLS_QUOTA_EXCEEDED',
          message: planLimit === -1 ? 'Daily soft cap reached' : 'Daily quota exceeded — upgrade plan',
        },
        429,
      );
    }
    return {
      scope: 'user-day',
      used: r.used,
      limit: effectiveLimit,
      remaining: r.remaining,
      resetAt: r.resetAt,
      softCap: planLimit === -1,
    };
  }
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm --workspace @seo/gateway run test -- tools-quota
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/tools/services/tools-quota.service.ts apps/gateway/src/tools/services/tools-quota.service.spec.ts
git commit -m "feat(gateway): ToolsQuotaService — anon IP + authed daily quota orchestration"
```

---

### Task 10: `ToolsModule` scaffold + register in `AppModule`

**Files:**
- Create: `apps/gateway/src/tools/tools.module.ts`
- Modify: `apps/gateway/src/app.module.ts`

- [ ] **Step 1: Create empty module file**

`apps/gateway/src/tools/tools.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../infra/redis/redis.module';
import { BillingModule } from '../billing/billing.module';
import { LiteFetcherService } from './services/lite-fetcher.service';
import { ToolsQuotaService } from './services/tools-quota.service';

@Module({
  imports: [ConfigModule, RedisModule, BillingModule],
  providers: [LiteFetcherService, ToolsQuotaService],
  exports: [LiteFetcherService, ToolsQuotaService],
})
export class ToolsModule {}
```

(Controllers and per-tool services get added in Phase 2 as we wire each tool.)

- [ ] **Step 2: Register in AppModule**

In `apps/gateway/src/app.module.ts`, add:

```ts
import { ToolsModule } from './tools/tools.module';

@Module({
  imports: [
    // ...existing modules...
    ToolsModule,
  ],
  // ...
})
```

- [ ] **Step 3: Verify build**

```bash
npm --workspace @seo/gateway run check-types
npm --workspace @seo/gateway run test
```

Expected: all green; no controllers registered yet so no integration tests for routes.

- [ ] **Step 4: Smoke-boot gateway**

```bash
npm run dev:gateway
curl -s http://localhost:3000/health | jq .
```

Expected: still healthy. Module loaded.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/tools/tools.module.ts apps/gateway/src/app.module.ts
git commit -m "feat(gateway): scaffold ToolsModule (foundation services only)"
```

**Phase 1 complete.** All foundation pieces are testable in isolation. Run `npm --workspace @seo/gateway run test` to confirm everything green before Phase 2.

---

## Phase 2 — 5 BE Tools

Each tool follows the same structure: DTO → Service → Controller → unit tests → integration test. Task 11 (Google) is the **detailed template**; the rest reference it and call out only the differences.

### Task 11: Google preview — service, controller, DTO, tests (template)

**Files:**
- Create: `apps/gateway/src/tools/dto/google-preview.dto.ts`
- Create: `apps/gateway/src/tools/services/google-preview.service.ts`
- Create: `apps/gateway/src/tools/services/google-preview.service.spec.ts`
- Create: `apps/gateway/src/tools/controllers/google-preview.controller.ts`
- Modify: `apps/gateway/src/tools/tools.module.ts`
- Create: `apps/gateway/test/fixtures/tools/google/basic.html`
- Modify: `apps/gateway/test/integration/tools.e2e-spec.ts`

- [ ] **Step 1: Write DTOs**

`apps/gateway/src/tools/dto/google-preview.dto.ts`:

```ts
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class GooglePreviewRequestDto {
  @IsEnum(['manual', 'url'])
  mode!: 'manual' | 'url';

  @ValidateIf((o) => o.mode === 'url')
  @IsUrl({ require_protocol: true })
  fetchUrl?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional() @IsString() @MaxLength(2000)
  url?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional() @IsString() @MaxLength(500)
  title?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @ValidateIf((o) => o.mode === 'manual')
  @IsOptional() @IsString() @MaxLength(2000)
  faviconUrl?: string;
}

export interface GooglePreviewWarning {
  field: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface GooglePreviewData {
  url: string;
  title: string;
  description: string;
  faviconUrl: string;
  breadcrumb: string[];
  displayUrl: string;
}

export interface GooglePreviewResponse {
  data: GooglePreviewData;
  warnings: GooglePreviewWarning[];
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}
```

- [ ] **Step 2: Write failing service tests**

`apps/gateway/src/tools/services/google-preview.service.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GooglePreviewService } from './google-preview.service';
import type { LiteFetcherService } from './lite-fetcher.service';

const fixture = `<!doctype html>
<html><head>
<title>Example Page Title</title>
<meta name="description" content="A short example description well within Google's recommended length range.">
<link rel="icon" href="/favicon.ico">
</head><body></body></html>`;

describe('GooglePreviewService', () => {
  let fetcher: { get: ReturnType<typeof vi.fn> };
  let svc: GooglePreviewService;

  beforeEach(() => {
    fetcher = { get: vi.fn() };
    svc = new GooglePreviewService(fetcher as unknown as LiteFetcherService);
  });

  describe('manual mode', () => {
    it('echoes fields and computes displayUrl', () => {
      const r = svc.executeManual({
        mode: 'manual',
        url: 'https://example.com/page',
        title: 'A title that is just right',
        description: 'A description in the recommended range of seventy to one hundred and sixty characters here.',
      });
      expect(r.data.title).toBe('A title that is just right');
      expect(r.data.displayUrl).toContain('example.com');
    });

    it('warns when title too short', () => {
      const r = svc.executeManual({ mode: 'manual', title: 'Short', description: 'd'.repeat(80) });
      expect(r.warnings).toContainEqual(expect.objectContaining({ field: 'title', severity: 'warn' }));
    });

    it('warns when title too long', () => {
      const r = svc.executeManual({ mode: 'manual', title: 't'.repeat(70), description: 'd'.repeat(80) });
      expect(r.warnings).toContainEqual(expect.objectContaining({ field: 'title', severity: 'warn' }));
    });

    it('errors when description empty', () => {
      const r = svc.executeManual({ mode: 'manual', title: 'Reasonable title here', description: '' });
      expect(r.warnings).toContainEqual(expect.objectContaining({ field: 'description', severity: 'error' }));
    });

    it('warns when description out of 70..160 range', () => {
      const tooShort = svc.executeManual({ mode: 'manual', title: 'Reasonable title here', description: 'short' });
      expect(tooShort.warnings).toContainEqual(expect.objectContaining({ field: 'description', severity: 'warn' }));
      const tooLong = svc.executeManual({ mode: 'manual', title: 'Reasonable title here', description: 'x'.repeat(200) });
      expect(tooLong.warnings).toContainEqual(expect.objectContaining({ field: 'description', severity: 'warn' }));
    });
  });

  describe('url mode', () => {
    it('parses title + description + favicon from fetched HTML', async () => {
      fetcher.get.mockResolvedValue({ url: 'https://example.com/', body: fixture, status: 200, headers: { 'content-type': 'text/html' } });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.data.title).toBe('Example Page Title');
      expect(r.data.description).toBe("A short example description well within Google's recommended length range.");
      expect(r.data.faviconUrl).toBe('https://example.com/favicon.ico');
    });

    it('falls back to og:description when meta description missing', async () => {
      const html = `<title>T</title><meta property="og:description" content="OG fallback description text">`;
      fetcher.get.mockResolvedValue({ url: 'https://example.com/', body: html, status: 200, headers: {} });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.data.description).toBe('OG fallback description text');
    });

    it('falls back to /favicon.ico when no <link rel="icon">', async () => {
      const html = `<title>T</title><meta name="description" content="${'x'.repeat(80)}">`;
      fetcher.get.mockResolvedValue({ url: 'https://example.com/sub/', body: html, status: 200, headers: {} });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/sub/' });
      expect(r.data.faviconUrl).toBe('https://example.com/favicon.ico');
    });
  });
});
```

- [ ] **Step 3: Run, expect FAIL** (module not found).

- [ ] **Step 4: Implement service**

`apps/gateway/src/tools/services/google-preview.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { LiteFetcherService } from './lite-fetcher.service';
import { GooglePreviewRequestDto, GooglePreviewResponse, GooglePreviewWarning, GooglePreviewData } from '../dto/google-preview.dto';

@Injectable()
export class GooglePreviewService {
  constructor(private readonly fetcher: LiteFetcherService) {}

  executeManual(dto: GooglePreviewRequestDto): Omit<GooglePreviewResponse, 'meta'> {
    const data: GooglePreviewData = {
      url: dto.url ?? '',
      title: dto.title ?? '',
      description: dto.description ?? '',
      faviconUrl: dto.faviconUrl ?? '',
      breadcrumb: [],
      displayUrl: this.toDisplayUrl(dto.url ?? ''),
    };
    return { data, warnings: this.computeWarnings(data) };
  }

  async executeFromUrl(dto: GooglePreviewRequestDto): Promise<{ data: GooglePreviewData; warnings: GooglePreviewWarning[]; cached: boolean }> {
    const res = await this.fetcher.get(dto.fetchUrl!);
    const $ = cheerio.load(res.body);
    const title = $('title').first().text().trim();
    const description =
      $('meta[name="description"]').attr('content')?.trim() ??
      $('meta[property="og:description"]').attr('content')?.trim() ??
      '';
    const faviconHref =
      $('link[rel="icon"]').attr('href') ??
      $('link[rel="shortcut icon"]').attr('href') ??
      '/favicon.ico';
    const faviconUrl = new URL(faviconHref, res.url).toString();
    const breadcrumb = this.extractBreadcrumb($);
    const data: GooglePreviewData = {
      url: res.url,
      title,
      description,
      faviconUrl,
      breadcrumb,
      displayUrl: this.toDisplayUrl(res.url),
    };
    return { data, warnings: this.computeWarnings(data), cached: !!(res as any).cached };
  }

  private extractBreadcrumb($: cheerio.CheerioAPI): string[] {
    const blocks = $('script[type="application/ld+json"]').toArray();
    for (const el of blocks) {
      try {
        const parsed = JSON.parse($(el).text());
        const items = parsed['@type'] === 'BreadcrumbList' ? parsed.itemListElement : null;
        if (Array.isArray(items)) return items.map((i: any) => i?.name ?? '').filter(Boolean);
      } catch { /* ignore */ }
    }
    return [];
  }

  private toDisplayUrl(url: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      return [u.hostname, ...parts].join(' › ');
    } catch {
      return url;
    }
  }

  private computeWarnings(data: GooglePreviewData): GooglePreviewWarning[] {
    const w: GooglePreviewWarning[] = [];
    const titleLen = data.title.length;
    if (titleLen === 0) {
      w.push({ field: 'title', severity: 'error', message: 'Title is empty.' });
    } else if (titleLen < 30) {
      w.push({ field: 'title', severity: 'warn', message: `Title is short (${titleLen} chars). Recommended 30–60.` });
    } else if (titleLen > 60) {
      w.push({ field: 'title', severity: 'warn', message: `Title may be truncated (${titleLen} chars). Recommended 30–60.` });
    }
    const descLen = data.description.length;
    if (descLen === 0) {
      w.push({ field: 'description', severity: 'error', message: 'Description is empty.' });
    } else if (descLen < 70 || descLen > 160) {
      w.push({ field: 'description', severity: 'warn', message: `Description length ${descLen}. Recommended 70–160.` });
    }
    return w;
  }
}
```

- [ ] **Step 5: Run, expect PASS**

```bash
npm --workspace @seo/gateway run test -- google-preview
```

- [ ] **Step 6: Wire controller**

`apps/gateway/src/tools/controllers/google-preview.controller.ts`:

```ts
import { Body, Controller, Headers, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { GooglePreviewRequestDto, GooglePreviewResponse } from '../dto/google-preview.dto';
import { GooglePreviewService } from '../services/google-preview.service';
import { ToolsQuotaService } from '../services/tools-quota.service';

@Controller('tools/google-preview')
@UseGuards(JwtAuthGuard)
@OptionalAuth()
export class GooglePreviewController {
  constructor(
    private readonly svc: GooglePreviewService,
    private readonly quota: ToolsQuotaService,
  ) {}

  @Post()
  async execute(@Body() dto: GooglePreviewRequestDto, @Req() req: any, @Ip() ip: string): Promise<GooglePreviewResponse> {
    const userId = req?.user?.id;
    if (dto.mode === 'manual') {
      const { data, warnings } = this.svc.executeManual(dto);
      return { data, warnings, meta: { quotaUsed: 0, quotaLeft: 0, cached: false } };
    }
    // mode === 'url' — fetcher handles cache; quota only charged on cache MISS:
    const quotaCtxBeforeFetch = { userId, ip };
    // Strategy: call fetcher first; if it surfaces `cached: true`, skip quota.
    // We can't know cache state without fetching, so we check Redis directly via fetcher path.
    // For simplicity, we call quota.checkAndIncrement BEFORE fetch; cache hit still charges 1.
    // This is a pragmatic v1 — true cache-skip requires fetcher to expose a peek API.
    const q = await this.quota.checkAndIncrement(quotaCtxBeforeFetch);
    const { data, warnings, cached } = await this.svc.executeFromUrl(dto);
    return {
      data,
      warnings,
      meta: { quotaUsed: q.used, quotaLeft: q.remaining, cached },
    };
  }
}
```

> **Note for plan readers:** the spec says cache hit should not charge quota. Implementing that cleanly requires `LiteFetcher.peekCache(url)` → returns `LiteFetchResult | null` without fetching. **Add this helper to LiteFetcherService in Task 8 if not already.** The controller then becomes: peek → if hit, return without quota; else quota.check, then fetch. The current code is a v1 compromise; refine in a follow-up if telemetry shows excessive double-charging.

- [ ] **Step 7: Add controller + register in ToolsModule**

Update `apps/gateway/src/tools/tools.module.ts`:

```ts
import { GooglePreviewController } from './controllers/google-preview.controller';
import { GooglePreviewService } from './services/google-preview.service';
// ...
@Module({
  imports: [ConfigModule, RedisModule, BillingModule, AuthModule],   // ← AuthModule for JwtAuthGuard
  controllers: [GooglePreviewController],
  providers: [LiteFetcherService, ToolsQuotaService, GooglePreviewService],
  exports: [LiteFetcherService, ToolsQuotaService],
})
```

- [ ] **Step 8: Add integration test**

`apps/gateway/test/integration/tools.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Tools — Google preview (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(() => app.close());

  it('manual mode — returns computed warnings', async () => {
    const r = await request(app.getHttpServer())
      .post('/tools/google-preview')
      .send({ mode: 'manual', url: 'https://example.com/x', title: 'A reasonable title here', description: 'd'.repeat(100) });
    expect(r.status).toBe(200);
    expect(r.body.data.title).toBe('A reasonable title here');
    expect(r.body.warnings).toBeInstanceOf(Array);
  });

  it('rejects invalid DTO', async () => {
    const r = await request(app.getHttpServer())
      .post('/tools/google-preview')
      .send({ mode: 'banana' });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 9: Run integration**

```bash
npm --workspace @seo/gateway run test -- tools
```

Expected: green.

- [ ] **Step 10: Commit**

```bash
git add apps/gateway/src/tools/{controllers,services,dto}/google-preview.* apps/gateway/src/tools/tools.module.ts apps/gateway/test/integration/tools.e2e-spec.ts
git commit -m "feat(gateway): /tools/google-preview endpoint (manual + url modes)"
```

---

### Task 12: Social preview — service + controller

Follows Task 11 template. **Differences:**

- DTO accepts manual fields `ogTitle/ogDescription/ogImage/ogSiteName/ogType` + `twitterCard/twitterTitle/twitterDescription/twitterImage`, OR `fetchUrl`.
- Service parses `meta[property^="og:"]` + `meta[name^="twitter:"]` from HTML.
- For OG image: HEAD probe `Content-Length`; if < 1MB, fetch + `image-size` for dimensions.
- Warnings:
  - `og:image` missing → error.
  - `og:image` aspect ≠ 1.91:1 (allow ±5%) → warn.
  - `og:title.length > 60` → warn.
  - `twitter:card` missing → info.
  - `twitter:image` missing but `og:image` present → info.
- Controller wires identically to Google's; endpoint `POST /tools/social-preview`.
- Add `image-size` dependency: `npm --workspace @seo/gateway install image-size`.

**Tests:** mirror Task 11 — 4 fixtures: complete OG, partial OG (image only), Twitter-only, no meta. Test each warning rule fires.

**Commit prefix:** `feat(gateway): /tools/social-preview endpoint (FB + Twitter + LinkedIn cards)`

---

### Task 13: Favicon checker — service + controller

Follows Task 11. **Differences:**

- DTO: `{ url: string }` only — no `mode` field (URL-only tool).
- **Before the service work, extend `LiteFetcherService`** with a `head(url)` method that runs the same SSRF + redirect gates but uses HTTP HEAD. If the upstream returns 405 Method Not Allowed, fall back to a partial GET with `Range: bytes=0-2047`. Write its tests in `lite-fetcher.service.spec.ts` (mirror the existing fetch-behavior test patterns: success, oversize-not-applicable-since-HEAD, redirect re-check, SSRF gate reuse). Commit this with prefix `feat(gateway): LiteFetcher.head() with Range fallback` before continuing.
- Service flow:
  1. `LiteFetcherService.get(url)` → HTML.
  2. Extract candidates (Cheerio):
     - `<link rel="icon">`, `<link rel="shortcut icon">`, `<link rel="apple-touch-icon">`, `<link rel="apple-touch-icon-precomposed">`, `<link rel="mask-icon">`.
     - `<link rel="manifest">` → fetch (cap 2MB) → parse JSON → `icons` array.
     - Always append fallback `/favicon.ico`.
  3. For each candidate: `LiteFetcherService.head(url)`. If `Content-Length < 500000`, full `get()` to compute dimensions via `image-size`.
  4. Compute `coverage` checklist (hasBasic / hasAppleTouch / hasManifest / hasPwaSizes / hasMaskIcon).
- Add `image-size` (shared with Social): `npm --workspace @seo/gateway install image-size`.
- Each candidate fetch counts as **0 quota beyond the initial request** (one tool call = one quota decrement; subordinate fetches are cached + share quota).

**Tests:** 4 fixtures: complete (all rels + manifest), basic only (just `/favicon.ico` fallback), manifest with 5 icons, broken (link rel pointing to 404).

**Commit prefix:** `feat(gateway): /tools/favicon-checker endpoint`

---

### Task 14: Schema preview — service + controller

Follows Task 11. **Differences:**

- DTO modes: `'paste' | 'url'`.
  - `paste`: `{ raw: string }` — JSON-LD raw, may be single object / array / `{ '@graph': [...] }`.
  - `url`: `{ fetchUrl: string }` — fetcher → Cheerio extract `script[type="application/ld+json"]`.
- Walk: collect all JSON-LD objects; for each, read `@type` (may be array — flatten).
- Validators in `apps/gateway/src/tools/domain/validators/`:
  - `article.validator.ts` (handles Article, NewsArticle, BlogPosting)
  - `product.validator.ts`
  - `faq.validator.ts`
  - `breadcrumb.validator.ts`
  - `organization.validator.ts`
  - `local-business.validator.ts`
- Each validator exports `validate(obj: any): { errors: string[]; warnings: string[] }`.
- Response shape per spec §4.3.

**Tests:** one fixture JSON-LD per type plus an invalid example. Validator unit tests live next to each validator file. Service spec covers parse routing + summary aggregation.

**Commit prefixes (separate small commits per validator are fine):**
- `feat(gateway): JSON-LD validators (Article, Product, FAQPage, BreadcrumbList, Organization, LocalBusiness)`
- `feat(gateway): /tools/schema-preview endpoint`

---

### Task 15: Sitemap + Robots validator — service + controller

Follows Task 11. **Differences:**

- DTO: `{ siteUrl: string; options?: { followSitemapIndex?: boolean } }`.
- Add dependencies: `npm --workspace @seo/gateway install fast-xml-parser robots-parser`.
- Service flow:
  1. Fetch `<siteUrl>/robots.txt` — parse with `robots-parser`. Extract rules + sitemap directives.
  2. Resolve sitemap URL: first `Sitemap:` from robots, else `<siteUrl>/sitemap.xml`.
  3. Fetch sitemap; reject if > 5MB (`maxBytes` option on `LiteFetcherService.get`).
  4. Parse with `fast-xml-parser`:
     - If `<sitemapindex>`: list nested sitemaps. If `followSitemapIndex=true`, fetch up to **10** nested sitemaps (parallel, each cap 5MB). For each: report `urlCount` + errors. Do not flatten the URLs to the top level.
     - If `<urlset>`: list `<url>` items.
  5. Per URL: validate `loc` is http(s), `lastmod` is ISO 8601 (`new Date(s).toString() !== 'Invalid Date'`), `changefreq` ∈ {always, hourly, daily, weekly, monthly, yearly, never}, `priority` 0–1.
  6. Truncate displayed URLs to **1000**; set `truncated = totalUrls > 1000`.
- Response shape per spec §4.4.
- Hard caps enforced via `LiteFetcher.get(url, { maxBytes: 5 * 1024 * 1024 })`.

**Tests:** 5 fixtures: urlset (small), urlset (>1000 URLs), sitemapindex with 3 nested, malformed XML, robots.txt with sitemap directive.

**Commit prefix:** `feat(gateway): /tools/sitemap-validator endpoint (1-level index recursion, caps)`

---

**End of Phase 2.** Run full gateway tests:

```bash
npm --workspace @seo/gateway run test
npm --workspace @seo/gateway run check-types
npm --workspace @seo/gateway run lint
```

Expected: all green. All 5 tools have endpoints + tests. Manually exercise each via `curl` once.

---

## Phase 3 — Frontend

### Task 16: API client — `apps/web/src/lib/api/tools.ts`

**Files:**
- Create: `apps/web/src/lib/api/tools.ts`

- [ ] **Step 1: Implement (no tests at API layer; integration in Step 17)**

```ts
import { api } from "@/lib/api/client";
import type { PlanCode } from "@repo/shared";

export interface ToolsResponseMeta {
  quotaUsed: number;
  quotaLeft: number;
  cached: boolean;
}

export interface ToolWarning {
  field: string;
  severity: "info" | "warn" | "error";
  message: string;
}

// --- Google preview ---
export interface GooglePreviewRequest {
  mode: "manual" | "url";
  url?: string;
  title?: string;
  description?: string;
  faviconUrl?: string;
  fetchUrl?: string;
}
export interface GooglePreviewData {
  url: string;
  title: string;
  description: string;
  faviconUrl: string;
  breadcrumb: string[];
  displayUrl: string;
}
export interface GooglePreviewResponse {
  data: GooglePreviewData;
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const googlePreview = (req: GooglePreviewRequest) =>
  api.post<GooglePreviewResponse>("/tools/google-preview", req).then((r) => r.data);

// --- Social preview ---
export interface SocialPreviewRequest {
  mode: "manual" | "url";
  url?: string;
  ogTitle?: string; ogDescription?: string; ogImage?: string; ogSiteName?: string; ogType?: string;
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string; twitterDescription?: string; twitterImage?: string;
  fetchUrl?: string;
}
export interface SocialPreviewData {
  ogTitle?: string; ogDescription?: string; ogImage?: string; ogSiteName?: string; ogType?: string;
  twitterCard?: string; twitterTitle?: string; twitterDescription?: string; twitterImage?: string;
  ogImageMeta?: { width: number; height: number; bytes: number };
}
export interface SocialPreviewResponse {
  data: SocialPreviewData;
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const socialPreview = (req: SocialPreviewRequest) =>
  api.post<SocialPreviewResponse>("/tools/social-preview", req).then((r) => r.data);

// --- Schema preview ---
export interface SchemaPreviewRequest {
  mode: "paste" | "url";
  raw?: string;
  fetchUrl?: string;
}
export interface SchemaBlock {
  type: string;
  raw: unknown;
  validation: { errors: string[]; warnings: string[] };
}
export interface SchemaPreviewResponse {
  data: { blocks: SchemaBlock[]; summary: { totalBlocks: number; validBlocks: number; invalidBlocks: number } };
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const schemaPreview = (req: SchemaPreviewRequest) =>
  api.post<SchemaPreviewResponse>("/tools/schema-preview", req).then((r) => r.data);

// --- Sitemap validator ---
export interface SitemapValidatorRequest { siteUrl: string; options?: { followSitemapIndex?: boolean } }
export interface SitemapValidatorResponse {
  data: {
    robots: { url: string; exists: boolean; rules: any[]; sitemaps: string[]; syntaxErrors: string[] };
    sitemap: {
      url: string; type: "index" | "urlset" | "empty"; isIndex: boolean;
      nestedSitemaps?: Array<{ url: string; urlCount: number; errors: string[] }>;
      urls?: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number; isValid: boolean; errors: string[] }>;
      totalUrls: number; displayedUrls: number; truncated: boolean;
    };
  };
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const sitemapValidator = (req: SitemapValidatorRequest) =>
  api.post<SitemapValidatorResponse>("/tools/sitemap-validator", req).then((r) => r.data);

// --- Favicon checker ---
export interface FaviconCheckerRequest { url: string }
export interface FaviconIcon {
  source: "link" | "manifest" | "fallback";
  rel?: string;
  href: string;
  exists: boolean;
  status: number;
  format?: "ico" | "png" | "svg" | "jpg";
  size?: { width: number; height: number };
  fileSizeBytes?: number;
}
export interface FaviconCheckerResponse {
  data: {
    icons: FaviconIcon[];
    coverage: { hasBasic: boolean; hasAppleTouch: boolean; hasManifest: boolean; hasPwaSizes: boolean; hasMaskIcon: boolean };
  };
  warnings: ToolWarning[];
  meta: ToolsResponseMeta;
}
export const faviconChecker = (req: FaviconCheckerRequest) =>
  api.post<FaviconCheckerResponse>("/tools/favicon-checker", req).then((r) => r.data);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api/tools.ts
git commit -m "feat(web): tools API client (5 endpoints, typed)"
```

---

### Task 17: TanStack Query hooks + keys

**Files:**
- Modify: `apps/web/src/lib/queries/keys.ts`
- Create: `apps/web/src/lib/queries/use-tools.ts`

- [ ] **Step 1: Add keys**

In `keys.ts`:

```ts
export const queryKeys = {
  // ...existing...
  tools: {
    all: ['tools'] as const,
    google: () => [...queryKeys.tools.all, 'google'] as const,
    social: () => [...queryKeys.tools.all, 'social'] as const,
    schema: () => [...queryKeys.tools.all, 'schema'] as const,
    sitemap: () => [...queryKeys.tools.all, 'sitemap'] as const,
    favicon: () => [...queryKeys.tools.all, 'favicon'] as const,
  },
};
```

- [ ] **Step 2: Write hooks**

`apps/web/src/lib/queries/use-tools.ts`:

```ts
"use client";

import { useMutation } from "@tanstack/react-query";
import {
  googlePreview, socialPreview, schemaPreview, sitemapValidator, faviconChecker,
  type GooglePreviewRequest, type SocialPreviewRequest, type SchemaPreviewRequest,
  type SitemapValidatorRequest, type FaviconCheckerRequest,
} from "@/lib/api/tools";

export function useGooglePreview() {
  return useMutation({
    mutationKey: ['tools', 'google'],
    mutationFn: (req: GooglePreviewRequest) => googlePreview(req),
  });
}
export function useSocialPreview() {
  return useMutation({ mutationKey: ['tools', 'social'], mutationFn: (req: SocialPreviewRequest) => socialPreview(req) });
}
export function useSchemaPreview() {
  return useMutation({ mutationKey: ['tools', 'schema'], mutationFn: (req: SchemaPreviewRequest) => schemaPreview(req) });
}
export function useSitemapValidator() {
  return useMutation({ mutationKey: ['tools', 'sitemap'], mutationFn: (req: SitemapValidatorRequest) => sitemapValidator(req) });
}
export function useFaviconChecker() {
  return useMutation({ mutationKey: ['tools', 'favicon'], mutationFn: (req: FaviconCheckerRequest) => faviconChecker(req) });
}
```

- [ ] **Step 3: Verify types**

```bash
npm --workspace @seo/web run check-types
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/queries/keys.ts apps/web/src/lib/queries/use-tools.ts
git commit -m "feat(web): tools query hooks (5 mutations)"
```

---

### Task 18: `ToolShell` + `QuotaBanner` shared components

**Files:**
- Create: `apps/web/src/components/tools/tool-shell.tsx`
- Create: `apps/web/src/components/tools/quota-banner.tsx`
- Create: `apps/web/src/components/tools/tool-shell.test.tsx`

- [ ] **Step 1: Write failing RTL test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolShell } from './tool-shell';

describe('ToolShell', () => {
  it('renders title + description + input + result slots', () => {
    render(
      <ToolShell title="Google Preview" description="Render SERP snippet">
        <ToolShell.Input>INPUT</ToolShell.Input>
        <ToolShell.Result>RESULT</ToolShell.Result>
      </ToolShell>
    );
    expect(screen.getByText('Google Preview')).toBeDefined();
    expect(screen.getByText('Render SERP snippet')).toBeDefined();
    expect(screen.getByText('INPUT')).toBeDefined();
    expect(screen.getByText('RESULT')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

`apps/web/src/components/tools/tool-shell.tsx`:

```tsx
"use client";

import { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

export function ToolShell({ title, description, children }: Props) {
  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );
}

ToolShell.Input = function Input({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border p-6 bg-card">{children}</section>;
};

ToolShell.Result = function Result({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border p-6 bg-card">{children}</section>;
};
```

`apps/web/src/components/tools/quota-banner.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { ToolsResponseMeta } from "@/lib/api/tools";

interface Props { meta?: ToolsResponseMeta | null; authenticated: boolean }

export function QuotaBanner({ meta, authenticated }: Props) {
  if (!meta) return null;
  if (meta.quotaLeft < 0 || meta.quotaLeft > 200) return null;  // unlimited
  const ctaHref = authenticated ? "/billing" : "/auth/login";
  return (
    <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm flex items-center justify-between">
      <span>Còn {meta.quotaLeft}/{meta.quotaLeft + meta.quotaUsed} lượt hôm nay{meta.cached && " (cached)"}.</span>
      <Link href={ctaHref} className="text-primary hover:underline">
        {authenticated ? "Nâng cấp" : "Đăng nhập để dùng thêm"}
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm --workspace @seo/web run test -- tool-shell
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/tools/tool-shell.tsx apps/web/src/components/tools/quota-banner.tsx apps/web/src/components/tools/tool-shell.test.tsx
git commit -m "feat(web): ToolShell + QuotaBanner shared components"
```

---

### Task 19: Tools index page

**Files:**
- Create: `apps/web/src/app/[locale]/(marketing)/tools/page.tsx`
- Modify: `apps/web/src/messages/en.json`, `apps/web/src/messages/vi.json`

- [ ] **Step 1: Add i18n keys**

In `messages/en.json` (and translate to Vietnamese in `vi.json`):

```json
{
  "tools": {
    "index": {
      "title": "SEO Tools",
      "subtitle": "Free utilities for site owners — preview before you publish.",
      "google": { "name": "Google SERP Preview", "desc": "Preview how your page appears in Google search." },
      "social": { "name": "Social Card Preview", "desc": "Facebook, Twitter/X, LinkedIn cards from OG meta." },
      "schema": { "name": "Schema.org Validator", "desc": "Inspect JSON-LD and check required fields." },
      "sitemap": { "name": "Sitemap + Robots", "desc": "Validate sitemap.xml and robots.txt." },
      "favicon": { "name": "Favicon Checker", "desc": "Detect favicons across browser/iOS/Android paths." }
    }
  }
}
```

- [ ] **Step 2: Implement page**

`apps/web/src/app/[locale]/(marketing)/tools/page.tsx`:

```tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tools.index' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function ToolsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'tools.index' });
  const tools = [
    { slug: 'google-preview', name: t('google.name'), desc: t('google.desc') },
    { slug: 'social-preview', name: t('social.name'), desc: t('social.desc') },
    { slug: 'schema-preview', name: t('schema.name'), desc: t('schema.desc') },
    { slug: 'sitemap-validator', name: t('sitemap.name'), desc: t('sitemap.desc') },
    { slug: 'favicon-checker', name: t('favicon.name'), desc: t('favicon.desc') },
  ];
  return (
    <div className="container mx-auto py-12 max-w-6xl">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-3 text-lg">{t('subtitle')}</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link key={tool.slug} href={`/tools/${tool.slug}`} className="rounded-lg border p-5 hover:border-primary transition-colors bg-card">
            <h2 className="text-lg font-semibold">{tool.name}</h2>
            <p className="text-sm text-muted-foreground mt-2">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke run + visual**

```bash
npm run dev:web
# open http://localhost:3001/en/tools and http://localhost:3001/vi/tools
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\[locale\]/\(marketing\)/tools/page.tsx apps/web/src/messages/
git commit -m "feat(web): /tools index page (5 cards, i18n)"
```

---

### Task 20: Google preview page (template)

**Files:**
- Create: `apps/web/src/app/[locale]/(marketing)/tools/google-preview/page.tsx`
- Create: `apps/web/src/components/tools/google-serp-card.tsx`
- Create: `apps/web/src/components/tools/google-serp-card.test.tsx`

- [ ] **Step 1: Write failing test for SERP card**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoogleSerpCard } from './google-serp-card';

describe('GoogleSerpCard', () => {
  it('renders title, displayUrl, description, favicon', () => {
    render(
      <GoogleSerpCard
        title="Hello World"
        description="Test description goes here"
        displayUrl="example.com › blog"
        faviconUrl="https://example.com/favicon.ico"
        device="desktop"
      />
    );
    expect(screen.getByText('Hello World')).toBeDefined();
    expect(screen.getByText('Test description goes here')).toBeDefined();
    expect(screen.getByText('example.com › blog')).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement card component**

`apps/web/src/components/tools/google-serp-card.tsx`:

```tsx
"use client";

interface Props {
  title: string;
  description: string;
  displayUrl: string;
  faviconUrl: string;
  device: "desktop" | "mobile";
}

export function GoogleSerpCard({ title, description, displayUrl, faviconUrl, device }: Props) {
  const titleClass = device === "mobile"
    ? "text-[20px] leading-snug text-[#1a0dab] visited:text-[#681da8]"
    : "text-xl text-[#1a0dab] visited:text-[#681da8] hover:underline";
  return (
    <div className={`font-arial ${device === "mobile" ? "max-w-[400px]" : "max-w-[600px]"}`}>
      <div className="flex items-center gap-2 text-sm">
        {faviconUrl && <img src={faviconUrl} alt="" className="w-4 h-4" />}
        <span className="text-[#202124] text-xs">{displayUrl}</span>
      </div>
      <h3 className={`font-normal mt-1 ${titleClass}`}>{title}</h3>
      <p className="text-sm text-[#4d5156] mt-1 leading-snug">{description}</p>
    </div>
  );
}
```

- [ ] **Step 3: Run, expect PASS**

- [ ] **Step 4: Implement page**

`apps/web/src/app/[locale]/(marketing)/tools/google-preview/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ToolShell } from "@/components/tools/tool-shell";
import { QuotaBanner } from "@/components/tools/quota-banner";
import { GoogleSerpCard } from "@/components/tools/google-serp-card";
import { useGooglePreview } from "@/lib/queries/use-tools";
import { useAuthStore } from "@/lib/auth/store";

export default function GooglePreviewPage() {
  const authed = !!useAuthStore((s) => s.accessToken);
  const mutation = useGooglePreview();
  const [mode, setMode] = useState<'manual' | 'url'>('manual');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [manual, setManual] = useState({ url: 'https://example.com/blog/post', title: '', description: '', faviconUrl: '' });
  const [fetchUrl, setFetchUrl] = useState('');

  const submit = () => {
    if (mode === 'manual') mutation.mutate({ mode: 'manual', ...manual });
    else mutation.mutate({ mode: 'url', fetchUrl });
  };

  const result = mutation.data;
  return (
    <ToolShell title="Google SERP Preview" description="Preview how your page renders in Google search results.">
      <ToolShell.Input>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('manual')} className={mode === 'manual' ? 'font-bold' : ''}>Manual</button>
          <button onClick={() => setMode('url')} className={mode === 'url' ? 'font-bold' : ''}>From URL</button>
        </div>
        {mode === 'manual' ? (
          <div className="space-y-3">
            <input className="w-full border rounded p-2" placeholder="URL" value={manual.url} onChange={(e) => setManual({ ...manual, url: e.target.value })} />
            <input className="w-full border rounded p-2" placeholder="Title" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} />
            <textarea className="w-full border rounded p-2" placeholder="Description" value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} />
            <input className="w-full border rounded p-2" placeholder="Favicon URL (optional)" value={manual.faviconUrl} onChange={(e) => setManual({ ...manual, faviconUrl: e.target.value })} />
          </div>
        ) : (
          <input className="w-full border rounded p-2" placeholder="https://example.com/page" value={fetchUrl} onChange={(e) => setFetchUrl(e.target.value)} />
        )}
        <button onClick={submit} disabled={mutation.isPending} className="mt-4 px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">
          {mutation.isPending ? 'Working…' : 'Generate preview'}
        </button>
      </ToolShell.Input>

      <ToolShell.Result>
        <QuotaBanner meta={result?.meta} authenticated={authed} />
        <div className="flex gap-2 my-4">
          <button onClick={() => setDevice('desktop')} className={device === 'desktop' ? 'font-bold' : ''}>Desktop</button>
          <button onClick={() => setDevice('mobile')} className={device === 'mobile' ? 'font-bold' : ''}>Mobile</button>
        </div>
        {result ? (
          <>
            <GoogleSerpCard
              title={result.data.title}
              description={result.data.description}
              displayUrl={result.data.displayUrl}
              faviconUrl={result.data.faviconUrl}
              device={device}
            />
            {result.warnings.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm">
                {result.warnings.map((w, i) => (
                  <li key={i} className={w.severity === 'error' ? 'text-destructive' : w.severity === 'warn' ? 'text-orange-600' : 'text-muted-foreground'}>
                    [{w.severity}] {w.field}: {w.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : <p className="text-muted-foreground text-sm">Fill in the form to see preview.</p>}
        {mutation.error && <p className="text-destructive mt-2">{(mutation.error as Error).message}</p>}
      </ToolShell.Result>
    </ToolShell>
  );
}
```

- [ ] **Step 5: Smoke run**

```bash
npm run dev:web
# Visit http://localhost:3001/en/tools/google-preview
# Try manual mode + URL mode.
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\[locale\]/\(marketing\)/tools/google-preview apps/web/src/components/tools/google-serp-card.*
git commit -m "feat(web): /tools/google-preview page (manual + url, desktop+mobile)"
```

---

### Task 21: Remaining 4 tool pages

Each page follows Task 20's template. Implement card/result components first, then the page.

- [ ] **21.A — Social preview page**
  - Create `apps/web/src/components/tools/{facebook-og-card,twitter-card,linkedin-og-card}.tsx` (+ tests). Each renders a card matching the platform's 2025 visual style: aspect 1.91:1 image area, sitename top, title large, description below.
  - Create `apps/web/src/app/[locale]/(marketing)/tools/social-preview/page.tsx` with manual fields (og:* + twitter:*) and from-URL mode. Stack 3 cards in the result panel.
  - Commit: `feat(web): /tools/social-preview page (3 platform cards)`

- [ ] **21.B — Schema preview page**
  - Create `apps/web/src/components/tools/schema-tree.tsx` (+ test) — collapsible JSON view per block, with "Valid"/"N errors" badge.
  - Create page with paste-JSON textarea + from-URL input. CTA button to Google Rich Results Test (`https://search.google.com/test/rich-results?url=<encoded>`).
  - Commit: `feat(web): /tools/schema-preview page (paste + url, per-type validation)`

- [ ] **21.C — Sitemap validator page**
  - Create `apps/web/src/components/tools/{robots-rules-table,sitemap-url-table}.tsx` (+ tests). Tables with TanStack Table or shadcn `Table`. Sitemap URL table needs search filter + pagination (client-side, 50/page).
  - Create page with site URL input only. Show two stacked sections.
  - Commit: `feat(web): /tools/sitemap-validator page (robots rules + sitemap URLs)`

- [ ] **21.D — Favicon checker page**
  - Create `apps/web/src/components/tools/favicon-grid.tsx` (+ test). Grid of icon cards with thumbnail (from `href`), size, format, source. Coverage checklist below.
  - Create page with URL input.
  - Commit: `feat(web): /tools/favicon-checker page`

After each sub-task, smoke-run in browser before committing.

---

### Task 22: Wire i18n strings for every page

Each tool page should pull labels/buttons/error messages from `messages/{en,vi}.json` under the `tools.<slug>.*` namespace. Use `getTranslations({ locale, namespace: 'tools.googlePreview' })` server-side or `useTranslations('tools.googlePreview')` client-side.

- [ ] **Step 1: Add namespaces** for each tool in both locales. Use existing pages (`(marketing)/pricing/page.tsx`) as the i18n style template.

- [ ] **Step 2: Replace all hardcoded English strings** with `t('xxx')` calls. Run `npm --workspace @seo/web run check-types` after each page.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/messages/ apps/web/src/app/\[locale\]/\(marketing\)/tools/
git commit -m "feat(web): i18n for tools pages (en + vi)"
```

**Phase 3 complete.** All 5 tools fully functional in browser. Run:

```bash
npm --workspace @seo/web run check-types
npm --workspace @seo/web run lint
npm --workspace @seo/web run test
```

Expected: green.

---

## Phase 4 — Polish & Ship

### Task 23: E2E Playwright smoke tests

**Files:**
- Create: `apps/web/tests/e2e/tools/google-preview.spec.ts` (and 4 more)

- [ ] **Step 1: Write one smoke test per tool**

`apps/web/tests/e2e/tools/google-preview.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('Google preview — manual mode renders SERP card', async ({ page }) => {
  await page.goto('/en/tools/google-preview');
  await page.getByRole('button', { name: 'Manual' }).click();
  await page.getByPlaceholder('Title').fill('My Test Title Goes Here');
  await page.getByPlaceholder('Description').fill('x'.repeat(120));
  await page.getByRole('button', { name: 'Generate preview' }).click();
  await expect(page.getByText('My Test Title Goes Here')).toBeVisible();
});
```

Repeat the pattern for social, schema, sitemap, favicon.

- [ ] **Step 2: Configure Playwright** to mock the BE via MSW or by pointing at a real local gateway with seeded fixtures. Simplest: run gateway alongside Playwright and use real BE calls in tests.

- [ ] **Step 3: Run**

```bash
npm --workspace @seo/web run test:e2e
```

Expected: all 5 specs pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/e2e/tools/
git commit -m "test(web): Playwright smoke for all 5 tool pages"
```

---

### Task 24: SEO meta + sitemap.xml entries

**Files:**
- Modify: `apps/web/src/app/sitemap.ts` (or equivalent) — add 6 URLs (`/tools` + 5 child pages).
- Per-page `<head>` already handles via `generateMetadata` (Task 19, 20). Audit each page has unique `title`, `description`, `og:image`.

- [ ] **Step 1: Check current sitemap generator**

```bash
find apps/web -name "sitemap*" -type f
```

If absent, create `apps/web/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://seoanalysts.io';
export default function sitemap(): MetadataRoute.Sitemap {
  const tools = ['google-preview', 'social-preview', 'schema-preview', 'sitemap-validator', 'favicon-checker'];
  return [
    { url: `${BASE_URL}/en/tools`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/vi/tools`, changeFrequency: 'weekly', priority: 0.8 },
    ...tools.flatMap((t) => [
      { url: `${BASE_URL}/en/tools/${t}`, changeFrequency: 'weekly' as const, priority: 0.7 },
      { url: `${BASE_URL}/vi/tools/${t}`, changeFrequency: 'weekly' as const, priority: 0.7 },
    ]),
  ];
}
```

- [ ] **Step 2: Verify**

```bash
npm run dev:web
curl http://localhost:3001/sitemap.xml | grep tools
```

- [ ] **Step 3: Add per-tool OG image (placeholder for now)** — use the existing Open Graph image setup. If none exists, just confirm `<meta name="description">` and `<meta property="og:title">` are present via `generateMetadata` in each page.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/sitemap.ts
git commit -m "feat(web): sitemap.xml entries for /tools/*"
```

---

### Task 25: `/tools/bot` docs page

**Files:**
- Create: `apps/web/src/app/[locale]/(marketing)/tools/bot/page.tsx`

- [ ] **Step 1: Write content**

```tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEOAnalystsBot — Bot Information',
  description: 'About the SEOAnalystsBot/1.0 crawler — UA, behavior, contact.',
};

export default async function BotDocsPage() {
  return (
    <article className="container mx-auto py-12 max-w-2xl prose dark:prose-invert">
      <h1>About SEOAnalystsBot</h1>
      <p>
        <code>SEOAnalystsBot/1.0</code> is the user agent used by our <a href="/tools">SEO tools suite</a>. When a user submits a URL to one of our tools (e.g. Google Preview, Sitemap Validator), our server fetches that URL once on behalf of the user.
      </p>
      <h2>Behavior</h2>
      <ul>
        <li>One-off fetch per user request. We do not crawl beyond the requested URL except 1 level of sitemap-index recursion for the Sitemap Validator.</li>
        <li>10 second timeout per request. 5 MB response cap (2 MB for images).</li>
        <li>We honor 3xx redirects (up to 3 hops). Each hop is IP-checked against the same blocklist.</li>
        <li>We do not retry on failure. We do not store fetched content beyond a 10-minute in-memory cache for user UX.</li>
      </ul>
      <h2>How to block us</h2>
      <p>
        Add this to your <code>robots.txt</code>:
      </p>
      <pre><code>{`User-agent: SEOAnalystsBot
Disallow: /`}</code></pre>
      <h2>Contact</h2>
      <p>Email: <a href="mailto:hi@seoanalysts.io">hi@seoanalysts.io</a></p>
    </article>
  );
}
```

- [ ] **Step 2: Smoke run** — verify the URL inside `LiteFetcherService.DEFAULTS.userAgent` matches this page's path (`/tools/bot`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\[locale\]/\(marketing\)/tools/bot/page.tsx
git commit -m "docs(web): /tools/bot — SEOAnalystsBot UA disclosure"
```

---

### Task 26: Final integration test + ship checklist

- [ ] **Step 1: Run full test matrix from worktree root**

```bash
npm --workspace @repo/shared run test
npm --workspace @seo/gateway run test
npm --workspace @seo/gateway run check-types
npm --workspace @seo/gateway run lint
npm --workspace @seo/web run test
npm --workspace @seo/web run check-types
npm --workspace @seo/web run lint
npm --workspace @seo/web run test:e2e
```

Expected: all green.

- [ ] **Step 2: Manual QA — exercise each tool in browser**

For each of 5 tools (with gateway + web both running):
- Anonymous: hit endpoint 3 times → 4th should 429 with `TOOLS_ANON_RATE_LIMIT`.
- Authed Free: hit 10 times → 11th should 429 with `TOOLS_QUOTA_EXCEEDED`.
- Authed Pro: should not 429 until you hit 1000 (skip).
- Cache: hit same URL twice → second response has `meta.cached: true`.

- [ ] **Step 3: SSRF manual probe**

```bash
# Each of these should 4xx, not succeed:
curl -X POST http://localhost:3000/api/v1/tools/google-preview \
  -H 'content-type: application/json' \
  -d '{"mode":"url","fetchUrl":"http://127.0.0.1:6379/"}'
curl -X POST http://localhost:3000/api/v1/tools/google-preview \
  -H 'content-type: application/json' \
  -d '{"mode":"url","fetchUrl":"http://169.254.169.254/latest/meta-data/"}'
curl -X POST http://localhost:3000/api/v1/tools/google-preview \
  -H 'content-type: application/json' \
  -d '{"mode":"url","fetchUrl":"file:///etc/passwd"}'
```

Expected: each returns 4xx with `code: TOOLS_FETCH_BLOCKED`.

- [ ] **Step 4: Update spec acceptance criteria** — open `docs/superpowers/specs/2026-05-22-seo-tools-suite-design.md` §12 and check off each item.

- [ ] **Step 5: Open PR**

```bash
git push -u origin feat/seo-tools-suite
gh pr create --title "feat: SEO tools suite (5 tools at /tools/*)" --body "$(cat <<'EOF'
## Summary
- 5 public tools at /tools/* (Google preview, Social preview, Schema preview, Sitemap+Robots validator, Favicon checker)
- Anonymous 3/h IP rate-limit + authed quota (free 10/day, pro/business unlimited soft-cap 1000)
- New SSRF-safe LiteFetcher (undici + Cheerio) with private-IP blocklist + rebinding guard
- New quota dimension tools_fetches_daily in @repo/shared
- QuotaCounterService extended to support *_daily windows

## Test plan
- [ ] Full vitest matrix green (shared + gateway + web)
- [ ] Playwright smoke for all 5 tool pages green
- [ ] Manual SSRF probes return 4xx (127.0.0.1, 169.254.169.254, file://)
- [ ] Quota exhaustion returns 429 with correct error codes
- [ ] Cache hit returns meta.cached: true
- [ ] Pages render correctly in EN and VI locales

Spec: docs/superpowers/specs/2026-05-22-seo-tools-suite-design.md
EOF
)"
```

- [ ] **Step 6: Final commit (no-op if everything's already committed)**

```bash
git status
# If clean: done. If not: commit residuals.
```

---

## Acceptance Criteria

All criteria from spec §12 — each must be verifiable:

- [ ] All 5 tools have working endpoints (`POST /api/v1/tools/{google-preview,social-preview,schema-preview,sitemap-validator,favicon-checker}`).
- [ ] All 5 tools reachable in browser at `/{en,vi}/tools/{slug}`.
- [ ] Anonymous user hitting same endpoint 4x in 1 hour → 4th returns 429 with `TOOLS_ANON_RATE_LIMIT`.
- [ ] Authed free user hitting 11 URL-mode requests in 1 day → 11th returns 429 with `TOOLS_QUOTA_EXCEEDED`.
- [ ] Authed pro/business: 11 URL-mode requests all 200 (until 1000 soft cap).
- [ ] Manual / paste mode requests never consume quota (verify with peek before/after).
- [ ] LiteFetcher rejects: `file://`, `gopher://`, port 22, 127.0.0.1, 10.0.0.5, 169.254.169.254, fc00::1, oversize body (>5MB), timeout (>10s).
- [ ] Cache hit on second request to same URL within 10 minutes → `meta.cached: true`.
- [ ] Each tool's response shape matches spec §4.
- [ ] Backend coverage ≥80% on `apps/gateway/src/tools/services/`.
- [ ] FE coverage ≥70% on `apps/web/src/components/tools/`.
- [ ] Playwright smoke passes for all 5 tools.
- [ ] `/tools/*` pages have unique titles + descriptions + are in `sitemap.xml`.
- [ ] `feat/seo-tools-suite` rebased on `main` and PR opened.

---

## Notes / Out-of-Plan Refinements

These are explicitly NOT in scope for this plan; create follow-up tickets if needed:

- **True cache-hit-skips-quota** in controllers (currently v1: quota charged before fetch even on cache hit). See Task 11 step 6 note. Refine when `LiteFetcher.peekCache()` is added.
- **Prometheus counters** per spec §8 (`tools_requests_total`, `tools_fetch_blocked_total`, `tools_quota_exhausted_total`). Initial observability comes for free from NestJS `Logger.log(...)` calls inside controllers + `ToolsQuotaService`. Add prom-client wiring as a follow-up.
- **DB audit log** for `SSRF_BLOCKED` events (currently only structured log).
- **Favicon-specific 1-hour cache TTL** (spec §3.5). Current Task 8 caches all fetches at 10 min; favicon could benefit from longer TTL. Wire via a `cacheTtlSeconds` option on `LiteFetcher.get()` and pass 3600 from `FaviconCheckerService`.
- **Bulk export** (Group C from spec) — deferred.
- **Alt-image / llms.txt / OG image generator** (Group B) — deferred.
- **Schema validation beyond 6 supported types**.
- **Sitemap recursion > 1 level**.
- **Multi-tenant per-domain blocklist** (user-configurable allow/deny list for their own fetcher policies).
