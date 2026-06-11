# Admin Revenue & VAT Stats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three revenue KPI cards (Tổng doanh thu / Doanh thu thuần / Thuế VAT) to the admin "Thống kê" page, computed over the selected period from confirmed payments.

**Architecture:** Extend the existing `GET /admin/stats` endpoint (Cách A) — add one `PaymentIntent` aggregate to `AdminService.getStats()`, derive VAT by splitting the gross total (VAT 10% inclusive), and surface a new `revenue` block in the response. Frontend adds a `formatVnd` helper, extends the `AdminStats` type, and renders three cards. No DB migration.

**Tech Stack:** NestJS + Prisma (gateway), Vitest (gateway unit tests), Next.js 15 + React 19 + next-intl + Tailwind, Vitest + Testing Library (web).

**Spec:** `docs/superpowers/specs/2026-05-26-admin-revenue-tax-stats-design.md`

**Key facts (verified in codebase):**
- `PaymentIntent` model has `amountVnd: Int`, `status: PaymentIntentStatus` (`pending|paid|expired|failed`), `paidAt: DateTime?` — `apps/gateway/prisma/schema.prisma:277`.
- `status: 'paid'` string literal is accepted by the Prisma client (already used in `payment-intent.service.ts:67`).
- `getStats()` already runs its queries through one `Promise.all` — `apps/gateway/src/admin/services/admin.service.ts:117`.
- Gateway unit tests: `cd apps/gateway && npx vitest run <file>` (vitest). Mock pattern: construct service manually, no Nest DI — see `apps/gateway/test/unit/admin.service.spec.ts`.
- Web unit tests live in `apps/web/tests/unit/**` (vitest `include` = `tests/unit/**/*.{test,spec}.{ts,tsx}`). Use `renderWithIntl` from `apps/web/tests/helpers/render.tsx` for components calling `useTranslations`.
- Existing VND format pattern: `value.toLocaleString("vi-VN") + "đ"` (see `apps/web/src/components/billing/PlanCard.tsx:39`).

**Worked example used across tests:** 3 paid intents in-period summing to **497000** VND →
`vat = round(497000 × 10 / 110) = 45182`, `net = 497000 − 45182 = 451818`, and `net + vat == gross`.

---

## Task 1: Backend — add `revenue` block to `getStats()`

**Files:**
- Modify: `apps/gateway/src/admin/services/admin.service.ts` (top-of-file constant; `getStats()` at line 117-171)
- Test: `apps/gateway/test/unit/admin.service.spec.ts` (shared prisma mock at lines 10-13; `getStats` describe block at lines 135-179)

- [ ] **Step 1: Add `paymentIntent` to the shared prisma mock**

In `apps/gateway/test/unit/admin.service.spec.ts`, extend the `prisma` mock object (currently lines 10-13) so the new aggregate call resolves:

```ts
  const prisma = {
    user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    audit: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    paymentIntent: { aggregate: vi.fn() },
  } as unknown as PrismaService;
```

- [ ] **Step 2: Update the two existing `getStats` tests to mock revenue + assert the new block**

Replace the entire `describe('getStats', ...)` block (lines 135-179) with:

