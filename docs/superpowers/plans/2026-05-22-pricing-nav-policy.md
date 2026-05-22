# Pricing Redesign + Marketing Nav + Policy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/pricing` reachable from navigation, redesign it (cards + comparison table + FAQ), add a `/policy` page, wrap public pages in a shared marketing header/footer, and point the upgrade modal at `/pricing`.

**Architecture:** New `[locale]/(marketing)/` route group with a layout that renders `PublicHeader` + `PublicFooter`; `/pricing` moves into it (URL unchanged) and `/policy` is added. New presentational/billing components are unit-tested with RTL behind a new `renderWithIntl` helper. No backend changes — reuses `usePlans()` / `useSubscription()`.

**Tech Stack:** Next.js 14 App Router, next-intl, TanStack Query, Tailwind + shadcn-style UI, Vitest + Testing Library, Zustand.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/constants.ts` (modify) | Add `ROUTES.pricing`, `ROUTES.policy` |
| `src/lib/billing/plan-features.ts` (create) | Shared feature-row definitions + value formatters (DRY between PlanCard & comparison table) |
| `src/lib/content/policy.ts` (create) | VI demo policy sections (id + titleKey + paragraphs) |
| `src/lib/content/pricing-faq.ts` (create) | VI demo FAQ items |
| `src/messages/{vi,en}.json` (modify) | `nav.pricing`, `nav.policy`, `pricing.*`, `policy.*` keys |
| `src/components/billing/PlanCard.tsx` (modify) | Ticks, "Phổ biến" ribbon, tagline |
| `src/components/billing/PlanComparisonTable.tsx` (create) | Feature comparison table |
| `src/components/billing/PricingFaq.tsx` (create) | `<details>`-based FAQ + link to /policy |
| `src/components/billing/QuotaExceededDialog.tsx` (modify) | "Nâng cấp" → `/pricing` |
| `src/components/layout/public-header.tsx` (create) | Marketing header, auth-aware CTA |
| `src/components/layout/public-footer.tsx` (create) | Footer with policy anchor links |
| `src/components/layout/sidebar/index.tsx` (modify) | Add "Bảng giá" nav item |
| `src/app/[locale]/(marketing)/layout.tsx` (create) | Header + children + footer wrapper |
| `src/app/[locale]/(marketing)/pricing/page.tsx` (moved + redesign) | Hero + cards + table + FAQ |
| `src/app/[locale]/(marketing)/policy/page.tsx` (create) | 3 anchored sections |
| `tests/helpers/render.tsx` (modify) | Add `renderWithIntl` |
| `tests/unit/plan-comparison-table.test.tsx` (create) | Table behavior |
| `tests/unit/pricing-faq.test.tsx` (create) | FAQ toggle |
| `tests/unit/public-header.test.tsx` (create) | Auth-aware CTA |
| `tests/unit/quota-dialog-link.test.tsx` (create) | Upgrade link target |

---

## Task 1: Routes + i18n keys + content modules

**Files:**
- Modify: `src/lib/constants.ts`
- Create: `src/lib/content/policy.ts`, `src/lib/content/pricing-faq.ts`
- Modify: `src/messages/vi.json`, `src/messages/en.json`

- [ ] **Step 1: Add routes**

In `src/lib/constants.ts`, inside the `ROUTES` object, after the `home: "/",` line add:

```ts
  // Marketing (public)
  pricing: "/pricing",
  policy: "/policy",
```

- [ ] **Step 2: Create policy content module**

Create `src/lib/content/policy.ts`:

```ts
/**
 * Demo policy content (Vietnamese). Single source — rendered identically in
 * both locales for now. TODO: translate to EN. `titleKey` maps to the i18n
 * key `policy.<titleKey>`; `id` is the in-page anchor used by footer links.
 */
