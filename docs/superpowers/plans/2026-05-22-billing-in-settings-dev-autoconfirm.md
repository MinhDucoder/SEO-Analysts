# Billing in Settings + Dev Auto-Confirm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the billing overview into a Settings tab (Profile · Password · API keys · Plan & Billing), and add a dev-only cron that auto-confirms pending payment intents (~1 min) so demos complete without firing the webhook manually.

**Architecture:** Web — add two routes to `SettingsShell` tabs, relocate `/billing` → `/settings/billing` (wrapped in the shell, restyled to design tokens), point upgrade at `/pricing`, fix checkout redirect. Gateway — a `DevAutoConfirmCron` (`@Cron` every minute) double-guarded by `BILLING_DEV_AUTOCONFIRM=true` AND `NODE_ENV !== 'production'`, reusing `CassoReconcilerService.handleWebhook` so it travels the exact real path.

**Tech Stack:** Next.js 14 App Router, next-intl, TanStack Query, Tailwind/shadcn UI, NestJS, @nestjs/schedule, Vitest.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/gateway/src/billing/services/payment-intent.service.ts` (modify) | Add `findActivePending()` |
| `apps/gateway/src/billing/services/dev-autoconfirm.cron.ts` (create) | Dev-only auto-confirm cron |
| `apps/gateway/src/billing/services/dev-autoconfirm.cron.spec.ts` (create) | Cron gating + reconcile tests |
| `apps/gateway/src/billing/billing.module.ts` (modify) | Register cron provider |
| `apps/gateway/.env` (modify) | `BILLING_DEV_AUTOCONFIRM=true` (local) |
| `.env.docker.example` (modify) | Document flag default `false` |
| `apps/web/src/lib/constants.ts` (modify) | `ROUTES.settingsApiKeys`, `ROUTES.settingsBilling` |
| `apps/web/src/messages/{vi,en}.json` (modify) | `settings.tabs.apiKeys/billing`, `settings.billing.*` |
| `apps/web/src/components/settings/settings-shell.tsx` (modify) | 4 tabs |
| `apps/web/tests/unit/settings-shell.test.tsx` (create) | 4-tab render test |
| `apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx` (modify) | Wrap in SettingsShell |
| `apps/web/src/app/[locale]/(app)/settings/billing/page.tsx` (create, moved) | Billing in shell + polish |
| `apps/web/src/app/[locale]/(app)/billing/page.tsx` (delete) | Removed (moved) |
| `apps/web/src/app/[locale]/(app)/billing/checkout/[intentId]/page.tsx` (modify) | Redirect + upgrade links |

---

## Task 1: Gateway — `findActivePending()` + env flag

**Files:**
- Modify: `apps/gateway/src/billing/services/payment-intent.service.ts`
- Modify: `apps/gateway/.env`, `.env.docker.example`

- [ ] **Step 1: Add the method**

In `apps/gateway/src/billing/services/payment-intent.service.ts`, add this method inside the `PaymentIntentService` class (e.g. after `findByRefCode`):

```ts
  /** All pending intents still within their TTL — used by the dev auto-confirm cron. */
  async findActivePending(): Promise<{ refCode: string; amountVnd: number }[]> {
    return this.prisma.paymentIntent.findMany({
      where: { status: 'pending', expiresAt: { gt: new Date() } },
      select: { refCode: true, amountVnd: true },
    });
  }
```

- [ ] **Step 2: Add the local env flag**

Append to `apps/gateway/.env`:

```
# Dev/demo only: auto-confirm pending payment intents every minute (no real bank).
BILLING_DEV_AUTOCONFIRM=true
```

And append to `.env.docker.example` (if the file exists; otherwise skip this line and note it):

```
# Dev/demo only — auto-confirm pending intents. MUST stay false in production.
BILLING_DEV_AUTOCONFIRM=false
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/gateway && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/billing/services/payment-intent.service.ts apps/gateway/.env .env.docker.example
git commit -m "feat(gateway/billing): findActivePending + dev autoconfirm env flag"
```

---

## Task 2: Gateway — `DevAutoConfirmCron` (TDD)

**Files:**
- Create: `apps/gateway/src/billing/services/dev-autoconfirm.cron.ts`
- Create: `apps/gateway/src/billing/services/dev-autoconfirm.cron.spec.ts`
- Modify: `apps/gateway/src/billing/billing.module.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/gateway/src/billing/services/dev-autoconfirm.cron.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { DevAutoConfirmCron } from './dev-autoconfirm.cron';

