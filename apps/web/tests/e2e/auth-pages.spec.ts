import { test, expect } from "@playwright/test";

/**
 * Auth-page UI smoke tests. Do not require a running gateway — they only
 * verify the Next dev server renders the pages with correct Vietnamese
 * copy + semantic structure. Network calls to the gateway are intercepted
 * via `page.route()` where needed so the test fails fast instead of
 * waiting on a timeout.
 */

test.describe("auth pages render correctly", () => {
  test("/login renders form + Google button + register link", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /Đăng nhập/i })).toBeVisible();
    await expect(page.getByLabel(/^Email$/i)).toBeVisible();
    await expect(page.getByLabel(/^Mật khẩu$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Đăng nhập$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Đăng nhập với Google/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Đăng ký$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Quên mật khẩu/i })).toBeVisible();
  });

  test("/register renders full form with agreed checkbox", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: /Tạo tài khoản/i })).toBeVisible();
    await expect(page.getByLabel(/Họ và tên/i)).toBeVisible();
    await expect(page.getByLabel(/^Email$/i)).toBeVisible();
    await expect(page.getByLabel(/^Mật khẩu$/i)).toBeVisible();
    await expect(page.getByLabel(/Xác nhận mật khẩu/i)).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /^Đăng ký$/i })).toBeVisible();
  });

  test("/forgot-password renders email input + submit", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByRole("heading", { name: /Quên mật khẩu/i })).toBeVisible();
    await expect(page.getByLabel(/^Email$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Gửi link đặt lại/i })).toBeVisible();
  });

  test("all auth pages declare html lang=vi", async ({ page }) => {
    for (const path of ["/login", "/register", "/forgot-password"]) {
      await page.goto(path);
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang, `html[lang] for ${path}`).toBe("vi");
    }
  });

  test("mocked 200 /auth/login pushes user to /dashboard", async ({ page }) => {
    // Intercept the gateway call so the test doesn't need docker:up.
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "test-token",
          user: {
            id: "u1",
            email: "e2e@example.com",
            fullName: "E2E User",
            role: "user",
            emailVerified: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    // /dashboard hasn't been built yet (slug 3). Stub it so router.push
    // doesn't 404 + fail the test. We only care that the navigation was
    // kicked off.
    await page.route("**/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Dashboard placeholder</body></html>",
      });
    });

    await page.goto("/login");
    await page.getByLabel(/^Email$/i).fill("e2e@example.com");
    await page.getByLabel(/^Mật khẩu$/i).fill("password123");
    await page.getByRole("button", { name: /^Đăng nhập$/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    expect(page.url()).toContain("/dashboard");
  });
});
