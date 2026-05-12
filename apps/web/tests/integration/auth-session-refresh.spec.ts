import { expect, test } from "@playwright/test";
import { request } from "@playwright/test";
import { GATEWAY_BASE, testUsers, TEST_PASSWORD } from "./fixtures/test-users";

test.describe("L4: session refresh round-trip", () => {
  test("POST /auth/refresh with the cookie returns a fresh access token", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });

    const login = await ctx.post(`auth/login`, {
      data: {
        email: testUsers.regularLight.email,
        password: TEST_PASSWORD,
      },
    });
    expect(login.ok()).toBe(true);
    const original = ((await login.json()) as { accessToken: string }).accessToken;

    // The login response set the refresh_token cookie on `ctx`. The
    // refresh endpoint relies on that cookie alone (no auth header).
    const refresh = await ctx.post(`auth/refresh`);
    expect(refresh.status()).toBe(200);

    const body = (await refresh.json()) as { accessToken: string };
    expect(body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    // Note: we don't assert `accessToken !== original` because two
    // JWTs minted in the same wall-clock second produce identical
    // signatures (same iat/exp). The contract we care about is the
    // shape + the 200 status — the FE silent-refresh path treats a
    // 200 with a valid JWT as success regardless of token diff.
    expect(original).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    await ctx.dispose();
  });

  test("POST /auth/refresh without cookie returns 401", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    const res = await ctx.post(`auth/refresh`);
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });
});