function make(flag: string, nodeEnv: string, pending: { refCode: string; amountVnd: number }[]) {
  const config = {
    get: vi.fn((k: string) =>
      k === 'BILLING_DEV_AUTOCONFIRM' ? flag : k === 'NODE_ENV' ? nodeEnv : undefined,
    ),
  };
  const intents = { findActivePending: vi.fn().mockResolvedValue(pending) };
  const reconciler = { handleWebhook: vi.fn().mockResolvedValue(undefined) };
  const cron = new DevAutoConfirmCron(config as never, intents as never, reconciler as never);
  return { cron, intents, reconciler };
}

describe('DevAutoConfirmCron', () => {
  it('is a no-op when the flag is off', async () => {
    const { cron, intents, reconciler } = make('false', 'development', [
      { refCode: 'SEOAAAAA', amountVnd: 99000 },
    ]);
    await cron.handle();
    expect(intents.findActivePending).not.toHaveBeenCalled();
    expect(reconciler.handleWebhook).not.toHaveBeenCalled();
  });

  it('is a no-op in production even if the flag is on', async () => {
    const { cron, reconciler } = make('true', 'production', [
      { refCode: 'SEOAAAAA', amountVnd: 99000 },
    ]);
    await cron.handle();
    expect(reconciler.handleWebhook).not.toHaveBeenCalled();
  });

  it('confirms each pending intent when enabled outside production', async () => {
    const { cron, reconciler } = make('true', 'development', [
      { refCode: 'SEOAAAAA', amountVnd: 99000 },
      { refCode: 'SEOBBBBB', amountVnd: 299000 },
    ]);
    await cron.handle();
    expect(reconciler.handleWebhook).toHaveBeenCalledTimes(2);
    expect(reconciler.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'SEOAAAAA', amount: 99000 }),
    );
    expect(reconciler.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'SEOBBBBB', amount: 299000 }),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/gateway && npx vitest run dev-autoconfirm`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the cron**

Create `apps/gateway/src/billing/services/dev-autoconfirm.cron.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentIntentService } from './payment-intent.service';
import { CassoReconcilerService } from './casso-reconciler.service';

/**
 * DEV/DEMO ONLY. Every minute, auto-confirms pending payment intents by
 * synthesizing a Casso webhook for each — so local demos complete without a
 * real bank transfer. Double-guarded: requires BILLING_DEV_AUTOCONFIRM=true
 * AND NODE_ENV !== 'production'. Reuses the real reconciler path (markPaid +
 * upgrade + redis publish) so behavior is identical to a genuine webhook.
 */
@Injectable()
export class DevAutoConfirmCron {
  private readonly logger = new Logger(DevAutoConfirmCron.name);

  constructor(
    private readonly config: ConfigService,
    private readonly intents: PaymentIntentService,
    private readonly reconciler: CassoReconcilerService,
  ) {
    if (this.isEnabled()) {
      this.logger.warn(
        '⚠️ BILLING_DEV_AUTOCONFIRM is ON — pending transfers auto-confirm WITHOUT real payment. Never enable in production.',
      );
    }
  }