export interface PolicySection {
  id: string;
  titleKey: "terms" | "privacy" | "payment";
  paragraphs: string[];
}

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: "dieu-khoan",
    titleKey: "terms",
    paragraphs: [
      "Khi sử dụng SEO Analyst, bạn đồng ý dùng dịch vụ đúng mục đích phân tích SEO hợp pháp cho website mình sở hữu hoặc được uỷ quyền.",
      "Bạn không được lạm dụng hệ thống để tấn công, dò quét trái phép, hoặc gây quá tải lên website của bên thứ ba.",
      "Chúng tôi có quyền tạm khoá tài khoản vi phạm mà không hoàn phí cho phần thời gian còn lại.",
    ],
  },
  {
    id: "bao-mat",
    titleKey: "privacy",
    paragraphs: [
      "Chúng tôi chỉ thu thập thông tin cần thiết để vận hành dịch vụ: email, thông tin gói cước, và dữ liệu audit bạn tạo ra.",
      "Mật khẩu được băm an toàn; chúng tôi không bao giờ lưu mật khẩu dạng văn bản thuần.",
      "Dữ liệu audit của bạn không được chia sẻ cho bên thứ ba ngoài mục đích cung cấp dịch vụ.",
    ],
  },
  {
    id: "thanh-toan",
    titleKey: "payment",
    paragraphs: [
      "Thanh toán qua chuyển khoản VietQR. Gói được kích hoạt ngay sau khi giao dịch được đối soát thành công.",
      "Phí đã thanh toán không hoàn lại cho phần thời gian đã sử dụng. Trường hợp lỗi hệ thống khiến bạn không dùng được gói, vui lòng liên hệ hỗ trợ để được xử lý.",
      "Gói tự động hết hạn vào cuối chu kỳ; bạn cần thanh toán lại để gia hạn. Không có tự động trừ tiền định kỳ.",
    ],
  },
];
```

- [ ] **Step 3: Create FAQ content module**

Create `src/lib/content/pricing-faq.ts`:

```ts
/** Demo pricing FAQ (Vietnamese). TODO: translate to EN. */
export interface FaqItem {
  q: string;
  a: string;
}

export const PRICING_FAQ: FaqItem[] = [
  {
    q: "Tôi có thể đổi gói bất cứ lúc nào không?",
    a: "Có. Bạn có thể nâng cấp bất cứ lúc nào; gói mới kích hoạt ngay sau khi thanh toán được đối soát.",
  },
  {
    q: "Thanh toán bằng cách nào?",
    a: "Chuyển khoản qua mã VietQR hiển thị ở bước thanh toán. Hệ thống tự đối soát và kích hoạt gói.",
  },
  {
    q: "Hết hạn gói thì dữ liệu audit của tôi có mất không?",
    a: "Dữ liệu được giữ theo thời gian lưu lịch sử của gói tại thời điểm tạo. Gói Free giữ 7 ngày, Pro 90 ngày, Business vĩnh viễn.",
  },
  {
    q: "Có hoàn tiền không?",
    a: "Phí đã dùng không hoàn lại. Xem chi tiết ở mục Chính sách thanh toán & hoàn tiền.",
  },
];
```

- [ ] **Step 4: Add i18n keys (vi)**

In `src/messages/vi.json`: add `"pricing"` and `"policy"` keys to `nav`, and add two new top-level sections. Inside `"nav"` object add:

```json
    "pricing": "Bảng giá",
    "policy": "Chính sách"
```

Add new top-level sections (siblings of `nav`):

```json
  "pricing": {
    "heroTitle": "Chọn gói phù hợp với bạn",
    "heroSubtitle": "Bắt đầu miễn phí, nâng cấp khi cần thêm audit, AI và API.",
    "perMonth": "/ tháng",
    "free": "Miễn phí",
    "current": "Đang dùng",
    "popular": "Phổ biến",
    "upgrade": "Nâng cấp",
    "processing": "Đang xử lý...",
    "compareTitle": "So sánh chi tiết",
    "faqTitle": "Câu hỏi thường gặp",
    "faqMore": "Xem chính sách đầy đủ →",
    "features": {
      "auditsMonthly": "Audits / tháng",
      "siteMode": "Site-mode (trang)",
      "scheduled": "Lịch định kỳ",
      "aiCalls": "AI gợi ý / tháng",
      "apiCalls": "API / ngày",
      "apiKeys": "API keys",
      "history": "Lưu lịch sử"
    }
  },
  "policy": {
    "title": "Chính sách",
    "subtitle": "Điều khoản sử dụng, bảo mật và thanh toán của SEO Analyst.",
    "terms": "Điều khoản sử dụng",
    "privacy": "Chính sách bảo mật",
    "payment": "Chính sách thanh toán & hoàn tiền"
  }
