# Recipe — Real-Gateway Assertions

Mẫu assertion kiểm các thứ **chỉ real BE mới expose** — L3 mock không thấy.

## Test 1: Login round-trip + cookie HttpOnly

```ts
// apps/web/tests/integration/auth-login.spec.ts
import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./fixtures/seed-users";

test.describe("login round-trip (real gateway)", () => {
  test("valid credentials → hydrates session + sets HttpOnly refresh cookie", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByLabel(/^Email$/i).fill(TEST_USERS.regular.email);
    await page.getByLabel(/^Mật khẩu$/i).fill(TEST_USERS.regular.password);
    await page.getByRole("button", { name: /^Đăng nhập$/i }).click();

    // Wait for real gateway round-trip
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });

    // Wire-level: refresh cookie phải tồn tại với flags đúng
    const cookies = await context.cookies();
    const refresh = cookies.find(c => c.name === "refreshToken");
    expect(refresh, "refresh token cookie must be set").toBeDefined();
    expect(refresh!.httpOnly, "refresh cookie must be HttpOnly to prevent XSS").toBe(true);
    expect(refresh!.path, "refresh cookie must be scoped to /api/v1/auth").toBe("/api/v1/auth");
    expect(refresh!.sameSite, "refresh cookie must be Lax or Strict").toMatch(/^(Lax|Strict)$/);

    // Access token phải ở memory (zustand), không ở cookie
    const accessCookie = cookies.find(c => c.name === "accessToken");
    expect(accessCookie, "access token must NOT be in a cookie (memory only)").toBeUndefined();
  });

  test("invalid password → 401 toast + user stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/^Email$/i).fill(TEST_USERS.regular.email);
    await page.getByLabel(/^Mật khẩu$/i).fill("WrongPassword");
    await page.getByRole("button", { name: /^Đăng nhập$/i }).click();

    // Wait 2s to let any navigation happen (or not)
    await page.waitForTimeout(2_000);
    expect(page.url()).toContain("/login");

    // Vietnamese error toast hoặc inline error
    await expect(page.getByText(/sai|không đúng|invalid/i)).toBeVisible();
  });
});
```

## Test 2: Session expiry + silent refresh

```ts
// apps/web/tests/integration/auth-session-expiry.spec.ts
import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./fixtures/seed-users";

test("expired access token → silent refresh keeps user logged in", async ({ page, context }) => {
  // Login first
  await page.goto("/login");
  await page.getByLabel(/^Email$/i).fill(TEST_USERS.regular.email);
  await page.getByLabel(/^Mật khẩu$/i).fill(TEST_USERS.regular.password);
  await page.getByRole("button", { name: /^Đăng nhập$/i }).click();
  await page.waitForURL(/\/dashboard/);

  // Simulate access token expiry by clearing in-memory Zustand state
  // (refresh cookie still valid in context)
  await page.evaluate(() => {
    const store = (window as unknown as { __authStore?: { clearAuth: () => void } }).__authStore;
    store?.clearAuth();
  });

  // Navigate to a protected route — should trigger AuthBootstrap refresh
  await page.goto("/dashboard");

  // If silent refresh works: stay on /dashboard
  // If broken: redirected to /login
  await page.waitForTimeout(3_000);
  expect(page.url(), "silent refresh must keep user on dashboard").toContain("/dashboard");
});
```

## Test 3: Rate limit 429

```ts
// apps/web/tests/integration/auth-rate-limit.spec.ts
import { test, expect, request } from "@playwright/test";

test("5 failed logins in 60s → 429 rate limit", async ({ playwright }) => {
  const api = await playwright.request.newContext({
    baseURL: "http://localhost:3000/api/v1",
  });

  // Fire 6 failed logins quickly (rate limit is 5/min per IP in gateway)
  const responses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await api.post("/auth/login", {
      data: { email: "nobody@example.com", password: "wrong" },
    });
    responses.push(res.status());
  }

  // First 5 = 401, 6th = 429
  expect(responses.slice(0, 5).every(s => s === 401)).toBe(true);
  expect(responses[5], "6th request must be rate-limited").toBe(429);

  await api.dispose();
});
```

## Test 4: CORS preflight

```ts
// apps/web/tests/integration/auth-cors.spec.ts
import { test, expect } from "@playwright/test";

test("CORS preflight allows apps/web origin", async ({ playwright }) => {
  const api = await playwright.request.newContext({
    baseURL: "http://localhost:3000/api/v1",
  });

  const preflight = await api.fetch("/auth/login", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:3001",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  });

  expect(preflight.status()).toBe(204);
  expect(preflight.headers()["access-control-allow-origin"]).toBe("http://localhost:3001");
  expect(preflight.headers()["access-control-allow-credentials"]).toBe("true");

  await api.dispose();
});
```

## Test 5: OAuth state param (CSRF)

```ts
// apps/web/tests/integration/auth-oauth.spec.ts
import { test, expect } from "@playwright/test";

test("OAuth callback rejects missing state param", async ({ page }) => {
  // Try callback without state → must redirect to /login with error
  await page.goto("/auth/oauth-success?token=fake-token");
  await page.waitForTimeout(1_500);

  // Either stays on oauth-success with error UI, or redirects to /login
  const url = page.url();
  const hasError =
    url.includes("/login") ||
    (await page.getByText(/invalid|lỗi|không hợp lệ/i).isVisible().catch(() => false));
  expect(hasError, "malformed OAuth callback must show error or redirect").toBe(true);
});
```

## Helper — build request context with auth

`apps/web/tests/integration/helpers/api.ts`:

```ts
import { request, type APIRequestContext } from "@playwright/test";
import { TEST_USERS } from "../fixtures/seed-users";

export async function loggedInApi(userKey: keyof typeof TEST_USERS = "regular"): Promise<APIRequestContext> {
  const user = TEST_USERS[userKey];
  const ctx = await request.newContext({
    baseURL: "http://localhost:3000/api/v1",
  });
  const res = await ctx.post("/auth/login", {
    data: { email: user.email, password: user.password },
  });
  const body = await res.json();
  // Attach Authorization header for subsequent requests
  await ctx.dispose();
  return await request.newContext({
    baseURL: "http://localhost:3000/api/v1",
    extraHTTPHeaders: {
      Authorization: `Bearer ${body.accessToken}`,
    },
  });
}
```

## Anti-patterns

- ❌ Test chỉ assert URL changed → miss cookie shape / token shape bug.
- ❌ Hardcode token giá trị trong assertion → token thay đổi mỗi run → flaky.
- ❌ Test OAuth với real Google → flaky + quota cost.
- ❌ Rate-limit test không cleanup Redis counter → suite sau thấy 429 ngay request 1.
- ❌ Session-expiry test dùng real setTimeout 15 phút → chạy 15 phút → điên.
  → dùng page.evaluate() để clear store in-memory, hoặc fake clock.

## Checklist

- [ ] Mỗi spec ≥ 1 assertion kiểm thứ chỉ real BE mới expose (cookie flag, CORS header, rate limit, etc.).
- [ ] Dùng `TEST_USERS` fixture — không hardcode credentials trong spec.
- [ ] API context dispose trong `afterAll` hoặc `try/finally`.
- [ ] Rate-limit test cleanup Redis counter trong `afterAll`.
- [ ] Session-expiry test dùng page.evaluate thay vì real timeout.
- [ ] Vietnamese copy regex cho UI assertions.