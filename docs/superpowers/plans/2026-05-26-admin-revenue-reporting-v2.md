# Admin Revenue Reporting v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rolling-window revenue cards (v1) with a dedicated calendar-period revenue section: month/quarter/year filter, per-plan breakdown, previous-period delta, and CSV export for tax reporting.

**Architecture:** New `AdminRevenueService` + `AdminRevenueController` under the admin module expose `GET /admin/revenue` (JSON) and `GET /admin/revenue/export.csv` (file), both ADMIN-guarded, reading `PaymentIntent`/`Plan` directly via Prisma. Calendar math lives in pure, separately-tested utils (one for gateway, one for web). The web gets a self-contained `AdminRevenueSection` with its own period control + data fetch, leaving the existing audit `AdminStatsCards` (rolling 7/30/90) untouched. Revenue v1 (still uncommitted) is removed as part of this work to avoid two revenue sources.

**Tech Stack:** NestJS + Prisma + class-validator (gateway), Vitest (gateway), Next.js 15 + React 19 + next-intl + TanStack Query + ky (web), Vitest + Testing Library (web).

**Spec:** `docs/superpowers/specs/2026-05-26-admin-revenue-reporting-v2-design.md`

**EXECUTION CONSTRAINT (carried from this session):** Do NOT commit and do NOT `git add` — the repo has ~90 unrelated WIP files; leave all changes uncommitted in the working tree. (The commit steps below are written for completeness but are SKIPPED this session; the orchestrator handles git.)

**Key facts (verified in codebase):**
- `PaymentIntent` (`apps/gateway/prisma/schema.prisma:277`): `amountVnd:Int`, `status` (`pending|paid|expired|failed`), `paidAt:DateTime?`, `planCode:PlanCode`, `refCode`, relation `user`. `status:'paid'` string literal is accepted by Prisma (used in `payment-intent.service.ts:67`).
- `Plan` (`schema.prisma:243`): `code:PlanCode` (`free|pro|business`), `displayName`, `priceVnd`.
- File-download pattern: `@Res() res: Response` (express) + `res.setHeader('Content-Type'...)` + `Content-Disposition` + `res.end(buf)` — see `apps/gateway/src/audits/controllers/audits.controller.ts:113-133`.
- Admin controller pattern: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` + `@Controller('admin')` — `apps/gateway/src/admin/controllers/admin.controller.ts:32-41`. Admin module: `apps/gateway/src/admin/admin.module.ts`.
- Query DTO pattern: class-validator + `@Type(()=>Number)` — `apps/gateway/src/admin/dto/list-users.query.ts`.
- Gateway unit tests: `cd apps/gateway && npx vitest run <file>`. Services constructed manually (no Nest DI): `new AdminService(prisma, analyzer)`.
- Web `api` is a ky instance (`apps/web/src/lib/api/client.ts`) with `prefixUrl` = `/api/v1` and a `beforeRequest` hook attaching the bearer token — so `.blob()` downloads are authenticated. Web unit tests live in `apps/web/tests/unit/**`; use `renderWithIntl` from `apps/web/tests/helpers/render.tsx`.
- `formatVnd` already exists in `apps/web/src/lib/utils/format.ts` (from v1) — keep it, reuse it.

---

## Task 1: Gateway — calendar-period util (pure)

**Files:**
- Create: `apps/gateway/src/admin/services/admin-revenue.util.ts`
- Test: `apps/gateway/test/unit/admin-revenue.util.spec.ts`

- [ ] **Step 1: Write the failing test** — CREATE `apps/gateway/test/unit/admin-revenue.util.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolvePeriod, previousPeriod, splitVat, VAT_PERCENT } from '../../src/admin/services/admin-revenue.util';

const NOW = new Date(2026, 4, 15); // 2026-05-15 (month index 4 = May)

describe('resolvePeriod', () => {
  it('defaults to the current month when nothing is provided', () => {
    const p = resolvePeriod({}, NOW);
    expect(p).toMatchObject({ type: 'month', year: 2026, month: 5, label: 'Tháng 5/2026' });
    expect(p.start.getTime()).toBe(new Date(2026, 4, 1).getTime());
    expect(p.end.getTime()).toBe(new Date(2026, 5, 1).getTime());
  });

  it('resolves an explicit month', () => {
    const p = resolvePeriod({ type: 'month', year: 2026, month: 2 }, NOW);
    expect(p.label).toBe('Tháng 2/2026');
    expect(p.start.getTime()).toBe(new Date(2026, 1, 1).getTime());
    expect(p.end.getTime()).toBe(new Date(2026, 2, 1).getTime());
  });

  it('resolves a quarter to its 3 months', () => {
    const p = resolvePeriod({ type: 'quarter', year: 2026, quarter: 2 }, NOW);
    expect(p).toMatchObject({ type: 'quarter', quarter: 2, label: 'Quý 2/2026' });
    expect(p.start.getTime()).toBe(new Date(2026, 3, 1).getTime()); // Apr 1
    expect(p.end.getTime()).toBe(new Date(2026, 6, 1).getTime());   // Jul 1
  });

  it('resolves a full year', () => {
    const p = resolvePeriod({ type: 'year', year: 2025 }, NOW);
    expect(p.label).toBe('Năm 2025');
    expect(p.start.getTime()).toBe(new Date(2025, 0, 1).getTime());
    expect(p.end.getTime()).toBe(new Date(2026, 0, 1).getTime());
  });
});

describe('previousPeriod', () => {
  it('steps month back across a year boundary', () => {
    const jan = resolvePeriod({ type: 'month', year: 2026, month: 1 }, NOW);
    const prev = previousPeriod(jan);
    expect(prev).toMatchObject({ year: 2025, month: 12 });
  });

  it('steps quarter back across a year boundary', () => {
    const q1 = resolvePeriod({ type: 'quarter', year: 2026, quarter: 1 }, NOW);
    expect(previousPeriod(q1)).toMatchObject({ year: 2025, quarter: 4 });
  });

  it('steps a year back', () => {
    const y = resolvePeriod({ type: 'year', year: 2026 }, NOW);
    expect(previousPeriod(y)).toMatchObject({ year: 2025 });
  });
});

describe('splitVat', () => {
  it('splits VAT out of a VAT-inclusive gross (net + vat === gross)', () => {
    expect(splitVat(497000)).toEqual({ grossVnd: 497000, vatVnd: 45182, netVnd: 451818 });
    expect(VAT_PERCENT).toBe(10);
  });

  it('returns zeros for a zero gross', () => {
    expect(splitVat(0)).toEqual({ grossVnd: 0, vatVnd: 0, netVnd: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin-revenue.util.spec.ts`
Expected: FAIL — module `admin-revenue.util` does not exist.

- [ ] **Step 3: Implement the util** — CREATE `apps/gateway/src/admin/services/admin-revenue.util.ts`:

```ts
/**
 * Calendar-period math + VAT split for admin revenue reporting. Pure functions
 * (no Prisma / no Date.now side effects beyond the injectable `now`) so they
 * are deterministically testable. All bounds are [start, end) in server-local
 * time, matching how `AdminService.getStats` constructs dates.
 */