```

- [ ] **Step 5: Add i18n keys (en)**

In `src/messages/en.json`: add to `"nav"`:

```json
    "pricing": "Pricing",
    "policy": "Policy"
```

Add new top-level sections:

```json
  "pricing": {
    "heroTitle": "Choose the plan that fits you",
    "heroSubtitle": "Start free, upgrade when you need more audits, AI and API.",
    "perMonth": "/ month",
    "free": "Free",
    "current": "Current",
    "popular": "Popular",
    "upgrade": "Upgrade",
    "processing": "Processing...",
    "compareTitle": "Detailed comparison",
    "faqTitle": "Frequently asked questions",
    "faqMore": "See full policy →",
    "features": {
      "auditsMonthly": "Audits / month",
      "siteMode": "Site-mode (pages)",
      "scheduled": "Scheduled",
      "aiCalls": "AI suggestions / month",
      "apiCalls": "API / day",
      "apiKeys": "API keys",
      "history": "History retention"
    }
  },
  "policy": {
    "title": "Policy",
    "subtitle": "Terms of use, privacy and payment policy for SEO Analyst.",
    "terms": "Terms of use",
    "privacy": "Privacy policy",
    "payment": "Payment & refund policy"
  }
```

- [ ] **Step 6: Verify JSON + typecheck**

Run: `node -e "require('./src/messages/vi.json');require('./src/messages/en.json');console.log('json ok')"`
Expected: `json ok`
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/constants.ts src/lib/content/ src/messages/vi.json src/messages/en.json
git commit -m "feat(web): routes, i18n keys and content modules for pricing/policy"
```

---

## Task 2: `renderWithIntl` test helper

**Files:**
- Modify: `tests/helpers/render.tsx`
- Test: `tests/unit/render-intl.test.tsx` (create, throwaway smoke)

- [ ] **Step 1: Write the failing smoke test**

Create `tests/unit/render-intl.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { renderWithIntl } from "../helpers/render";

function Probe() {
  const t = useTranslations("nav");
  return <span>{t("pricing")}</span>;
}

describe("renderWithIntl", () => {
  it("provides NextIntlClientProvider so useTranslations resolves", () => {
    renderWithIntl(<Probe />);
    expect(screen.getByText("Bảng giá")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- render-intl`
Expected: FAIL — `renderWithIntl` is not exported.

- [ ] **Step 3: Add the helper**

In `tests/helpers/render.tsx`, add the import at top:

```tsx
import { NextIntlClientProvider } from "next-intl";
import viMessages from "@/messages/vi.json";
```

Append at the end of the file:

```tsx
/**
 * Like `renderWithProviders` but also wraps in NextIntlClientProvider (vi
 * messages) so components calling `useTranslations` render in tests.
 */
export function renderWithIntl(
  ui: React.ReactElement,
  options: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient } = {},
) {
  const { queryClient, ...rest } = options;
  const client = queryClient ?? makeTestQueryClient();
  const result = render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <TestProviders queryClient={client}>{children}</TestProviders>
      </NextIntlClientProvider>
    ),
    ...rest,
  });
  return { ...result, queryClient: client };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- render-intl`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/render.tsx tests/unit/render-intl.test.tsx
git commit -m "test(web): add renderWithIntl helper for intl-dependent components"
```

---

## Task 3: Shared plan-features module

**Files:**
- Create: `src/lib/billing/plan-features.ts`
- Test: `tests/unit/plan-features.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/plan-features.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PLAN_FEATURE_ROWS, formatRetention } from "@/lib/billing/plan-features";
import type { PlanDefinition } from "@repo/shared";

const free: PlanDefinition = {
  audits_monthly: 10,
  site_audit_max_pages: 0,
  scheduled_audits_max: 0,
  scheduled_audit_min_interval_min: 0,
  api_keys_max: 0,
  api_calls_daily: 0,
  ai_calls_monthly: 0,
  history_retention_days: 7,
};