```ts
  describe('getStats', () => {
    it('computes success rate, averages, top domains, and revenue (VAT 10% inclusive)', async () => {
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
      (prisma.paymentIntent.aggregate as any).mockResolvedValue({
        _sum: { amountVnd: 497000 },
        _count: 3,
      });

      const stats = await svc.getStats();

      expect(stats.overview.totalUsers).toBe(100);
      expect(stats.overview.successRate).toBe(80);
      expect(stats.overview.avgCrawlTimeMs).toBe(1500);
      expect(stats.topDomains).toEqual([
        { domain: 'a.com', count: 9 },
        { domain: 'b.com', count: 4 },
      ]);
      expect(stats.revenue).toEqual({
        grossVnd: 497000,
        netVnd: 451818,
        vatVnd: 45182,
        vatPercent: 10,
        paidCount: 3,
      });
      expect(stats.revenue.netVnd + stats.revenue.vatVnd).toBe(stats.revenue.grossVnd);
    });

    it('only counts paid intents inside the period via paidAt', async () => {
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.audit.count as any).mockResolvedValue(0);
      (prisma.audit.aggregate as any).mockResolvedValue({ _avg: { seoScore: null, crawlDurationMs: null } });
      (prisma.audit.groupBy as any).mockResolvedValue([]);
      (prisma.paymentIntent.aggregate as any).mockResolvedValue({ _sum: { amountVnd: 0 }, _count: 0 });

      await svc.getStats(30);

      const where = (prisma.paymentIntent.aggregate as any).mock.calls[0][0].where;
      expect(where.status).toBe('paid');
      expect(where.paidAt.gte).toBeInstanceOf(Date);
    });

    it('reports zero revenue and zero success rate when there is no activity', async () => {
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.audit.count as any).mockResolvedValue(0);
      (prisma.audit.aggregate as any).mockResolvedValue({ _avg: { seoScore: null, crawlDurationMs: null } });
      (prisma.audit.groupBy as any).mockResolvedValue([]);
      (prisma.paymentIntent.aggregate as any).mockResolvedValue({ _sum: { amountVnd: null }, _count: 0 });

      const stats = await svc.getStats();

      expect(stats.overview.successRate).toBe(0);
      expect(stats.revenue).toEqual({
        grossVnd: 0,
        netVnd: 0,
        vatVnd: 0,
        vatPercent: 10,
        paidCount: 0,
      });
    });
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd apps/gateway && npx vitest run test/unit/admin.service.spec.ts`
Expected: FAIL — `getStats` returns no `revenue` property (the three new assertions on `stats.revenue` fail; `paymentIntent.aggregate` is not yet called so the `paidAt`/`status` `where` assertion fails too).

- [ ] **Step 4: Add the `VAT_PERCENT` constant**

In `apps/gateway/src/admin/services/admin.service.ts`, after the imports (after line 14, before `@Injectable()`), add:

```ts
/** VAT rate (%) — prices are VAT-inclusive, so VAT is split out of the gross total. */
const VAT_PERCENT = 10;
```

- [ ] **Step 5: Add the revenue aggregate to the `Promise.all` and the `revenue` block to the return**

In `getStats()` (line 117-171), add `revenueAgg` to the destructured array and a tenth `Promise.all` entry:

```ts
    const [
      totalUsers,
      totalAudits,
      newUsersToday,
      auditsToday,
      successCount,
      failedCount,
      avgScoreAgg,
      avgDurationAgg,
      topDomains,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.audit.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.audit.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.audit.count({ where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } } }),
      this.prisma.audit.count({ where: { status: AuditStatus.FAILED, createdAt: { gte: since } } }),
      this.prisma.audit.aggregate({
        where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } },
        _avg: { seoScore: true },
      }),
      this.prisma.audit.aggregate({
        where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } },
        _avg: { crawlDurationMs: true },
      }),
      this.prisma.audit.groupBy({
        by: ['domain'],
        where: { createdAt: { gte: since } },
        _count: { domain: true },
        orderBy: { _count: { domain: 'desc' } },
        take: 10,
      }),
      this.prisma.paymentIntent.aggregate({
        where: { status: 'paid', paidAt: { gte: since } },
        _sum: { amountVnd: true },
        _count: true,
      }),
    ]);
```

Then, after the `successRate` calculation (after line 157), compute revenue:

```ts
    const grossVnd = revenueAgg._sum.amountVnd ?? 0;
    const vatVnd = Math.round((grossVnd * VAT_PERCENT) / (100 + VAT_PERCENT));
    const netVnd = grossVnd - vatVnd;
```

Finally, add the `revenue` block to the returned object (after `topDomains:`):

```ts
      topDomains: topDomains.map((d) => ({ domain: d.domain, count: d._count.domain })),
      revenue: {
        grossVnd,
        netVnd,
        vatVnd,
        vatPercent: VAT_PERCENT,
        paidCount: revenueAgg._count,
      },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/gateway && npx vitest run test/unit/admin.service.spec.ts`
Expected: PASS — all `getStats` cases green, including `netVnd + vatVnd === grossVnd`.

- [ ] **Step 7: Commit**

```bash
git add apps/gateway/src/admin/services/admin.service.ts apps/gateway/test/unit/admin.service.spec.ts
git commit -m "feat(gateway): add revenue & VAT to admin getStats"
```

