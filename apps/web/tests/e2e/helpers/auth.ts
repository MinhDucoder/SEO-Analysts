import { type Page, expect } from "@playwright/test";

/**
 * Helpers for Playwright auth flows. Separate from vitest/MSW setup —
 * Playwright hits the real dev server (port 3001) which in turn calls the
 * real gateway if `docker:up` is running. For tests that should work
 * without a running backend, mock responses via `page.route(...)` inside
 * the spec.
 */

/**
 * Programmatic UI login: fills the /login form and submits. Succeeds only
 * if gateway is reachable. Prefer mocking with `page.route(...)` in unit-
 * style e2e specs.
 */
export async function loginViaForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Mật khẩu$/i).fill(password);
  await page.getByRole("button", { name: /^Đăng nhập$/i }).click();
}

/**
 * Wait until the given Vietnamese copy appears on the page (common on
 * auth success screens: "Hoàn thành", "Đã gửi email", etc.).
 */
export async function waitForCopy(page: Page, text: RegExp | string): Promise<void> {
  await expect(page.getByText(text)).toBeVisible();
}