describe("plan-features", () => {
  it("formats unlimited retention as ∞", () => {
    expect(formatRetention(-1)).toBe("∞");
    expect(formatRetention(90)).toBe("90 ngày");
  });

  it("renders site-mode 0 as — and exposes all 7 rows", () => {
    expect(PLAN_FEATURE_ROWS).toHaveLength(7);
    const siteRow = PLAN_FEATURE_ROWS.find((r) => r.key === "siteMode")!;
    expect(siteRow.value(free)).toBe("—");
    const auditsRow = PLAN_FEATURE_ROWS.find((r) => r.key === "auditsMonthly")!;
    expect(auditsRow.value(free)).toBe("10");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- plan-features`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `src/lib/billing/plan-features.ts`:

```ts
import type { PlanDefinition } from "@repo/shared";

/** -1 = unlimited. Vietnamese unit kept inline (VN-primary, matches PlanCard). */
export function formatRetention(days: number): string {
  return days === -1 ? "∞" : `${days} ngày`;
}

export interface PlanFeatureRow {
  /** i18n key under `pricing.features.<key>` */
  key:
    | "auditsMonthly"
    | "siteMode"
    | "scheduled"
    | "aiCalls"
    | "apiCalls"
    | "apiKeys"
    | "history";
  /** Display value for a given plan's feature matrix. */
  value: (f: PlanDefinition) => string;
}

export const PLAN_FEATURE_ROWS: PlanFeatureRow[] = [
  { key: "auditsMonthly", value: (f) => `${f.audits_monthly}` },
  { key: "siteMode", value: (f) => (f.site_audit_max_pages > 0 ? `${f.site_audit_max_pages} trang` : "—") },
  { key: "scheduled", value: (f) => `${f.scheduled_audits_max}` },
  { key: "aiCalls", value: (f) => `${f.ai_calls_monthly}` },
  { key: "apiCalls", value: (f) => `${f.api_calls_daily}` },
  { key: "apiKeys", value: (f) => `${f.api_keys_max}` },
  { key: "history", value: (f) => formatRetention(f.history_retention_days) },
];
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- plan-features`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/plan-features.ts tests/unit/plan-features.test.ts
git commit -m "feat(web): shared plan-features rows + retention formatter"
```

---

## Task 4: PlanComparisonTable

**Files:**
- Create: `src/components/billing/PlanComparisonTable.tsx`
- Test: `tests/unit/plan-comparison-table.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/plan-comparison-table.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { PlanComparisonTable } from "@/components/billing/PlanComparisonTable";
import type { PlanResponse } from "@/lib/api/billing";

const mk = (code: "free" | "pro" | "business", over: Partial<PlanResponse["features"]> = {}): PlanResponse => ({
  code, displayName: code, priceVnd: 0, sortOrder: 0,
  features: {
    audits_monthly: 10, site_audit_max_pages: 0, scheduled_audits_max: 0,
    scheduled_audit_min_interval_min: 0, api_keys_max: 0, api_calls_daily: 0,
    ai_calls_monthly: 0, history_retention_days: 7, ...over,
  },
});

const plans = [mk("free"), mk("pro", { audits_monthly: 200 }), mk("business", { audits_monthly: 1000 })];

describe("PlanComparisonTable", () => {
  it("renders a column per plan and a row per feature", () => {
    renderWithIntl(<PlanComparisonTable plans={plans} currentPlanCode={null} />);
    expect(screen.getByRole("columnheader", { name: /free/i })).toBeInTheDocument();
    expect(screen.getByText("Audits / tháng")).toBeInTheDocument();
    // pro audits value present
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("marks the current plan column", () => {
    renderWithIntl(<PlanComparisonTable plans={plans} currentPlanCode="pro" />);
    const proHeader = screen.getByRole("columnheader", { name: /pro/i });
    expect(within(proHeader).getByText("Đang dùng")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- plan-comparison-table`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

Create `src/components/billing/PlanComparisonTable.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { PLAN_FEATURE_ROWS } from "@/lib/billing/plan-features";
import type { PlanResponse } from "@/lib/api/billing";
import type { PlanCode } from "@repo/shared";

interface Props {
  plans: PlanResponse[];
  currentPlanCode: PlanCode | null;
}

export function PlanComparisonTable({ plans, currentPlanCode }: Props) {
  const t = useTranslations("pricing");
  return (
    <section className="overflow-x-auto">
      <h2 className="mb-4 text-xl font-semibold">{t("compareTitle")}</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="p-3 text-left font-medium text-fg-muted">{t("faqTitle") /* placeholder header cell */ && ""}</th>
            {plans.map((p) => (
              <th
                key={p.code}
                scope="col"
                className={cn(
                  "p-3 text-center font-semibold",
                  p.code === "pro" && "text-primary",
                )}
              >
                <div>{p.displayName}</div>
                {currentPlanCode === p.code ? (
                  <div className="mt-1 text-xs font-normal text-info">{t("current")}</div>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_FEATURE_ROWS.map((row) => (
            <tr key={row.key} className="border-b border-border/60">
              <td className="p-3 text-left text-fg-muted">{t(`features.${row.key}`)}</td>
              {plans.map((p) => (
                <td
                  key={p.code}
                  className={cn("p-3 text-center", p.code === "pro" && "bg-primary/5 font-medium")}
                >
                  {row.value(p.features)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

> Note: the empty top-left header cell uses a blank string. Replace the placeholder expression with a plain empty cell: `<th className="p-3 text-left font-medium text-fg-muted"></th>`.

- [ ] **Step 4: Fix the header cell**

Edit the first `<th>` in the component to be exactly:

```tsx
            <th className="p-3 text-left font-medium text-fg-muted"></th>
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- plan-comparison-table`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/billing/PlanComparisonTable.tsx tests/unit/plan-comparison-table.test.tsx
git commit -m "feat(web): PlanComparisonTable with per-feature rows + current/pro highlight"
```

---

## Task 5: PricingFaq

**Files:**
- Create: `src/components/billing/PricingFaq.tsx`
- Test: `tests/unit/pricing-faq.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pricing-faq.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { PricingFaq } from "@/components/billing/PricingFaq";

describe("PricingFaq", () => {
  it("renders each FAQ question and a link to /policy", () => {
    renderWithIntl(<PricingFaq />);
    expect(screen.getByText("Thanh toán bằng cách nào?")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /chính sách/i });
    expect(link).toHaveAttribute("href", "/policy");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- pricing-faq`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

Create `src/components/billing/PricingFaq.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";
import { PRICING_FAQ } from "@/lib/content/pricing-faq";

export function PricingFaq() {
  const t = useTranslations("pricing");
  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-xl font-semibold">{t("faqTitle")}</h2>
      <div className="space-y-2">
        {PRICING_FAQ.map((item) => (
          <details key={item.q} className="rounded-md border border-border p-3">
            <summary className="cursor-pointer font-medium">{item.q}</summary>
            <p className="mt-2 text-sm text-fg-muted">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-4 text-sm">
        <Link href={ROUTES.policy} className="text-primary underline">
          {t("faqMore")}
        </Link>
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- pricing-faq`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/billing/PricingFaq.tsx tests/unit/pricing-faq.test.tsx
git commit -m "feat(web): PricingFaq accordion with link to /policy"
```

---

## Task 6: Enhance PlanCard (ticks, ribbon, tagline)

**Files:**
- Modify: `src/components/billing/PlanCard.tsx`

- [ ] **Step 1: Replace the component body**

Replace the entire contents of `src/components/billing/PlanCard.tsx` with:

```tsx
"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { PLAN_FEATURE_ROWS } from "@/lib/billing/plan-features";
import type { PlanResponse } from "@/lib/api/billing";
import type { PlanCode } from "@repo/shared";

interface Props {
  plan: PlanResponse;
  current?: boolean;
  highlighted?: boolean;
  onSelect?: (code: PlanCode) => void;
  busy?: boolean;
}

export function PlanCard({ plan, current, highlighted, onSelect, busy }: Props) {
  const t = useTranslations("pricing");
  const tf = useTranslations("pricing.features");
  const isPaid = plan.code !== "free";

  return (
    <Card className={cn("relative", highlighted && "border-primary shadow-lg")}>
      {highlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
          {t("popular")}
        </span>
      ) : null}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.displayName}</CardTitle>
          {current ? <Badge variant="info">{t("current")}</Badge> : null}
        </div>
        <div className="text-3xl font-bold">
          {plan.priceVnd === 0 ? t("free") : `${plan.priceVnd.toLocaleString("vi-VN")}đ`}
          {isPaid ? (
            <span className="text-base font-normal text-muted-foreground"> {t("perMonth")}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2 text-sm">
          {PLAN_FEATURE_ROWS.map((row) => (
            <li key={row.key} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>
                {tf(row.key)}: {row.value(plan.features)}
              </span>
            </li>
          ))}
        </ul>
        {!current && isPaid && onSelect ? (
          <Button className="w-full" disabled={busy} onClick={() => onSelect(plan.code)}>
            {busy ? t("processing") : t("upgrade")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `primary-foreground` token is unknown, that's a Tailwind class — not a TS error.)

- [ ] **Step 3: Commit**

```bash
git add src/components/billing/PlanCard.tsx
git commit -m "feat(web): richer PlanCard with feature ticks, popular ribbon, i18n"
```

---

## Task 7: PublicHeader (auth-aware)

**Files:**
- Create: `src/components/layout/public-header.tsx`
- Test: `tests/unit/public-header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/public-header.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { useAuthStore } from "@/lib/auth/store";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  usePathname: () => "/pricing",
}));

import { PublicHeader } from "@/components/layout/public-header";

afterEach(() => useAuthStore.getState().clearAuth());

describe("PublicHeader", () => {
  it("shows login CTA for guests", () => {
    renderWithIntl(<PublicHeader />);
    expect(screen.getByRole("link", { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it("shows 'enter app' CTA when authenticated", () => {
    useAuthStore.setState({ accessToken: "tok" });
    renderWithIntl(<PublicHeader />);
    const cta = screen.getByRole("link", { name: /vào ứng dụng/i });
    expect(cta).toHaveAttribute("href", "/dashboard");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- public-header`
Expected: FAIL — component not found.

- [ ] **Step 3: Add nav i18n keys used by the header**

The `common` section currently has NO `login`/`register`/`enterApp` keys (verified). Add all three. To `src/messages/vi.json` `"common"` object:

```json
    "login": "Đăng nhập",
    "register": "Đăng ký",
    "enterApp": "Vào ứng dụng"
```

And to `src/messages/en.json` `"common"`:

```json
    "login": "Log in",
    "register": "Register",
    "enterApp": "Enter app"
```

- [ ] **Step 4: Implement the component**

Create `src/components/layout/public-header.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES, APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function PublicHeader() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const authed = useAuthStore((s) => s.accessToken !== null);

  return (
    <header className="border-b border-border bg-bg-elevated">
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <Link href={ROUTES.home} className="font-semibold">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={ROUTES.pricing} className="text-fg-muted hover:text-fg">
            {tNav("pricing")}
          </Link>
          <Link href={ROUTES.policy} className="text-fg-muted hover:text-fg">
            {tNav("policy")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher iconOnly />
          <ThemeToggle iconOnly />
          {authed ? (
            <Button asChild size="sm">
              <Link href={ROUTES.dashboard}>{tCommon("enterApp")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.login}>{tCommon("login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.register}>{tCommon("register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
```

> `Button` supports `asChild` (Radix `Slot`) — verified. `buttonVariants` is also exported from `src/components/ui/button.tsx` if a plain styled `<Link>` is preferred anywhere.

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- public-header`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/public-header.tsx tests/unit/public-header.test.tsx src/messages/vi.json src/messages/en.json
git commit -m "feat(web): PublicHeader with auth-aware CTA"
```

---

## Task 8: PublicFooter

**Files:**
- Create: `src/components/layout/public-footer.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/layout/public-footer.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES, APP_NAME } from "@/lib/constants";
import { POLICY_SECTIONS } from "@/lib/content/policy";
import { LocaleSwitcher } from "./locale-switcher";

export function PublicFooter() {
  const tPolicy = useTranslations("policy");
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border bg-bg-elevated">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4">
          {POLICY_SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`${ROUTES.policy}#${s.id}`}
              className="text-fg-muted hover:text-fg"
            >
              {tPolicy(s.titleKey)}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 text-fg-subtle">
          <LocaleSwitcher iconOnly />
          <span>© {year} {APP_NAME}</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/public-footer.tsx
git commit -m "feat(web): PublicFooter with policy anchor links"
```

---

## Task 9: Marketing layout + move & redesign pricing page

**Files:**
- Create: `src/app/[locale]/(marketing)/layout.tsx`
- Move: `src/app/[locale]/pricing/page.tsx` → `src/app/[locale]/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Create the marketing layout**

Create `src/app/[locale]/(marketing)/layout.tsx`:

```tsx
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

/**
 * Public marketing shell (pricing, policy). PUBLIC — no AuthGuard. html/body +
 * intl provider live in the parent [locale]/layout.tsx; this only adds the
 * shared header/footer chrome. Route group → no URL segment.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
```

- [ ] **Step 2: Move the pricing route**

Run:

```bash
mkdir -p "src/app/[locale]/(marketing)/pricing"
git mv "src/app/[locale]/pricing/page.tsx" "src/app/[locale]/(marketing)/pricing/page.tsx"
rmdir "src/app/[locale]/pricing" 2>/dev/null || true
```

- [ ] **Step 3: Replace the pricing page with the redesign**

Replace the entire contents of `src/app/[locale]/(marketing)/pricing/page.tsx` with:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCreatePaymentIntent, usePlans, useSubscription } from "@/lib/queries/use-billing";
import { useAuthStore } from "@/lib/auth/store";
import { ROUTES } from "@/lib/constants";
import { PlanCard } from "@/components/billing/PlanCard";
import { PlanComparisonTable } from "@/components/billing/PlanComparisonTable";
import { PricingFaq } from "@/components/billing/PricingFaq";
import type { PlanCode } from "@repo/shared";

export default function PricingPage() {
  const t = useTranslations("pricing");
  const plansQ = usePlans();
  const subQ = useSubscription();
  const create = useCreatePaymentIntent();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const onSelect = (code: PlanCode) => {
    if (accessToken === null) {
      router.push(`${ROUTES.login}?next=${ROUTES.pricing}`);
      return;
    }
    if (code === "free") return;
    create.mutate(code as Exclude<PlanCode, "free">);
  };

  if (plansQ.isLoading) return <div className="container mx-auto py-12">Đang tải...</div>;
  if (plansQ.isError)
    return <div className="container mx-auto py-12 text-red-600">Lỗi tải danh sách gói.</div>;

  const plans = plansQ.data ?? [];
  const currentPlanCode = subQ.data?.planCode ?? null;

  return (
    <main className="container mx-auto space-y-16 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-bold">{t("heroTitle")}</h1>
        <p className="text-muted-foreground">{t("heroSubtitle")}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <PlanCard
            key={p.code}
            plan={p}
            current={currentPlanCode === p.code}
            highlighted={p.code === "pro"}
            onSelect={onSelect}
            busy={create.isPending}
          />
        ))}
      </div>

      <PlanComparisonTable plans={plans} currentPlanCode={currentPlanCode} />

      <PricingFaq />
    </main>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(marketing)"
git commit -m "feat(web): marketing layout + redesigned pricing page (cards+table+faq)"
```

---

## Task 10: Policy page

**Files:**
- Create: `src/app/[locale]/(marketing)/policy/page.tsx`

- [ ] **Step 1: Implement the policy page**

Create `src/app/[locale]/(marketing)/policy/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { POLICY_SECTIONS } from "@/lib/content/policy";

export default async function PolicyPage() {
  const t = await getTranslations("policy");
  return (
    <main className="container mx-auto max-w-3xl space-y-10 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      {POLICY_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold">{t(section.titleKey)}</h2>
          {section.paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-fg-muted">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(marketing)/policy"
git commit -m "feat(web): /policy page with anchored sections"
```

---

## Task 11: Sidebar "Bảng giá" item

**Files:**
- Modify: `src/components/layout/sidebar/index.tsx`

- [ ] **Step 1: Add the icon import**

In `src/components/layout/sidebar/index.tsx`, add `Sparkles` to the existing `lucide-react` import list (alphabetical order is fine):

```tsx
import {
  BarChart3,
  Clock,
  GitCompare,
  LayoutDashboard,
  List,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
```

- [ ] **Step 2: Add the nav item**

In the same file, immediately after the `/audits/compare` `NavItem` block (the "compare" item) and before the Settings `NavItem`, insert:

```tsx
        <NavItem
          href={ROUTES.pricing}
          icon={Sparkles}
          label={tNav("pricing")}
          collapsed={collapsed}
        />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (`tNav("pricing")` resolves; key added in Task 1).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar/index.tsx
git commit -m "feat(web): add Bảng giá to sidebar nav"
```

---

## Task 12: Point upgrade modal at /pricing

**Files:**
- Modify: `src/components/billing/QuotaExceededDialog.tsx`
- Test: `tests/unit/quota-dialog-link.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/quota-dialog-link.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { useQuotaDialog } from "@/lib/billing/quota-dialog.store";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

import { QuotaExceededDialog } from "@/components/billing/QuotaExceededDialog";

afterEach(() => useQuotaDialog.getState().close());

describe("QuotaExceededDialog", () => {
  it("upgrade button links to /pricing", () => {
    useQuotaDialog.getState().show({ message: "hết quota" });
    renderWithIntl(<QuotaExceededDialog />);
    const link = screen.getByRole("link", { name: /nâng cấp/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- quota-dialog-link`
Expected: FAIL — link href is `/billing/upgrade`.

- [ ] **Step 3: Update the link**

In `src/components/billing/QuotaExceededDialog.tsx`, add the import:

```tsx
import { ROUTES } from "@/lib/constants";
```

Change:

```tsx
          <Link href="/billing/upgrade" onClick={close}>
```

to:

```tsx
          <Link href={ROUTES.pricing} onClick={close}>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- quota-dialog-link`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/billing/QuotaExceededDialog.tsx tests/unit/quota-dialog-link.test.tsx
git commit -m "feat(web): upgrade modal routes to /pricing"
```

---

## Task 13: Full verification

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: all green (existing + new specs).

- [ ] **Step 2: Lint + typecheck via turbo**

Run (from repo root): `npx turbo check-types lint --filter=@seo/web`
Expected: 0 errors (pre-existing prop-types warnings in ui/* are acceptable).

- [ ] **Step 3: Build + confirm routes**

Run (from repo root): `npx turbo build --filter=@seo/web`
Expected: build succeeds; route list includes `/[locale]/pricing` and `/[locale]/policy`; no `/[locale]/(marketing)` URL segment leaked (route group).

- [ ] **Step 4: Runtime smoke (dev server must be running on :3001)**

Run:

```bash
node -e '
const b="http://localhost:3001";
(async()=>{for(const p of ["/pricing","/policy","/vi/policy"]){const r=await fetch(b+p);const t=await r.text();console.log(p,"HTTP",r.status,"intlErr",(t.match(/NextIntlClientProvider/g)||[]).length);}})();
'
```

Expected: each `HTTP 200`, `intlErr 0`. (If dev server restarts are needed, `npm --workspace @seo/web run dev`.)

- [ ] **Step 5: Manual visual check**

Log in as `billing-test@local.test` / `Password1!`, confirm:
- Sidebar shows "Bảng giá" → opens `/pricing` (marketing layout, header + footer, no sidebar).
- `/pricing` shows hero + 3 cards (Pro has "Phổ biến" ribbon) + comparison table + FAQ.
- Footer "Điều khoản/Bảo mật/Thanh toán" links jump to `/policy#...` sections.
- Trigger upgrade modal (create API key) → "Nâng cấp" button now goes to `/pricing`.

---

## Self-Review Notes (author)

- **Spec coverage:** route group ✓ (T9), pricing hybrid ✓ (T4/5/6/9), public header ✓ (T7), footer ✓ (T8), sidebar item ✓ (T11), policy page ✓ (T10), modal→/pricing ✓ (T12), i18n+content ✓ (T1), no new API ✓.
- **Pre-checks resolved:** `Button` supports `asChild` (Radix Slot) ✓; `common` lacks `login`/`register`/`enterApp` → all three added in Task 7 Step 3 ✓.
- **Harness:** `renderWithIntl` (T2) unblocks all intl component tests; `@/i18n/navigation` is mocked per-test where `Link`/`useRouter` are used.