---

## Task 2: Frontend — `formatVnd` helper + extend `AdminStats` type

**Files:**
- Modify: `apps/web/src/lib/utils/format.ts` (add `formatVnd`)
- Modify: `apps/web/src/lib/api/types.ts` (extend `AdminStats` at lines 306-317)
- Test: `apps/web/tests/unit/format-vnd.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/format-vnd.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatVnd } from "@/lib/utils/format";

describe("formatVnd", () => {
  it("formats a VND amount with vi-VN grouping and đ suffix", () => {
    expect(formatVnd(497000)).toBe("497.000đ");
    expect(formatVnd(451818)).toBe("451.818đ");
  });

  it("formats zero as 0đ", () => {
    expect(formatVnd(0)).toBe("0đ");
  });

  it("returns — for null, undefined, or NaN", () => {
    expect(formatVnd(null)).toBe("—");
    expect(formatVnd(undefined)).toBe("—");
    expect(formatVnd(Number.NaN)).toBe("—");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run tests/unit/format-vnd.test.ts`
Expected: FAIL — `formatVnd` is not exported from `@/lib/utils/format`.

- [ ] **Step 3: Implement `formatVnd`**

In `apps/web/src/lib/utils/format.ts`, append:

```ts
/**
 * Render a VND amount: "497.000đ". Uses vi-VN digit grouping (dots) to match
 * the pricing UI. Returns "—" for null/undefined/NaN.
 */
export function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run tests/unit/format-vnd.test.ts`
Expected: PASS.

- [ ] **Step 5: Extend the `AdminStats` type**

