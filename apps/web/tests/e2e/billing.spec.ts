import { test, expect } from "@playwright/test";
import {
  makeIntent,
  mockAuthed,
  mockCreateIntent,
  mockGuest,
  mockIntentDetail,
  mockPlans,
} from "./helpers/billing";

/**
 * Billing / pricing flow — fully mocked at the network boundary (page.route),
 * because the e2e Playwright project boots only the Next dev server, no
 * gateway (see playwright.config.ts). We assert the UI flow from /pricing
 * through the QR-displayed checkout and the paid → redirect transition. The
 * webhook → DB activation roundtrip lives in the gateway integration suite
 * (apps/gateway/test/integration/billing-*.e2e-spec.ts).
 *
 * Routes carry an explicit `/vi` prefix: defaultLocale is `en`
 * (src/i18n/routing.ts), so an unprefixed `/pricing` renders English copy that
 * would not match the Vietnamese assertions below.
 */
test.describe("Billing flow", () => {
  test("guest: /pricing renders 3 plan cards with prices + popular badge", async ({ page }) => {
    await mockGuest(page);
    await mockPlans(page);

    await page.goto("/vi/pricing");

    await expect(page.getByText(/Chọn gói/i)).toBeVisible();

    // Plan names appear twice (card title + comparison-table header) → .first().
    await expect(page.getByText("Cá nhân").first()).toBeVisible();
    await expect(page.getByText("Chuyên nghiệp").first()).toBeVisible();
    await expect(page.getByText("Doanh nghiệp").first()).toBeVisible();

    // Prices: free card shows the "Miễn phí" label; paid cards show vi-VN amounts.
    await expect(page.getByText("Miễn phí", { exact: true })).toBeVisible();
    await expect(page.getByText(/99\.000đ/).first()).toBeVisible();
    await expect(page.getByText(/299\.000đ/).first()).toBeVisible();

    // Pro is the highlighted "Phổ biến" plan.
    await expect(page.getByText("Phổ biến")).toBeVisible();

    // Only the two paid plans expose an upgrade button; free has none.
    await expect(page.getByRole("button", { name: /nâng cấp/i })).toHaveCount(2);
  });

  test("guest: clicking 'Nâng cấp' redirects to login with next=/pricing", async ({ page }) => {
    await mockGuest(page);
    await mockPlans(page);

    await page.goto("/vi/pricing");
    await page.getByRole("button", { name: /nâng cấp/i }).first().click();

    await expect(page).toHaveURL(/\/login\?next=%2Fpricing|\/login\?next=\/pricing/);
  });

  test("guest: shows an error state when /plans fails", async ({ page }) => {
    await mockGuest(page);
    await mockPlans(page, { status: 500 });

    await page.goto("/vi/pricing");
    await expect(page.getByText(/Lỗi tải danh sách gói/i)).toBeVisible({ timeout: 15_000 });
  });

  test("authed user upgrading Pro reaches checkout with VietQR + ref code", async ({ page }) => {
    const intent = makeIntent({ planCode: "pro", refCode: "SEOXYZ34", amountVnd: 99_000 });
    await mockAuthed(page, { planCode: "free" });
    await mockPlans(page);
    await mockCreateIntent(page, intent);
    await mockIntentDetail(page, intent);

    await page.goto("/vi/pricing");

    // Plans render free → pro → business, so the first upgrade button is Pro's.
    await page.getByRole("button", { name: /nâng cấp/i }).first().click();

    await expect(page).toHaveURL(/\/billing\/checkout\/intent-e2e-1/);
    await expect(page.getByText(/Quét mã VietQR/)).toBeVisible();
    await expect(page.getByText("SEOXYZ34")).toBeVisible();
    await expect(page.getByText(/99\.000đ/)).toBeVisible();
  });

  test("authed user on their current plan sees 'Đang dùng' and cannot re-upgrade it", async ({ page }) => {
    await mockAuthed(page, { planCode: "pro" });
    await mockPlans(page);

    await page.goto("/vi/pricing");

    await expect(page.getByText("Đang dùng").first()).toBeVisible();
    // Pro lost its upgrade button; only Business (one button) remains upgradeable.
    await expect(page.getByRole("button", { name: /nâng cấp/i })).toHaveCount(1);
  });

  test("checkout auto-redirects to billing once the intent is paid", async ({ page }) => {
    const paid = makeIntent({ status: "paid", paidAt: new Date().toISOString() });
    await mockAuthed(page, { planCode: "free" });
    await mockIntentDetail(page, paid);

    await page.goto("/vi/billing/checkout/intent-e2e-1");

    await expect(page).toHaveURL(/\/settings\/billing\?paid=1/);
  });
});
