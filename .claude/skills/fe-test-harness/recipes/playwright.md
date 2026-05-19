# Recipe — Playwright E2E

Playwright hit dev server thật (`http://localhost:3001`). Khi backend không chạy (`npm run docker:up` chưa có), stub gateway qua `page.route()`.

## File 1: `apps/web/playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

**Notes:**
- `PLAYWRIGHT_BASE_URL` declared trong `turbo.json` globalEnv (commit `704141c`) để turbo không invalidate cache khi env flip.
- `reuseExistingServer: !process.env.CI` cho phép dev chạy lặp lại tests nhanh khi đã `npm run dev` sẵn.
- CI: 2 retries + 1 worker để trace on-retry vẫn tái tạo được.

## File 2: `apps/web/tests/e2e/helpers/<slug>.ts`

Ví dụ với `auth`:

```ts
import { type Page, expect } from "@playwright/test";

/**
 * Helpers cho Playwright auth flows. Tách khỏi vitest/MSW setup —
 * Playwright hit real dev server (port 3001), dev server call real
 * gateway nếu `docker:up` running. Tests không cần backend: mock qua
 * `page.route(...)` trong spec.
 */

/**
 * Programmatic UI login: fill /login form rồi submit. Success chỉ khi
 * gateway reachable. Prefer mock với `page.route(...)` trong unit-style
 * e2e specs.
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
 * Wait cho Vietnamese copy xuất hiện trên page (common auth success
 * screens: "Hoàn thành", "Đã gửi email", v.v.).
 */
export async function waitForCopy(page: Page, text: RegExp | string): Promise<void> {
  await expect(page.getByText(text)).toBeVisible();
}
```

## Pattern: Mock gateway không cần backend

```ts
// apps/web/tests/e2e/auth-pages.spec.ts
import { test, expect } from "@playwright/test";

test("mocked 200 login pushes to /dashboard", async ({ page }) => {
  // Stub gateway login endpoint
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "test@example.com", fullName: "Test" },
        accessToken: "t-1",
      }),
    }),
  );

  // Stub /dashboard page nếu slug kia chưa build
  await page.route("**/dashboard", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Dashboard stub</body></html>",
    }),
  );

  await page.goto("/login");
  await page.getByLabel(/^Email$/i).fill("test@example.com");
  await page.getByLabel(/^Mật khẩu$/i).fill("password123");
  await page.getByRole("button", { name: /^Đăng nhập$/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});
```

## Pattern: HTML attribute assertion (lang, meta)

```ts
test("all /auth pages declare html lang=vi", async ({ page }) => {
  for (const path of ["/login", "/register", "/forgot-password"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  }
});
```

## Discipline

- **Vietnamese copy qua regex**: `/^Đăng nhập$/i` chứ không hardcode `"Login"` — prod dùng Vietnamese.
- **Anchor regex**: `^...$` tránh match button "Đăng nhập với Google" khi đang tìm "Đăng nhập".
- **Stub downstream nếu slug chưa build**: `page.route("**/dashboard", ...)` khi slug 3 chưa có `/dashboard`.
- **Tests chạy không cần docker:up**: default dùng `page.route`, chỉ dùng real backend khi e2e flow cần integration thật (đánh dấu `test.describe.configure({ mode: 'serial' })` + skip trên CI nếu cần).

## Checklist

- [ ] `playwright.config.ts` có `webServer` + `baseURL` + CI-aware retries/workers.
- [ ] `PLAYWRIGHT_BASE_URL` declared trong `turbo.json` globalEnv.
- [ ] Helpers file dùng regex Vietnamese cho labels.
- [ ] Mỗi spec mock `page.route` hoặc explicit đánh dấu "needs docker:up".
- [ ] Downstream page chưa build → stub HTML fulfill.