  private isEnabled(): boolean {
    return (
      this.config.get<string>('BILLING_DEV_AUTOCONFIRM') === 'true' &&
      this.config.get<string>('NODE_ENV') !== 'production'
    );
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'dev-autoconfirm' })
  async handle(): Promise<void> {
    if (!this.isEnabled()) return;

    const pending = await this.intents.findActivePending();
    if (pending.length === 0) return;

    for (const p of pending) {
      await this.reconciler.handleWebhook({
        tid: `DEVAUTO-${p.refCode}-${Date.now()}`,
        amount: p.amountVnd,
        description: p.refCode,
        when: new Date().toISOString(),
      });
    }
    this.logger.warn(`[DEV] auto-confirmed ${pending.length} pending intent(s)`);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/gateway && npx vitest run dev-autoconfirm`
Expected: PASS (3 tests).

- [ ] **Step 5: Register the provider**

In `apps/gateway/src/billing/billing.module.ts`, add the import near the other service imports:

```ts
import { DevAutoConfirmCron } from './services/dev-autoconfirm.cron';
```

And add `DevAutoConfirmCron` to the `providers` array (after `ExpiryCron`):

```ts
  providers: [PlansService, SubscriptionService, EntitlementService, PaymentIntentService, CassoReconcilerService, QuotaCounterService, ExpiryCron, DevAutoConfirmCron, PlanGuard, QuotaGuard],
```

- [ ] **Step 6: Typecheck**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/gateway && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/gateway/src/billing/services/dev-autoconfirm.cron.ts apps/gateway/src/billing/services/dev-autoconfirm.cron.spec.ts apps/gateway/src/billing/billing.module.ts
git commit -m "feat(gateway/billing): dev-only auto-confirm cron (double-guarded)"
```

---

## Task 3: Web — routes + i18n keys

**Files:**
- Modify: `apps/web/src/lib/constants.ts`, `apps/web/src/messages/vi.json`, `apps/web/src/messages/en.json`

- [ ] **Step 1: Add routes**

In `apps/web/src/lib/constants.ts`, in the `ROUTES` object replace the Settings block:

```ts
  // Settings (slug 8)
  settingsProfile: "/settings/profile",
  settingsPassword: "/settings/password",
```

with:

```ts
  // Settings (slug 8)
  settingsProfile: "/settings/profile",
  settingsPassword: "/settings/password",
  settingsApiKeys: "/settings/api-keys",
  settingsBilling: "/settings/billing",
```

- [ ] **Step 2: Add i18n (vi)**

In `apps/web/src/messages/vi.json`, in `settings.tabs` add two keys:

```json
      "apiKeys": "API keys",
      "billing": "Gói & Thanh toán"
```

And add a `billing` object inside `settings` (sibling of `tabs`/`profile`/`password`):

```json
    "billing": {
      "currentTitle": "Gói hiện tại",
      "planLabel": "Gói",
      "statusLabel": "Trạng thái",
      "expiresLabel": "Hết hạn",
      "upgrade": "Nâng cấp / Gia hạn",
      "adminGranted": "Được cấp bởi admin (không qua thanh toán)",
      "paidBanner": "Thanh toán thành công! 🎉",
      "historyTitle": "Lịch sử thanh toán",
      "historyEmpty": "Chưa có giao dịch.",
      "colTime": "Thời gian",
      "colPlan": "Gói",
      "colAmount": "Số tiền",
      "colStatus": "Trạng thái"
    }
```

- [ ] **Step 3: Add i18n (en)**

In `apps/web/src/messages/en.json`, in `settings.tabs` add:

```json
      "apiKeys": "API keys",
      "billing": "Plan & Billing"
```

And add inside `settings`:

```json
    "billing": {
      "currentTitle": "Current plan",
      "planLabel": "Plan",
      "statusLabel": "Status",
      "expiresLabel": "Expires",
      "upgrade": "Upgrade / Renew",
      "adminGranted": "Granted by admin (no payment)",
      "paidBanner": "Payment successful! 🎉",
      "historyTitle": "Payment history",
      "historyEmpty": "No transactions yet.",
      "colTime": "Time",
      "colPlan": "Plan",
      "colAmount": "Amount",
      "colStatus": "Status"
    }
```

- [ ] **Step 4: Verify + commit**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/web && node -e "require('./src/messages/vi.json');require('./src/messages/en.json');console.log('json ok')" && npx tsc --noEmit`
Expected: `json ok` then no tsc errors.

```bash
git add apps/web/src/lib/constants.ts apps/web/src/messages/vi.json apps/web/src/messages/en.json
git commit -m "feat(web): settings routes + i18n for api-keys & billing tabs"
```

---

## Task 4: Web — SettingsShell 4 tabs (TDD)

**Files:**
- Modify: `apps/web/src/components/settings/settings-shell.tsx`
- Create: `apps/web/tests/unit/settings-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/settings-shell.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { SettingsShell } from "@/components/settings/settings-shell";

describe("SettingsShell", () => {
  it("renders all four settings tabs", () => {
    renderWithIntl(
      <SettingsShell active="billing">
        <div>content</div>
      </SettingsShell>,
    );
    for (const label of ["Hồ sơ", "Mật khẩu", "API keys", "Gói & Thanh toán"]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active tab", () => {
    renderWithIntl(
      <SettingsShell active="billing">
        <div>content</div>
      </SettingsShell>,
    );
    expect(screen.getByRole("tab", { name: "Gói & Thanh toán" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/web && npm test -- settings-shell`
Expected: FAIL — only profile/password tabs exist; "API keys"/"Gói & Thanh toán" not found.

- [ ] **Step 3: Update SettingsShell**

In `apps/web/src/components/settings/settings-shell.tsx`:

Change the type:

```ts
type SettingsTab = "profile" | "password" | "api-keys" | "billing";
```

Change the `tabs` array:

```ts
  const tabs: { key: SettingsTab; href: string }[] = [
    { key: "profile", href: ROUTES.settingsProfile },
    { key: "password", href: ROUTES.settingsPassword },
    { key: "api-keys", href: ROUTES.settingsApiKeys },
    { key: "billing", href: ROUTES.settingsBilling },
  ];
```

Change the tab label lookup so `api-keys` maps to the `apiKeys` i18n key (others map 1:1):

```tsx
            >
              {t(`tabs.${key === "api-keys" ? "apiKeys" : key}`)}
            </Link>
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/web && npm test -- settings-shell`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/settings/settings-shell.tsx apps/web/tests/unit/settings-shell.test.tsx
git commit -m "feat(web): SettingsShell with API keys + Billing tabs"
```

---

## Task 5: Web — wrap API keys page in SettingsShell

**Files:**
- Modify: `apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx`

- [ ] **Step 1: Wrap the content**

In `apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx`:

Add the import near the top (with the other `@/components` imports):

```tsx
import { SettingsShell } from "@/components/settings/settings-shell";
```

Change the outermost element from `<main className="space-y-6">` … `</main>` to a `SettingsShell` wrapper. Replace the opening `return (` `<main className="space-y-6">` with:

```tsx
  return (
    <SettingsShell active="api-keys">
      <div className="space-y-6">
```

and replace the closing `</main>` `);` with:

```tsx
      </div>
    </SettingsShell>
  );
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx"
git commit -m "feat(web): API keys page under SettingsShell tab"
```

---

## Task 6: Web — move + polish billing into settings

**Files:**
- Create: `apps/web/src/app/[locale]/(app)/settings/billing/page.tsx`
- Delete: `apps/web/src/app/[locale]/(app)/billing/page.tsx`

- [ ] **Step 1: Create the new billing settings page**

Create `apps/web/src/app/[locale]/(app)/settings/billing/page.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsShell } from "@/components/settings/settings-shell";
import { useSubscription, usePaymentIntentHistory } from "@/lib/queries/use-billing";
import { ROUTES } from "@/lib/constants";
import { PLAN_DISPLAY_NAMES_VI } from "@repo/shared";

export default function SettingsBillingPage() {
  const t = useTranslations("settings.billing");
  const sp = useSearchParams();
  const justPaid = sp.get("paid") === "1";
  const sub = useSubscription();
  const history = usePaymentIntentHistory();

  return (
    <SettingsShell active="billing">
      <div className="space-y-6">
        {justPaid ? (
          <div className="rounded-md bg-class-good/10 px-4 py-3 text-sm font-medium text-class-good">
            {t("paidBanner")}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("currentTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {t("planLabel")}:{" "}
              <strong>{sub.data ? PLAN_DISPLAY_NAMES_VI[sub.data.planCode] : "…"}</strong>
            </p>
            <p className="flex items-center gap-2">
              {t("statusLabel")}:{" "}
              {sub.data ? (
                <Badge variant={sub.data.status === "active" ? "info" : "muted"}>
                  {sub.data.status}
                </Badge>
              ) : (
                "…"
              )}
            </p>
            <p>
              {t("expiresLabel")}:{" "}
              {sub.data?.expiresAt
                ? new Date(sub.data.expiresAt).toLocaleString("vi-VN")
                : "—"}
            </p>
            {sub.data?.isAdminGranted ? (
              <p className="text-fg-muted">{t("adminGranted")}</p>
            ) : null}
            <div className="pt-2">
              <Button asChild>
                <Link href={ROUTES.pricing}>{t("upgrade")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("historyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(history.data ?? []).length === 0 ? (
              <p className="text-sm text-fg-muted">{t("historyEmpty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-fg-muted">
                    <th className="py-2 font-medium">{t("colTime")}</th>
                    <th className="font-medium">{t("colPlan")}</th>
                    <th className="font-medium">{t("colAmount")}</th>
                    <th className="font-medium">{t("colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data?.map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="py-2">
                        {new Date(p.paidAt ?? p.expiresAt).toLocaleString("vi-VN")}
                      </td>
                      <td>{p.planCode}</td>
                      <td>{p.amountVnd.toLocaleString("vi-VN")}đ</td>
                      <td>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsShell>
  );
}
```

- [ ] **Step 2: Delete the old billing page**

Run:

```bash
cd /Users/minhducoder/SEO-Analysts/apps/web
git rm "src/app/[locale]/(app)/billing/page.tsx"
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/web && npx tsc --noEmit`
Expected: no errors. (`Badge` has `info` + `muted` variants and `bg-class-good`/`text-class-good` tokens exist — both verified.)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/[locale]/(app)/settings/billing/page.tsx" "apps/web/src/app/[locale]/(app)/billing/page.tsx"
git commit -m "feat(web): move billing overview into Settings tab + restyle"
```

---

## Task 7: Web — fix checkout redirect + upgrade links

**Files:**
- Modify: `apps/web/src/app/[locale]/(app)/billing/checkout/[intentId]/page.tsx`

- [ ] **Step 1: Switch to locale-aware Link + ROUTES import**

In `apps/web/src/app/[locale]/(app)/billing/checkout/[intentId]/page.tsx`:

Replace line 6 `import Link from "next/link";` with:

```tsx
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";
```

- [ ] **Step 2: Update both post-payment redirects**

Replace BOTH occurrences of:

```tsx
      router.push("/billing?paid=1");
```

with:

```tsx
      router.push(`${ROUTES.settingsBilling}?paid=1`);
```

(Lines ~26 and ~52. `router` is `useRouter()` from `next/navigation`; the next-intl middleware re-prefixes the locale via the locale cookie, matching current behavior.)

- [ ] **Step 3: Update both upgrade links**

Replace BOTH occurrences of:

```tsx
        <Link href="/billing/upgrade">
```

with:

```tsx
        <Link href={ROUTES.pricing}>
```

- [ ] **Step 4: Typecheck**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/[locale]/(app)/billing/checkout/[intentId]/page.tsx"
git commit -m "feat(web): checkout redirects to /settings/billing, upgrade to /pricing"
```

---

## Task 8: Full verification

- [ ] **Step 1: Gateway unit tests**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/gateway && npx vitest run dev-autoconfirm`
Expected: 3 passed.

- [ ] **Step 2: Web unit suite**

Run: `cd /Users/minhducoder/SEO-Analysts/apps/web && npm test`
Expected: all green (incl. new settings-shell test).

- [ ] **Step 3: Lint + typecheck both apps**

Run (repo root): `npx turbo check-types lint --filter=@seo/web --filter=@seo/gateway`
Expected: 0 errors (pre-existing ui/* prop-types warnings acceptable).

- [ ] **Step 4: Web build + routes**

Run (repo root): `npx turbo build --filter=@seo/web`
Expected: build succeeds; route list contains `/[locale]/settings/billing` and `/[locale]/settings/api-keys`; no `/[locale]/billing` index route (only `billing/checkout/[intentId]` remains).

> NOTE: do NOT run `next build` while a `next dev` server is using `.next` — it clobbers the dev server. If a dev server is running on :3001, restart it (`rm -rf apps/web/.next` + `npm --workspace @seo/web run dev`) after building, or skip the build step and rely on dev + tests.

- [ ] **Step 5: Restart gateway to load the cron**

The gateway reads env + registers crons at boot. Restart it so `DevAutoConfirmCron` + `BILLING_DEV_AUTOCONFIRM=true` take effect:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs -r kill; sleep 2
cd /Users/minhducoder/SEO-Analysts && npm run dev:gateway   # (background)
```

Confirm boot log shows: `⚠️ BILLING_DEV_AUTOCONFIRM is ON …`.

- [ ] **Step 6: End-to-end smoke (manual)**

Log in (`localhost:3001`), open **Cài đặt → Gói & Thanh toán** (billing now a tab). Click **Nâng cấp / Gia hạn** → `/pricing` → choose Pro → checkout shows VietQR. Wait ≤1 minute: the cron auto-confirms, the page redirects to `/settings/billing?paid=1`, plan shows **Pro**. No manual webhook needed.

---

## Self-Review Notes (author)

- **Spec coverage:** 4 settings tabs ✓ (T3/T4), billing moved+polished ✓ (T6), api-keys wrapped ✓ (T5), upgrade→/pricing ✓ (T6/T7), checkout redirect→/settings/billing ✓ (T7), `findActivePending` ✓ (T1), double-guarded cron reusing reconciler ✓ (T2), env flag ✓ (T1), tests ✓ (T2/T4).
- **Pre-checks resolved:** `Badge` has `info`+`muted` variants ✓; `class-good` token exists ✓. `.env.docker.example` — skip gracefully if missing (T1 Step 2). Gateway tests run via `vitest`.
- **Consistency:** `ROUTES.settingsBilling` / `settingsApiKeys` used in SettingsShell (T4), billing page (T6), checkout (T7). SettingsTab union value `"api-keys"` matches the `active` props passed in T5/T6 and the i18n remap to `apiKeys`.