/** VAT rate (%) — prices are VAT-inclusive, so VAT is split out of the gross. */
export const VAT_PERCENT = 10;

export type RevenuePeriodType = 'month' | 'quarter' | 'year';

export interface ResolvedPeriod {
  type: RevenuePeriodType;
  year: number;
  month?: number; // 1-12, only for type='month'
  quarter?: number; // 1-4, only for type='quarter'
  start: Date; // inclusive
  end: Date; // exclusive
  label: string; // "Tháng 5/2026" | "Quý 2/2026" | "Năm 2026"
}

export interface RevenuePeriodInput {
  type?: string;
  year?: number;
  month?: number;
  quarter?: number;
}

export function resolvePeriod(input: RevenuePeriodInput, now: Date = new Date()): ResolvedPeriod {
  const type: RevenuePeriodType =
    input.type === 'quarter' || input.type === 'year' ? input.type : 'month';
  const year = input.year ?? now.getFullYear();

  if (type === 'year') {
    return {
      type,
      year,
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
      label: `Năm ${year}`,
    };
  }

  if (type === 'quarter') {
    const quarter = input.quarter ?? Math.floor(now.getMonth() / 3) + 1;
    const firstMonthIdx = (quarter - 1) * 3; // 0-based
    return {
      type,
      year,
      quarter,
      start: new Date(year, firstMonthIdx, 1),
      end: new Date(year, firstMonthIdx + 3, 1),
      label: `Quý ${quarter}/${year}`,
    };
  }

  const month = input.month ?? now.getMonth() + 1; // 1-12
  return {
    type,
    year,
    month,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
    label: `Tháng ${month}/${year}`,
  };
}

export function previousPeriod(p: ResolvedPeriod): ResolvedPeriod {
  if (p.type === 'year') {
    return resolvePeriod({ type: 'year', year: p.year - 1 });
  }
  if (p.type === 'quarter') {
    const q = p.quarter ?? 1;
    return q === 1
      ? resolvePeriod({ type: 'quarter', year: p.year - 1, quarter: 4 })
      : resolvePeriod({ type: 'quarter', year: p.year, quarter: q - 1 });
  }
  const m = p.month ?? 1;
  return m === 1
    ? resolvePeriod({ type: 'month', year: p.year - 1, month: 12 })
    : resolvePeriod({ type: 'month', year: p.year, month: m - 1 });
}

