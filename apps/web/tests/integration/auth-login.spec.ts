import { expect, test } from "@playwright/test";
import { GATEWAY_BASE, testUsers } from "./fixtures/test-users";

test.describe("L4: auth login round-trip", () => {
  test("admin can log in via the UI and the wire response matches AuthSession", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    // Password field is the only `input[type=password]` outside the
    // password-toggle button.
    await page.locator('input[type="password"]').fill(testUsers.admin.password);

    const responsePromise = page.waitForResponse(
      (r) =>
        r.url() === `${GATEWAY_BASE}auth/login` && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /sign in|đăng nhập/i }).click();
    const response = await responsePromise;

    // Wire contract — body shape mirrors AuthSession (typed against
    // apps/web/src/lib/api/types.ts AuthSession).
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          email: testUsers.admin.email,
          role: "admin",
        }),
        accessToken: expect.any(String),
      }),
    );
    expect(body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT shape

    // Wire contract — refresh_token cookie must be HttpOnly and scoped
    // to the auth path. Gateway emits `Path=/api/v1/auth` (narrow scope
    // = more secure than `Path=/`). The FE client's
    // `credentials: 'include'` still sends it because both /auth/login
    // and /auth/refresh sit under that prefix.
    const cookies = await context.cookies();
    const refresh = cookies.find((c) => c.name === "refresh_token");
    expect(refresh, "refresh_token cookie must be present").toBeDefined();
    expect(refresh!.httpOnly, "refresh_token must be HttpOnly").toBe(true);
    expect(
      refresh!.path,
      "refresh_token cookie path should be scoped at or above /api/v1/auth",
    ).toMatch(/^\/(?:api\/v1\/auth)?\/?$/);
  });

  test("login with wrong password fails with 401 and sets no cookie", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(testUsers.regularLight.email);
    await page.locator('input[type="password"]').fill("WrongPassword!1");

    const responsePromise = page.waitForResponse(
      (r) =>
        r.url() === `${GATEWAY_BASE}auth/login` && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /sign in|đăng nhập/i }).click();
    const response = await responsePromise;

    expect(response.status()).toBe(401);
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "refresh_token")).toBeUndefined();
  });
});