In `apps/web/src/lib/api/types.ts`, replace the `AdminStats` interface (lines 306-317) with:

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
  revenue: {
    grossVnd: number;
    netVnd: number;
    vatVnd: number;
    vatPercent: number;
    paidCount: number;
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/utils/format.ts apps/web/src/lib/api/types.ts apps/web/tests/unit/format-vnd.test.ts
git commit -m "feat(web): add formatVnd helper + revenue fields on AdminStats type"
```

---

## Task 3: Frontend — render the three revenue cards + i18n

**Files:**
- Modify: `apps/web/src/components/admin/admin-stats-cards.tsx`
- Modify: `apps/web/src/messages/vi.json` (`admin.stats` block)
- Modify: `apps/web/src/messages/en.json` (`admin.stats` block)
- Test: `apps/web/tests/unit/admin-stats-cards.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/admin-stats-cards.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import type { AdminStats } from "@/lib/api/types";

const stats: AdminStats = {
  overview: { totalUsers: 0, totalAudits: 0, successRate: 0, avgCrawlTimeMs: 0, avgSeoScore: 0 },
  newUsersToday: 0,
  auditsToday: 0,
  topDomains: [],
  revenue: { grossVnd: 497000, netVnd: 451818, vatVnd: 45182, vatPercent: 10, paidCount: 3 },
};

describe("AdminStatsCards revenue", () => {
  it("renders gross/net/vat in VND with the VAT percent + transaction count", () => {
    renderWithIntl(<AdminStatsCards stats={stats} />);

    expect(screen.getByText("Tổng doanh thu")).toBeInTheDocument();
    expect(screen.getByText("497.000đ")).toBeInTheDocument();
    expect(screen.getByText("Doanh thu thuần")).toBeInTheDocument();
    expect(screen.getByText("451.818đ")).toBeInTheDocument();
    expect(screen.getByText("Thuế VAT")).toBeInTheDocument();
    expect(screen.getByText("45.182đ")).toBeInTheDocument();
    expect(screen.getByText("VAT 10%")).toBeInTheDocument();
    expect(screen.getByText("3 giao dịch")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run tests/unit/admin-stats-cards.test.tsx`
Expected: FAIL — revenue cards / i18n keys not rendered (text not found).

- [ ] **Step 3: Add the i18n keys (vi)**

In `apps/web/src/messages/vi.json`, inside the `admin.stats` object, add a `revenue` block (e.g. after `"topDomainsEmpty"`):

```json
    "topDomainsEmpty": "Chưa có hoạt động",
    "revenue": {
      "gross": "Tổng doanh thu",
      "net": "Doanh thu thuần",
      "vat": "Thuế VAT",
      "vatLabel": "VAT {percent}%",
      "transactions": "{count} giao dịch"
    }
```

- [ ] **Step 4: Add the i18n keys (en)**

In `apps/web/src/messages/en.json`, inside the `admin.stats` object, add the matching block:

```json
    "topDomainsEmpty": "No domain activity yet",
    "revenue": {
      "gross": "Total revenue",
      "net": "Net revenue",
      "vat": "VAT",
      "vatLabel": "VAT {percent}%",
      "transactions": "{count} transactions"
    }
```

- [ ] **Step 5: Render the revenue cards**

In `apps/web/src/components/admin/admin-stats-cards.tsx`:

(a) Extend the lucide-react import (lines 4-13) to include money icons:

```tsx
import {
  Users,
  Search,
  TrendingUp,
  Clock,
  Award,
  UserPlus,
  ListChecks,
  Globe,
  Wallet,
  Banknote,
  Receipt,
} from "lucide-react";
```

(b) Add the `formatVnd` import to the existing format import (line 16):

```tsx
import { formatDuration, formatScore, formatVnd } from "@/lib/utils/format";
```

(c) Insert a revenue section between the overview `</section>` (line 66) and the `today/topDomains` `<section>` (line 68):

```tsx
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2 text-fg-muted">
            <Wallet className="h-4 w-4" aria-hidden />
            <span className="font-ui text-xs">{t("revenue.gross")}</span>
          </div>
          <span className="font-ui text-2xl font-semibold text-fg">
            {formatVnd(stats.revenue.grossVnd)}
          </span>
          <span className="font-ui text-xs text-fg-muted">
            {t("revenue.transactions", { count: stats.revenue.paidCount })}
          </span>
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2 text-fg-muted">
            <Banknote className="h-4 w-4" aria-hidden />
            <span className="font-ui text-xs">{t("revenue.net")}</span>
          </div>
          <span className="font-ui text-2xl font-semibold text-fg">
            {formatVnd(stats.revenue.netVnd)}
          </span>
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2 text-fg-muted">
            <Receipt className="h-4 w-4" aria-hidden />
            <span className="font-ui text-xs">{t("revenue.vat")}</span>
          </div>
          <span className="font-ui text-2xl font-semibold text-fg">
            {formatVnd(stats.revenue.vatVnd)}
          </span>
          <span className="font-ui text-xs text-fg-muted">
            {t("revenue.vatLabel", { percent: stats.revenue.vatPercent })}
          </span>
        </Card>
      </section>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run tests/unit/admin-stats-cards.test.tsx`
Expected: PASS — all revenue texts found.

- [ ] **Step 7: Type-check the web app**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors (the new `revenue` field is required on `AdminStats`; confirm no other consumer of `AdminStats` constructs the object literally without it — `useAdminStats` only reads server data, so this is type-safe).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/admin/admin-stats-cards.tsx apps/web/src/messages/vi.json apps/web/src/messages/en.json apps/web/tests/unit/admin-stats-cards.test.tsx
git commit -m "feat(web): show revenue & VAT cards on admin stats page"
```

---

## Verification (after all tasks)

- [ ] `cd apps/gateway && npx vitest run test/unit/admin.service.spec.ts` — green.
- [ ] `cd apps/web && npx vitest run tests/unit/format-vnd.test.ts tests/unit/admin-stats-cards.test.tsx` — green.
- [ ] `cd apps/web && npx tsc --noEmit` — clean.
- [ ] Manual (optional): gateway runs locally on :3000 (`node dist/main`), web on :3001 (`next start`). Rebuild web (`cd apps/web && npm run build`) + restart, then open `localhost:3001/vi/admin/stats` as admin and confirm three revenue cards render with VND amounts for the selected period. Changing the period (7/30/90) should refetch and update the figures.

## Notes / out of scope (do not implement)

- No DB migration; no `tax`/`vat` column added to `PaymentIntent`.
- No revenue breakdown by plan, no daily chart, no "revenue today" card, no multi-currency, no separate `/admin/revenue` endpoint.
- The unrelated working-tree fix to root `package.json` (stray `k` removed so husky/turbo pre-commit runs) is independent of this feature — leave it for the user to commit with their other in-flight changes, or stage it separately.