export function splitVat(gross: number): { grossVnd: number; vatVnd: number; netVnd: number } {
  const vatVnd = Math.round((gross * VAT_PERCENT) / (100 + VAT_PERCENT));
  return { grossVnd: gross, vatVnd, netVnd: gross - vatVnd };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin-revenue.util.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit** (SKIP this session)

```bash
git add apps/gateway/src/admin/services/admin-revenue.util.ts apps/gateway/test/unit/admin-revenue.util.spec.ts
git commit -m "feat(gateway): calendar-period + VAT-split util for admin revenue"
```

---

## Task 2: Gateway — `RevenueQueryDto` + `AdminRevenueService.getRevenue()`

**Files:**
- Create: `apps/gateway/src/admin/dto/revenue-query.dto.ts`
- Create: `apps/gateway/src/admin/services/admin-revenue.service.ts`
- Test: `apps/gateway/test/unit/admin-revenue.service.spec.ts`

- [ ] **Step 1: Write the failing test** — CREATE `apps/gateway/test/unit/admin-revenue.service.spec.ts`:

```ts
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminRevenueService } from '../../src/admin/services/admin-revenue.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';

describe('AdminRevenueService.getRevenue', () => {
  let svc: AdminRevenueService;
  const prisma = {
    paymentIntent: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    plan: { findMany: vi.fn() },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AdminRevenueService(prisma);
    (prisma.plan.findMany as any).mockResolvedValue([
      { code: 'free', displayName: 'Miễn phí' },
      { code: 'pro', displayName: 'Chuyên nghiệp' },
      { code: 'business', displayName: 'Doanh nghiệp' },
    ]);
  });

  it('computes gross/net/vat, delta vs previous period, and per-plan breakdown (free excluded)', async () => {
    (prisma.paymentIntent.aggregate as any)
      .mockResolvedValueOnce({ _sum: { amountVnd: 497000 }, _count: 3 }) // current
      .mockResolvedValueOnce({ _sum: { amountVnd: 400000 } }); // previous
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([
      { planCode: 'pro', _sum: { amountVnd: 198000 }, _count: { _all: 2 } },
      { planCode: 'business', _sum: { amountVnd: 299000 }, _count: { _all: 1 } },
    ]);

    const out = await svc.getRevenue({ type: 'month', year: 2026, month: 5 });

    expect(out.grossVnd).toBe(497000);
    expect(out.vatVnd).toBe(45182);
    expect(out.netVnd).toBe(451818);
    expect(out.vatPercent).toBe(10);
    expect(out.paidCount).toBe(3);
    expect(out.deltaPercent).toBe(24.25); // (497000-400000)/400000*100
    expect(out.period).toMatchObject({ type: 'month', year: 2026, month: 5, label: 'Tháng 5/2026' });
    expect(out.byPlan).toEqual([
      { planCode: 'business', displayName: 'Doanh nghiệp', count: 1, grossVnd: 299000 },
      { planCode: 'pro', displayName: 'Chuyên nghiệp', count: 2, grossVnd: 198000 },
    ]);
  });

  it('filters paid intents by paidAt within [start, end)', async () => {
    (prisma.paymentIntent.aggregate as any).mockResolvedValue({ _sum: { amountVnd: 0 }, _count: 0 });
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([]);

    await svc.getRevenue({ type: 'month', year: 2026, month: 5 });

    const where = (prisma.paymentIntent.aggregate as any).mock.calls[0][0].where;
    expect(where.status).toBe('paid');
    expect(where.paidAt.gte).toBeInstanceOf(Date);
    expect(where.paidAt.lt).toBeInstanceOf(Date);
    expect(where.paidAt.gte.getTime()).toBe(new Date(2026, 4, 1).getTime());
    expect(where.paidAt.lt.getTime()).toBe(new Date(2026, 5, 1).getTime());
  });

  it('returns null delta when the previous period had zero revenue, and empty byPlan', async () => {
    (prisma.paymentIntent.aggregate as any)
      .mockResolvedValueOnce({ _sum: { amountVnd: 99000 }, _count: 1 }) // current
      .mockResolvedValueOnce({ _sum: { amountVnd: null } }); // previous = 0
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([]);

    const out = await svc.getRevenue({ type: 'month', year: 2026, month: 5 });

    expect(out.deltaPercent).toBeNull();
    expect(out.byPlan).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin-revenue.service.spec.ts`
Expected: FAIL — `AdminRevenueService` does not exist.

- [ ] **Step 3: Create the DTO** — CREATE `apps/gateway/src/admin/dto/revenue-query.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RevenueQueryDto {
  @ApiPropertyOptional({ enum: ['month', 'quarter', 'year'] })
  @IsOptional()
  @IsIn(['month', 'quarter', 'year'])
  type?: 'month' | 'quarter' | 'year';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number;
}
```

- [ ] **Step 4: Implement `getRevenue`** — CREATE `apps/gateway/src/admin/services/admin-revenue.service.ts`:

```ts
/**
 * @file Admin revenue reporting — calendar-period aggregates over confirmed
 * payments (PaymentIntent status='paid'), with per-plan breakdown,
 * previous-period delta, and CSV export. Revenue is VAT-inclusive; VAT is
 * split out of the gross total. Reads gateway Prisma directly (same pattern as
 * AdminService), since this is admin-only reporting.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RevenueQueryDto } from '../dto/revenue-query.dto';
import { resolvePeriod, previousPeriod, splitVat, VAT_PERCENT } from './admin-revenue.util';

export interface RevenueByPlan {
  planCode: string;
  displayName: string;
  count: number;
  grossVnd: number;
}

export interface RevenueResult {
  period: {
    type: string;
    year: number;
    month?: number;
    quarter?: number;
    label: string;
    start: string;
    end: string;
  };
  grossVnd: number;
  netVnd: number;
  vatVnd: number;
  vatPercent: number;
  paidCount: number;
  deltaPercent: number | null;
  byPlan: RevenueByPlan[];
}

@Injectable()
export class AdminRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenue(query: RevenueQueryDto): Promise<RevenueResult> {
    const period = resolvePeriod(query);
    const prev = previousPeriod(period);

    const [curAgg, prevAgg, planGroups, plans] = await Promise.all([
      this.prisma.paymentIntent.aggregate({
        where: { status: 'paid', paidAt: { gte: period.start, lt: period.end } },
        _sum: { amountVnd: true },
        _count: true,
      }),
      this.prisma.paymentIntent.aggregate({
        where: { status: 'paid', paidAt: { gte: prev.start, lt: prev.end } },
        _sum: { amountVnd: true },
      }),
      this.prisma.paymentIntent.groupBy({
        by: ['planCode'],
        where: { status: 'paid', paidAt: { gte: period.start, lt: period.end } },
        _sum: { amountVnd: true },
        _count: { _all: true },
      }),
      this.prisma.plan.findMany({ select: { code: true, displayName: true } }),
    ]);

    const grossVnd = curAgg._sum.amountVnd ?? 0;
    const { vatVnd, netVnd } = splitVat(grossVnd);

    const prevGross = prevAgg._sum.amountVnd ?? 0;
    const deltaPercent =
      prevGross === 0 ? null : Number((((grossVnd - prevGross) / prevGross) * 100).toFixed(2));

    const planNames = new Map(plans.map((p) => [p.code, p.displayName]));
    const byPlan: RevenueByPlan[] = planGroups
      .filter((g) => g.planCode !== 'free')
      .map((g) => ({
        planCode: g.planCode,
        displayName: planNames.get(g.planCode) ?? g.planCode,
        count: g._count._all,
        grossVnd: g._sum.amountVnd ?? 0,
      }))
      .sort((a, b) => b.grossVnd - a.grossVnd);

    return {
      period: {
        type: period.type,
        year: period.year,
        month: period.month,
        quarter: period.quarter,
        label: period.label,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      grossVnd,
      netVnd,
      vatVnd,
      vatPercent: VAT_PERCENT,
      paidCount: curAgg._count,
      deltaPercent,
      byPlan,
    };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin-revenue.service.spec.ts`
Expected: PASS (all 3 cases).

- [ ] **Step 6: Commit** (SKIP this session)

```bash
git add apps/gateway/src/admin/dto/revenue-query.dto.ts apps/gateway/src/admin/services/admin-revenue.service.ts apps/gateway/test/unit/admin-revenue.service.spec.ts
git commit -m "feat(gateway): AdminRevenueService.getRevenue with per-plan breakdown + delta"
```

---

## Task 3: Gateway — `AdminRevenueService.buildCsv()`

**Files:**
- Modify: `apps/gateway/src/admin/services/admin-revenue.service.ts` (add `buildCsv` + a private CSV-cell helper)
- Test: `apps/gateway/test/unit/admin-revenue.service.spec.ts` (add a `buildCsv` describe block)

- [ ] **Step 1: Write the failing test** — append this describe block to `apps/gateway/test/unit/admin-revenue.service.spec.ts` (inside the file, after the existing `describe('AdminRevenueService.getRevenue', ...)` block):

```ts
describe('AdminRevenueService.buildCsv', () => {
  let svc: AdminRevenueService;
  const prisma = {
    paymentIntent: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    plan: { findMany: vi.fn() },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AdminRevenueService(prisma);
    (prisma.plan.findMany as any).mockResolvedValue([
      { code: 'pro', displayName: 'Chuyên nghiệp' },
      { code: 'business', displayName: 'Doanh nghiệp' },
    ]);
    (prisma.paymentIntent.aggregate as any).mockResolvedValue({ _sum: { amountVnd: 99000 }, _count: 1 });
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([
      { planCode: 'pro', _sum: { amountVnd: 99000 }, _count: { _all: 1 } },
    ]);
    (prisma.paymentIntent.findMany as any).mockResolvedValue([
      {
        refCode: 'SEOAB,CDE',
        paidAt: new Date('2026-05-10T03:00:00.000Z'),
        amountVnd: 99000,
        planCode: 'pro',
        user: { email: 'u@x.com' },
      },
    ]);
  });

  it('builds a UTF-8-BOM CSV with a summary block + a detail row per transaction', async () => {
    const { filename, content } = await svc.buildCsv({ type: 'month', year: 2026, month: 5 });

    expect(filename).toBe('doanh-thu-2026-05.csv');
    expect(content.startsWith('﻿')).toBe(true);
    // detail header present
    expect(content).toContain('Mã GD');
    expect(content).toContain('Doanh thu thuần (VND)');
    // the refCode containing a comma is quoted (CSV-escaped)
    expect(content).toContain('"SEOAB,CDE"');
    expect(content).toContain('u@x.com');
    // detail rows: exactly one transaction row after the detail header
    const lines = content.split('\n');
    const headerIdx = lines.findIndex((l) => l.startsWith('Mã GD'));
    expect(headerIdx).toBeGreaterThan(0);
    expect(lines.slice(headerIdx + 1).filter((l) => l.trim().length > 0)).toHaveLength(1);
  });

  it('names the file by quarter and by year', async () => {
    (prisma.paymentIntent.findMany as any).mockResolvedValue([]);
    const q = await svc.buildCsv({ type: 'quarter', year: 2026, quarter: 2 });
    expect(q.filename).toBe('doanh-thu-2026-Q2.csv');
    const y = await svc.buildCsv({ type: 'year', year: 2026 });
    expect(y.filename).toBe('doanh-thu-2026.csv');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin-revenue.service.spec.ts`
Expected: FAIL — `svc.buildCsv` is not a function.

- [ ] **Step 3: Implement `buildCsv`** — in `apps/gateway/src/admin/services/admin-revenue.service.ts`, add a private helper + the method inside the `AdminRevenueService` class (after `getRevenue`). Also add the `resolvePeriod` import is already present from Task 2.

```ts
  /** Quote a CSV cell when it contains a comma, quote, or newline; double inner quotes. */
  private csvCell(value: string | number): string {
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  async buildCsv(query: RevenueQueryDto): Promise<{ filename: string; content: string }> {
    const period = resolvePeriod(query);
    const summary = await this.getRevenue(query);
    const txns = await this.prisma.paymentIntent.findMany({
      where: { status: 'paid', paidAt: { gte: period.start, lt: period.end } },
      select: { refCode: true, paidAt: true, amountVnd: true, planCode: true, user: { select: { email: true } } },
      orderBy: { paidAt: 'asc' },
    });

    const planNames = new Map(summary.byPlan.map((p) => [p.planCode, p.displayName]));
    const lines: string[] = [];

    // Summary block
    lines.push(this.csvCell('Báo cáo doanh thu') + ',' + this.csvCell(period.label));
    lines.push(this.csvCell('Tổng doanh thu (VND)') + ',' + this.csvCell(summary.grossVnd));
    lines.push(this.csvCell('Doanh thu thuần (VND)') + ',' + this.csvCell(summary.netVnd));
    lines.push(this.csvCell(`Thuế VAT (${summary.vatPercent}%) (VND)`) + ',' + this.csvCell(summary.vatVnd));
    lines.push(this.csvCell('Số giao dịch') + ',' + this.csvCell(summary.paidCount));
    for (const p of summary.byPlan) {
      lines.push(this.csvCell(`Gói ${p.displayName}`) + ',' + this.csvCell(p.grossVnd) + ',' + this.csvCell(`${p.count} GD`));
    }

    lines.push(''); // blank separator

    // Detail block
    lines.push(['Mã GD', 'Ngày thanh toán', 'Email', 'Gói', 'Doanh thu (VND)', 'VAT (VND)', 'Doanh thu thuần (VND)'].map((h) => this.csvCell(h)).join(','));
    for (const t of txns) {
      const { vatVnd, netVnd } = splitVat(t.amountVnd);
      lines.push(
        [
          this.csvCell(t.refCode),
          this.csvCell(t.paidAt ? t.paidAt.toISOString() : ''),
          this.csvCell(t.user?.email ?? ''),
          this.csvCell(planNames.get(t.planCode) ?? t.planCode),
          this.csvCell(t.amountVnd),
          this.csvCell(vatVnd),
          this.csvCell(netVnd),
        ].join(','),
      );
    }

    const suffix =
      period.type === 'year'
        ? `${period.year}`
        : period.type === 'quarter'
          ? `${period.year}-Q${period.quarter}`
          : `${period.year}-${String(period.month).padStart(2, '0')}`;

    return { filename: `doanh-thu-${suffix}.csv`, content: '﻿' + lines.join('\n') };
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin-revenue.service.spec.ts`
Expected: PASS (getRevenue + buildCsv blocks).

- [ ] **Step 5: Commit** (SKIP this session)

```bash
git add apps/gateway/src/admin/services/admin-revenue.service.ts apps/gateway/test/unit/admin-revenue.service.spec.ts
git commit -m "feat(gateway): AdminRevenueService.buildCsv (summary + per-transaction CSV)"
```

---

## Task 4: Gateway — `AdminRevenueController` + module wiring

**Files:**
- Create: `apps/gateway/src/admin/controllers/admin-revenue.controller.ts`
- Modify: `apps/gateway/src/admin/admin.module.ts`

- [ ] **Step 1: Create the controller** — CREATE `apps/gateway/src/admin/controllers/admin-revenue.controller.ts`:

```ts
/**
 * @file Admin revenue endpoints (`/admin/revenue`) — JSON summary + CSV export.
 * Double-guarded: JWT + Roles(ADMIN). CSV streams through @Res like the audits
 * PDF export so the gateway stays the single JWT-checked download entry point.
 */
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@repo/shared';
import { AdminRevenueService } from '../services/admin-revenue.service';
import { RevenueQueryDto } from '../dto/revenue-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/revenue')
export class AdminRevenueController {
  constructor(private readonly revenue: AdminRevenueService) {}

  @Get()
  @ApiOperation({ summary: 'Doanh thu theo ky lich (thang/quy/nam)' })
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.revenue.getRevenue(query);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Xuat CSV doanh thu theo ky' })
  async exportCsv(@Query() query: RevenueQueryDto, @Res() res: Response) {
    const { filename, content } = await this.revenue.buildCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(content);
    return undefined;
  }
}
```

- [ ] **Step 2: Wire into the admin module** — in `apps/gateway/src/admin/admin.module.ts`, add the imports and register the controller + service. The full file becomes:

```ts
import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminRevenueController } from './controllers/admin-revenue.controller';
import { AdminService } from './services/admin.service';
import { AdminApiKeyService } from './services/admin-api-key.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminRevenueService } from './services/admin-revenue.service';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, AuthModule, BillingModule],
  controllers: [AdminController, AdminSubscriptionsController, AdminRevenueController],
  providers: [AdminService, AdminApiKeyService, AdminSubscriptionsService, AdminRevenueService],
})
export class AdminModule {}
```

- [ ] **Step 3: Type-check the gateway**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx tsc --noEmit`
Expected: no errors in the new files (DI types resolve, `Response` import correct). If the gateway has pre-existing WIP errors unrelated to these files, confirm none are in `admin-revenue.controller.ts` / `admin.module.ts` / `admin-revenue.service.ts`.

- [ ] **Step 4: Run the full gateway unit suite to confirm nothing broke**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run`
Expected: PASS (revenue util + service specs green; no regressions). NOTE: `admin.service.spec.ts` still asserts v1 revenue at this point — it will be fixed in Task 5. If only `admin.service.spec.ts` revenue cases are red here, that is expected and resolved next.

- [ ] **Step 5: Commit** (SKIP this session)

```bash
git add apps/gateway/src/admin/controllers/admin-revenue.controller.ts apps/gateway/src/admin/admin.module.ts
git commit -m "feat(gateway): wire AdminRevenueController (GET /admin/revenue + export.csv)"
```

---

## Task 5: Gateway — remove revenue v1 from `getStats()`

**Files:**
- Modify: `apps/gateway/src/admin/services/admin.service.ts` (remove `VAT_PERCENT` const + revenue from `getStats`)
- Modify: `apps/gateway/test/unit/admin.service.spec.ts` (remove `paymentIntent` mock + restore original getStats tests)

- [ ] **Step 1: Restore the original `getStats` tests** — in `apps/gateway/test/unit/admin.service.spec.ts`:

(a) Remove `paymentIntent: { aggregate: vi.fn() },` from the shared `prisma` mock object (revert it to `user`/`audit` only):

```ts
  const prisma = {
    user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    audit: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
  } as unknown as PrismaService;
```

(b) Replace the entire `describe('getStats', ...)` block (the 3 v1 revenue tests) with the original 2 tests:

```ts
  describe('getStats', () => {
    it('computes success rate, averages, and top domains', async () => {
      (prisma.user.count as any)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(3); // newUsersToday
      (prisma.audit.count as any)
        .mockResolvedValueOnce(500) // totalAudits
        .mockResolvedValueOnce(12) // auditsToday
        .mockResolvedValueOnce(80) // successCount
        .mockResolvedValueOnce(20); // failedCount
      (prisma.audit.aggregate as any)
        .mockResolvedValueOnce({ _avg: { seoScore: 73.5 } })
        .mockResolvedValueOnce({ _avg: { crawlDurationMs: 1499.6 } });
      (prisma.audit.groupBy as any).mockResolvedValue([
        { domain: 'a.com', _count: { domain: 9 } },
        { domain: 'b.com', _count: { domain: 4 } },
      ]);

      const stats = await svc.getStats();

      expect(stats.overview.totalUsers).toBe(100);
      expect(stats.overview.totalAudits).toBe(500);
      expect(stats.overview.successRate).toBe(80); // 80 / (80+20) * 100
      expect(stats.overview.avgCrawlTimeMs).toBe(1500); // rounded
      expect(stats.overview.avgSeoScore).toBe(73.5);
      expect(stats.newUsersToday).toBe(3);
      expect(stats.auditsToday).toBe(12);
      expect(stats.topDomains).toEqual([
        { domain: 'a.com', count: 9 },
        { domain: 'b.com', count: 4 },
      ]);
      expect(stats).not.toHaveProperty('revenue');
    });

    it('reports a 0 success rate when there are no completed/failed audits', async () => {
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.audit.count as any).mockResolvedValue(0);
      (prisma.audit.aggregate as any).mockResolvedValue({ _avg: { seoScore: null, crawlDurationMs: null } });
      (prisma.audit.groupBy as any).mockResolvedValue([]);

      const stats = await svc.getStats();
      expect(stats.overview.successRate).toBe(0);
      expect(stats.overview.avgSeoScore).toBe(0);
      expect(stats.overview.avgCrawlTimeMs).toBe(0);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they FAIL**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin.service.spec.ts`
Expected: FAIL — `getStats` still returns `revenue` (the `not.toHaveProperty('revenue')` assertion fails).

- [ ] **Step 3: Remove revenue from `admin.service.ts`** — in `apps/gateway/src/admin/services/admin.service.ts`:

(a) Delete the `VAT_PERCENT` constant (the `/** VAT rate ... */ const VAT_PERCENT = 10;` line added in v1).

(b) Remove `revenueAgg` from the `Promise.all` destructuring array and remove the `this.prisma.paymentIntent.aggregate({...})` entry (the 10th entry) so `getStats` returns to its original 9 queries.

(c) Delete the three revenue computation lines:
```ts
    const grossVnd = revenueAgg._sum.amountVnd ?? 0;
    const vatVnd = Math.round((grossVnd * VAT_PERCENT) / (100 + VAT_PERCENT));
    const netVnd = grossVnd - vatVnd;
```

(d) Delete the `revenue: { ... }` block from the returned object. The return becomes exactly:
```ts
    return {
      overview: {
        totalUsers,
        totalAudits,
        successRate,
        avgCrawlTimeMs: Math.round(Number(avgDurationAgg._avg.crawlDurationMs ?? 0)),
        avgSeoScore: Number((avgScoreAgg._avg.seoScore ?? 0).toString()),
      },
      newUsersToday,
      auditsToday,
      topDomains: topDomains.map((d) => ({ domain: d.domain, count: d._count.domain })),
    };
```

- [ ] **Step 4: Run the tests to verify they PASS**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/gateway" && npx vitest run test/unit/admin.service.spec.ts`
Expected: PASS — getStats no longer has `revenue`.

- [ ] **Step 5: Commit** (SKIP this session)

```bash
git add apps/gateway/src/admin/services/admin.service.ts apps/gateway/test/unit/admin.service.spec.ts
git commit -m "refactor(gateway): drop revenue v1 from getStats (moved to /admin/revenue)"
```

---

## Task 6: Web — calendar-period util (pure)

**Files:**
- Create: `apps/web/src/lib/utils/revenue-period.ts`
- Test: `apps/web/tests/unit/revenue-period.test.ts`

- [ ] **Step 1: Write the failing test** — CREATE `apps/web/tests/unit/revenue-period.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  defaultPeriod,
  shiftPeriod,
  periodToQuery,
  formatPeriodLabel,
  type RevenuePeriodState,
} from "@/lib/utils/revenue-period";

const may2026: RevenuePeriodState = { type: "month", year: 2026, month: 5, quarter: 2 };

describe("defaultPeriod", () => {
  it("returns the current month/quarter for a given now", () => {
    const p = defaultPeriod(new Date(2026, 4, 15)); // May 2026
    expect(p).toEqual({ type: "month", year: 2026, month: 5, quarter: 2 });
  });
});

describe("shiftPeriod", () => {
  it("steps month back across a year boundary", () => {
    const jan: RevenuePeriodState = { type: "month", year: 2026, month: 1, quarter: 1 };
    expect(shiftPeriod(jan, -1)).toMatchObject({ year: 2025, month: 12 });
  });
  it("steps month forward across a year boundary", () => {
    const dec: RevenuePeriodState = { type: "month", year: 2026, month: 12, quarter: 4 };
    expect(shiftPeriod(dec, 1)).toMatchObject({ year: 2027, month: 1 });
  });
  it("steps quarter back across a year boundary", () => {
    const q1: RevenuePeriodState = { type: "quarter", year: 2026, month: 1, quarter: 1 };
    expect(shiftPeriod(q1, -1)).toMatchObject({ year: 2025, quarter: 4 });
  });
  it("steps year", () => {
    const y: RevenuePeriodState = { type: "year", year: 2026, month: 5, quarter: 2 };
    expect(shiftPeriod(y, 1)).toMatchObject({ year: 2027 });
  });
});

describe("periodToQuery", () => {
  it("emits only the relevant keys per type", () => {
    expect(periodToQuery(may2026)).toEqual({ type: "month", year: "2026", month: "5" });
    expect(periodToQuery({ ...may2026, type: "quarter" })).toEqual({ type: "quarter", year: "2026", quarter: "2" });
    expect(periodToQuery({ ...may2026, type: "year" })).toEqual({ type: "year", year: "2026" });
  });
});

describe("formatPeriodLabel", () => {
  it("formats per type in Vietnamese", () => {
    expect(formatPeriodLabel(may2026)).toBe("Tháng 5/2026");
    expect(formatPeriodLabel({ ...may2026, type: "quarter" })).toBe("Quý 2/2026");
    expect(formatPeriodLabel({ ...may2026, type: "year" })).toBe("Năm 2026");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/web" && npx vitest run tests/unit/revenue-period.test.ts`
Expected: FAIL — module `@/lib/utils/revenue-period` does not exist.

- [ ] **Step 3: Implement the util** — CREATE `apps/web/src/lib/utils/revenue-period.ts`:

```ts
/**
 * Client-side calendar-period state + math for the admin revenue section.
 * Pure functions — the component holds a RevenuePeriodState and derives the
 * API query + label from it. `month`/`quarter` are always kept in sync so
 * switching `type` never loses the user's position in the year.
 */
export type RevenuePeriodType = "month" | "quarter" | "year";

export interface RevenuePeriodState {
  type: RevenuePeriodType;
  year: number;
  month: number; // 1-12
  quarter: number; // 1-4
}

export function defaultPeriod(now: Date = new Date()): RevenuePeriodState {
  return {
    type: "month",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };
}

export function shiftPeriod(p: RevenuePeriodState, dir: -1 | 1): RevenuePeriodState {
  if (p.type === "year") return { ...p, year: p.year + dir };
  if (p.type === "quarter") {
    let quarter = p.quarter + dir;
    let year = p.year;
    if (quarter < 1) { quarter = 4; year -= 1; }
    if (quarter > 4) { quarter = 1; year += 1; }
    return { ...p, year, quarter };
  }
  let month = p.month + dir;
  let year = p.year;
  if (month < 1) { month = 12; year -= 1; }
  if (month > 12) { month = 1; year += 1; }
  return { ...p, year, month };
}

export function periodToQuery(p: RevenuePeriodState): Record<string, string> {
  if (p.type === "year") return { type: "year", year: String(p.year) };
  if (p.type === "quarter") return { type: "quarter", year: String(p.year), quarter: String(p.quarter) };
  return { type: "month", year: String(p.year), month: String(p.month) };
}

export function formatPeriodLabel(p: RevenuePeriodState): string {
  if (p.type === "year") return `Năm ${p.year}`;
  if (p.type === "quarter") return `Quý ${p.quarter}/${p.year}`;
  return `Tháng ${p.month}/${p.year}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/web" && npx vitest run tests/unit/revenue-period.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** (SKIP this session)

```bash
git add apps/web/src/lib/utils/revenue-period.ts apps/web/tests/unit/revenue-period.test.ts
git commit -m "feat(web): revenue-period util (shift/query/label)"
```

---

## Task 7: Web — data layer + remove revenue v1 FE

**Files:**
- Modify: `apps/web/src/lib/api/types.ts` (remove `AdminStats.revenue`, add `AdminRevenue`)
- Modify: `apps/web/src/lib/api/admin.ts` (add `getAdminRevenue` + `exportAdminRevenueCsv`)
- Modify: `apps/web/src/lib/queries/keys.ts` (add `admin.revenue` key)
- Modify: `apps/web/src/lib/queries/use-admin.ts` (add `useAdminRevenue`)
- Modify: `apps/web/src/components/admin/admin-stats-cards.tsx` (remove revenue section + unused imports)
- Delete: `apps/web/tests/unit/admin-stats-cards.test.tsx` (v1 revenue test — component no longer renders revenue)
- Modify: `apps/web/src/messages/vi.json` + `en.json` (remove `admin.stats.revenue` added in v1)

- [ ] **Step 1: Update types** — in `apps/web/src/lib/api/types.ts`:

(a) Remove the `revenue` block from the `AdminStats` interface so it returns to:
```ts
export interface AdminStats {
  overview: {
    totalUsers: number;
    totalAudits: number;
    successRate: number;
    avgCrawlTimeMs: number;
    avgSeoScore: number;
  };
  newUsersToday: number;
  auditsToday: number;
  topDomains: Array<{ domain: string; count: number }>;
}
```

(b) Add the `AdminRevenue` interface immediately after `AdminStats`:
```ts
export interface AdminRevenue {
  period: {
    type: "month" | "quarter" | "year";
    year: number;
    month?: number;
    quarter?: number;
    label: string;
    start: string;
    end: string;
  };
  grossVnd: number;
  netVnd: number;
  vatVnd: number;
  vatPercent: number;
  paidCount: number;
  deltaPercent: number | null;
  byPlan: Array<{ planCode: string; displayName: string; count: number; grossVnd: number }>;
}
```

- [ ] **Step 2: Add the API client functions** — in `apps/web/src/lib/api/admin.ts`:

(a) Add `AdminRevenue` to the type import block (from `@/lib/api/types`).

(b) Append these two functions at the end of the file:
```ts
/**
 * `GET /admin/revenue` — calendar-period revenue summary (gross/net/vat,
 * per-plan breakdown, delta vs previous period). `query` is built by
 * `periodToQuery`.
 */
export async function getAdminRevenue(
  query: Record<string, string>,
): Promise<AdminRevenue> {
  return api.get("admin/revenue", { searchParams: query }).json<AdminRevenue>();
}

/**
 * `GET /admin/revenue/export.csv` — download the CSV for the given period.
 * Reads the server `Content-Disposition` filename; falls back to a generic
 * name. The ky `beforeRequest` hook attaches the bearer token, so the blob
 * download stays authenticated.
 */
export async function exportAdminRevenueCsv(
  query: Record<string, string>,
): Promise<void> {
  const res = await api.get("admin/revenue/export.csv", { searchParams: query });
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "doanh-thu.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Add the query key** — in `apps/web/src/lib/queries/keys.ts`, inside `admin`, add a `revenue` key (after `rules`):
```ts
  admin: {
    all: () => ["admin"] as const,
    stats: (period: number) => ["admin", "stats", period] as const,
    users: (filters: Record<string, unknown>) =>
      ["admin", "users", filters] as const,
    rules: () => ["admin", "rules"] as const,
    revenue: (query: Record<string, unknown>) =>
      ["admin", "revenue", query] as const,
  },
```

- [ ] **Step 4: Add the hook** — in `apps/web/src/lib/queries/use-admin.ts`:

(a) Add `getAdminRevenue` to the import from `@/lib/api/admin` and `AdminRevenue` to the import from `@/lib/api/types`.

(b) Add the hook after `useAdminStats`:
```ts
export function useAdminRevenue(query: Record<string, string>) {
  const enabled = useAdminEnabled();
  return useQuery<AdminRevenue>({
    queryKey: queryKeys.admin.revenue(query),
    queryFn: () => getAdminRevenue(query),
    enabled,
    staleTime: 5 * 60 * 1_000,
  });
}
```

- [ ] **Step 5: Remove the revenue section from `admin-stats-cards.tsx`** — in `apps/web/src/components/admin/admin-stats-cards.tsx`:

(a) Remove `Wallet`, `Banknote`, `Receipt` from the lucide-react import (revert to the original 8 icons: `Users, Search, TrendingUp, Clock, Award, UserPlus, ListChecks, Globe`).

(b) Change the format import back to `import { formatDuration, formatScore } from "@/lib/utils/format";` (drop `formatVnd`).

(c) Delete the entire revenue `<section className="grid grid-cols-1 gap-4 sm:grid-cols-3"> ... </section>` block (the 3 revenue cards) that v1 inserted between the overview section and the today/topDomains section.

- [ ] **Step 6: Delete the v1 revenue component test**

Run: `rm "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/web/tests/unit/admin-stats-cards.test.tsx"`
(The component no longer renders revenue, and its fixture used the removed `AdminStats.revenue` field.)

- [ ] **Step 7: Remove the v1 i18n revenue keys** — in BOTH `apps/web/src/messages/vi.json` and `apps/web/src/messages/en.json`, remove the `revenue` block that v1 added inside `admin.stats` (the `{ gross, net, vat, vatLabel, transactions }` object). Ensure the preceding key (`topDomainsEmpty`) no longer has a trailing comma and the JSON stays valid. (The v2 revenue i18n lives under `admin.revenue`, added in Task 8.)

- [ ] **Step 8: Type-check + run web unit tests**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/web" && npx tsc --noEmit && npx vitest run tests/unit/revenue-period.test.ts tests/unit/format-vnd.test.ts`
Expected: tsc clean (no references to the removed `AdminStats.revenue`); the format-vnd + revenue-period tests pass. Validate JSON too:
`cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN" && python3 -c "import json; json.load(open('apps/web/src/messages/vi.json')); json.load(open('apps/web/src/messages/en.json')); print('valid')"`

- [ ] **Step 9: Commit** (SKIP this session)

```bash
git add apps/web/src/lib/api/types.ts apps/web/src/lib/api/admin.ts apps/web/src/lib/queries/keys.ts apps/web/src/lib/queries/use-admin.ts apps/web/src/components/admin/admin-stats-cards.tsx apps/web/src/messages/vi.json apps/web/src/messages/en.json
git rm apps/web/tests/unit/admin-stats-cards.test.tsx
git commit -m "feat(web): admin revenue data layer + drop revenue v1 from stats cards"
```

---

## Task 8: Web — `AdminRevenueSection` component + wire into page

**Files:**
- Create: `apps/web/src/components/admin/admin-revenue-section.tsx`
- Modify: `apps/web/src/messages/vi.json` + `en.json` (add `admin.revenue` block)
- Modify: `apps/web/src/app/[locale]/(app)/admin/stats/page.tsx` (render the section)
- Test: `apps/web/tests/unit/admin-revenue-section.test.tsx` (create)

- [ ] **Step 1: Add the i18n keys** — in `apps/web/src/messages/vi.json`, add a `revenue` block inside the `admin` object (sibling of `stats`):
```json
    "revenue": {
      "title": "Doanh thu & thuế",
      "typeMonth": "Tháng",
      "typeQuarter": "Quý",
      "typeYear": "Năm",
      "prev": "Kỳ trước",
      "next": "Kỳ sau",
      "export": "Xuất CSV",
      "gross": "Tổng doanh thu",
      "net": "Doanh thu thuần",
      "vat": "Thuế VAT",
      "vatLabel": "VAT {percent}%",
      "transactions": "{count} giao dịch",
      "deltaVsPrev": "so với kỳ trước",
      "byPlanTitle": "Doanh thu theo gói",
      "byPlanEmpty": "Chưa có giao dịch",
      "loading": "Đang tải doanh thu…",
      "error": "Không tải được doanh thu"
    }
```
And in `apps/web/src/messages/en.json`, the matching block:
```json
    "revenue": {
      "title": "Revenue & tax",
      "typeMonth": "Month",
      "typeQuarter": "Quarter",
      "typeYear": "Year",
      "prev": "Previous period",
      "next": "Next period",
      "export": "Export CSV",
      "gross": "Total revenue",
      "net": "Net revenue",
      "vat": "VAT",
      "vatLabel": "VAT {percent}%",
      "transactions": "{count} transactions",
      "deltaVsPrev": "vs previous period",
      "byPlanTitle": "Revenue by plan",
      "byPlanEmpty": "No transactions",
      "loading": "Loading revenue…",
      "error": "Couldn't load revenue"
    }
```
Keep both files valid JSON (correct commas).

- [ ] **Step 2: Write the failing test** — CREATE `apps/web/tests/unit/admin-revenue-section.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import type { AdminRevenue } from "@/lib/api/types";

const revenue: AdminRevenue = {
  period: { type: "month", year: 2026, month: 5, label: "Tháng 5/2026", start: "", end: "" },
  grossVnd: 497000,
  netVnd: 451818,
  vatVnd: 45182,
  vatPercent: 10,
  paidCount: 3,
  deltaPercent: 24.25,
  byPlan: [
    { planCode: "business", displayName: "Doanh nghiệp", count: 1, grossVnd: 299000 },
    { planCode: "pro", displayName: "Chuyên nghiệp", count: 2, grossVnd: 198000 },
  ],
};

const useAdminRevenue = vi.fn();
const exportAdminRevenueCsv = vi.fn();

vi.mock("@/lib/queries/use-admin", () => ({
  useAdminRevenue: (q: Record<string, string>) => useAdminRevenue(q),
}));
vi.mock("@/lib/api/admin", () => ({
  exportAdminRevenueCsv: (q: Record<string, string>) => exportAdminRevenueCsv(q),
}));

import { AdminRevenueSection } from "@/components/admin/admin-revenue-section";

beforeEach(() => {
  vi.clearAllMocks();
  useAdminRevenue.mockReturnValue({ data: revenue, isLoading: false, isError: false });
});

describe("AdminRevenueSection", () => {
  it("renders gross/net/vat, the delta, and the per-plan breakdown", () => {
    renderWithIntl(<AdminRevenueSection />);
    expect(screen.getByText("497.000đ")).toBeInTheDocument();
    expect(screen.getByText("451.818đ")).toBeInTheDocument();
    expect(screen.getByText("45.182đ")).toBeInTheDocument();
    expect(screen.getByText("VAT 10%")).toBeInTheDocument();
    expect(screen.getByText("3 giao dịch")).toBeInTheDocument();
    expect(screen.getByText(/24[.,]25/)).toBeInTheDocument();
    expect(screen.getByText("Doanh nghiệp")).toBeInTheDocument();
    expect(screen.getByText("Chuyên nghiệp")).toBeInTheDocument();
  });

  it("requests quarter data when the Quý toggle is clicked", () => {
    renderWithIntl(<AdminRevenueSection />);
    fireEvent.click(screen.getByRole("button", { name: "Quý" }));
    const lastArg = useAdminRevenue.mock.calls.at(-1)?.[0];
    expect(lastArg).toMatchObject({ type: "quarter" });
  });

  it("exports the CSV for the current period when Xuất CSV is clicked", () => {
    renderWithIntl(<AdminRevenueSection />);
    fireEvent.click(screen.getByRole("button", { name: "Xuất CSV" }));
    expect(exportAdminRevenueCsv).toHaveBeenCalledWith(
      expect.objectContaining({ type: "month" }),
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/web" && npx vitest run tests/unit/admin-revenue-section.test.tsx`
Expected: FAIL — component `@/components/admin/admin-revenue-section` does not exist.

- [ ] **Step 4: Implement the component** — CREATE `apps/web/src/components/admin/admin-revenue-section.tsx`:

```tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Wallet, Banknote, Receipt, ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminRevenue } from "@/lib/queries/use-admin";
import { exportAdminRevenueCsv } from "@/lib/api/admin";
import { formatVnd } from "@/lib/utils/format";
import {
  defaultPeriod,
  shiftPeriod,
  periodToQuery,
  formatPeriodLabel,
  type RevenuePeriodState,
  type RevenuePeriodType,
} from "@/lib/utils/revenue-period";

const TYPES: RevenuePeriodType[] = ["month", "quarter", "year"];

export function AdminRevenueSection() {
  const t = useTranslations("admin.revenue");
  const [period, setPeriod] = React.useState<RevenuePeriodState>(() => defaultPeriod());
  const query = useAdminRevenue(periodToQuery(period));
  const data = query.data;

  const typeLabel: Record<RevenuePeriodType, string> = {
    month: t("typeMonth"),
    quarter: t("typeQuarter"),
    year: t("typeYear"),
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-ui text-lg font-semibold text-fg">{t("title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {TYPES.map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setPeriod((p) => ({ ...p, type: tp }))}
                className={`rounded px-3 py-1 font-ui text-sm ${
                  period.type === tp ? "bg-fg text-bg" : "text-fg-muted"
                }`}
              >
                {typeLabel[tp]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon" aria-label={t("prev")} onClick={() => setPeriod((p) => shiftPeriod(p, -1))}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <span className="min-w-28 text-center font-ui text-sm text-fg">{formatPeriodLabel(period)}</span>
            <Button variant="secondary" size="icon" aria-label={t("next")} onClick={() => setPeriod((p) => shiftPeriod(p, 1))}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <Button variant="secondary" onClick={() => exportAdminRevenueCsv(periodToQuery(period))}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            {t("export")}
          </Button>
        </div>
      </header>

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}

      {query.isError && <Card className="p-5 font-ui text-sm text-class-poor">{t("error")}</Card>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Wallet className="h-4 w-4" aria-hidden />
                <span className="font-ui text-xs">{t("gross")}</span>
              </div>
              <span className="font-ui text-2xl font-semibold text-fg">{formatVnd(data.grossVnd)}</span>
              <div className="flex items-center gap-2">
                <span className="font-ui text-xs text-fg-muted">
                  {t("transactions", { count: data.paidCount })}
                </span>
                {data.deltaPercent !== null && (
                  <span
                    className={`flex items-center gap-0.5 font-ui text-xs ${
                      data.deltaPercent >= 0 ? "text-class-good" : "text-class-poor"
                    }`}
                  >
                    {data.deltaPercent >= 0 ? (
                      <TrendingUp className="h-3 w-3" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3 w-3" aria-hidden />
                    )}
                    {data.deltaPercent > 0 ? "+" : ""}
                    {data.deltaPercent}% {t("deltaVsPrev")}
                  </span>
                )}
              </div>
            </Card>
            <Card className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Banknote className="h-4 w-4" aria-hidden />
                <span className="font-ui text-xs">{t("net")}</span>
              </div>
              <span className="font-ui text-2xl font-semibold text-fg">{formatVnd(data.netVnd)}</span>
            </Card>
            <Card className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Receipt className="h-4 w-4" aria-hidden />
                <span className="font-ui text-xs">{t("vat")}</span>
              </div>
              <span className="font-ui text-2xl font-semibold text-fg">{formatVnd(data.vatVnd)}</span>
              <span className="font-ui text-xs text-fg-muted">{t("vatLabel", { percent: data.vatPercent })}</span>
            </Card>
          </div>

          <Card className="flex flex-col gap-2 p-5">
            <span className="font-ui text-xs text-fg-muted">{t("byPlanTitle")}</span>
            {data.byPlan.length === 0 ? (
              <p className="font-ui text-sm text-fg-muted">{t("byPlanEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.byPlan.map((p) => (
                  <li key={p.planCode} className="flex items-center justify-between font-ui text-sm">
                    <span className="text-fg">{p.displayName}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-fg-muted">{t("transactions", { count: p.count })}</span>
                      <span className="font-semibold text-fg">{formatVnd(p.grossVnd)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
```

NOTE (verified): `Button` supports `size="icon"` (h-10 w-10) and `variant="secondary"`. The color tokens `text-class-good` (positive delta) and `text-class-poor` (negative delta / error) both exist — `text-class-good` is used in `settings/billing/page.tsx`, `text-class-poor` in `admin/stats/page.tsx`. Use them as written.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/web" && npx vitest run tests/unit/admin-revenue-section.test.tsx`
Expected: PASS (renders cards + delta + breakdown; toggle + export wired).

- [ ] **Step 6: Wire into the stats page** — in `apps/web/src/app/[locale]/(app)/admin/stats/page.tsx`:

(a) Add the import: `import { AdminRevenueSection } from "@/components/admin/admin-revenue-section";`

(b) Render it after the existing `{query.data && <AdminStatsCards stats={query.data} />}` line, still inside the outer `<div className="flex flex-col gap-5 p-6">`:
```tsx
      {query.data && <AdminStatsCards stats={query.data} />}

      <AdminRevenueSection />
```

- [ ] **Step 7: Type-check + run the full web unit suite**

Run: `cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/apps/web" && npx tsc --noEmit && npx vitest run`
Expected: tsc clean; all web unit tests pass (revenue-period, format-vnd, admin-revenue-section, plus pre-existing suites). Confirm JSON validity:
`cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN" && python3 -c "import json; json.load(open('apps/web/src/messages/vi.json')); json.load(open('apps/web/src/messages/en.json')); print('valid')"`

- [ ] **Step 8: Commit** (SKIP this session)

```bash
git add apps/web/src/components/admin/admin-revenue-section.tsx apps/web/src/app/[locale]/(app)/admin/stats/page.tsx apps/web/src/messages/vi.json apps/web/src/messages/en.json apps/web/tests/unit/admin-revenue-section.test.tsx
git commit -m "feat(web): AdminRevenueSection (calendar period + breakdown + delta + CSV export)"
```

---

## Verification (after all tasks)

- [ ] `cd apps/gateway && npx vitest run` — all green (admin-revenue.util, admin-revenue.service, admin.service without revenue, no regressions).
- [ ] `cd apps/gateway && npx tsc --noEmit` — clean for the new files.
- [ ] `cd apps/web && npx vitest run` — all green (revenue-period, format-vnd, admin-revenue-section, pre-existing).
- [ ] `cd apps/web && npx tsc --noEmit` — clean.
- [ ] Manual (optional): rebuild web (`cd apps/web && npm run build`) + restart; open `localhost:3001/vi/admin/stats` as admin. Confirm: audit cards still use the 7/30/90 dropdown; the revenue section has its own Tháng/Quý/Năm toggle + ◀ ▶; switching period refetches; per-plan breakdown shows pro/business; "Xuất CSV" downloads `doanh-thu-<kỳ>.csv` that opens in Excel with Vietnamese intact and a summary + transaction list.

## Notes / out of scope (do not implement)

- No `.xlsx` (CSV only). No refund handling. No revenue chart. No MRR / active-subscription metrics. No multi-currency. No DB migration. No arbitrary date-range (whole month/quarter/year only).
- The unrelated working-tree fix to root `package.json` (stray `k` removed) is independent — leave it for the user.
- Revenue v1 (uncommitted) is fully removed by Tasks 5 + 7; after this plan there is a single revenue source (`/admin/revenue`).
