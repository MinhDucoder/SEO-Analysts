import { expect, test } from "@playwright/test";
import { request } from "@playwright/test";
import { GATEWAY_BASE, testUsers, TEST_PASSWORD } from "./fixtures/test-users";

test.describe("L4: admin role gate at the wire", () => {
  test("regular user receives 403 on /admin/stats", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    const login = await ctx.post(`auth/login`, {
      data: {
        email: testUsers.regularLight.email,
        password: TEST_PASSWORD,
      },
    });
    expect(login.ok()).toBe(true);
    const { accessToken } = (await login.json()) as { accessToken: string };

    const res = await ctx.get(`admin/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // Gateway must reject — 403 is the role-check failure. The FE
    // `AdminGuard` is a UX-only shortcut; the wire MUST enforce.
    expect(res.status()).toBe(403);

    await ctx.dispose();
  });

  test("admin successfully fetches /admin/stats with the documented shape", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    const login = await ctx.post(`auth/login`, {
      data: {
        email: testUsers.admin.email,
        password: TEST_PASSWORD,
      },
    });
    const { accessToken } = (await login.json()) as { accessToken: string };

    const res = await ctx.get(`admin/stats?period=30d`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        overview: expect.objectContaining({
          totalUsers: expect.any(Number),
          totalAudits: expect.any(Number),
          successRate: expect.any(Number),
          avgCrawlTimeMs: expect.any(Number),
          avgSeoScore: expect.any(Number),
        }),
        newUsersToday: expect.any(Number),
        auditsToday: expect.any(Number),
        topDomains: expect.any(Array),
      }),
    );

    await ctx.dispose();
  });

  test("admin /admin/users returns AdminPaginated<AdminUser>", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    const login = await ctx.post(`auth/login`, {
      data: {
        email: testUsers.admin.email,
        password: TEST_PASSWORD,
      },
    });
    const { accessToken } = (await login.json()) as { accessToken: string };

    const res = await ctx.get(`admin/users?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          limit: 5,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      }),
    );
    if (body.data.length > 0) {
      expect(body.data[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          role: expect.any(String),
          isLocked: expect.any(Boolean),
          isVerified: expect.any(Boolean),
          auditCount: expect.any(Number),
        }),
      );
    }

    await ctx.dispose();
  });
});
