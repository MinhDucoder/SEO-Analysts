import { test, expect } from "@playwright/test";

/**
 * Subscription happy path: pricing → click Pro → log in → checkout shows
 * QR + ref code. Webhook → activation roundtrip lives in the integration
 * suite (gateway/test/integration/billing-webhook.e2e-spec.ts); here we
 * only assert the UI flow up to the QR-displayed state.
 */
test.describe("Billing flow", () => {
  test("/pricing renders 3 plan cards", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText(/Chọn gói/i)).toBeVisible();
    await expect(page.getByText("Cá nhân")).toBeVisible();
    await expect(page.getByText("Chuyên nghiệp")).toBeVisible();
    await expect(page.getByText("Doanh nghiệp")).toBeVisible();
  });

  test.skip("logged-in user clicking 'Nâng cấp' reaches checkout with QR", async ({ page }) => {
    // TODO: requires a seeded test user + JWT login flow. Wire when CI env
    // has CASSO_WEBHOOK_SECRET=test-secret and a stable test fixture user.
    await page.goto("/pricing");
    await page.getByRole("button", { name: /nâng cấp/i }).first().click();
    // login flow ...
    await expect(page).toHaveURL(/\/billing\/checkout\//);
    await expect(page.getByText(/Quét mã VietQR/)).toBeVisible();
    await expect(page.getByText(/SEO[A-Z2-7]{5}/)).toBeVisible();
  });

  test.skip("Casso webhook activates Pro → page auto-redirects to /billing", async () => {
    // TODO: integration-style; needs running gateway with CASSO_WEBHOOK_SECRET
    // and ability to fire HTTP POST to /api/v1/webhooks/casso from the test.
  });
});
