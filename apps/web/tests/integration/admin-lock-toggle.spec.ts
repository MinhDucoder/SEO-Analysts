import { expect, test } from "@playwright/test";
import { request } from "@playwright/test";
import { GATEWAY_BASE, testUsers, TEST_PASSWORD } from "./fixtures/test-users";

/**
 * Mutates `users.is_locked` on a low-value test user, then restores it.
 * Targets nam@test.seo.local (empty user, 0 audits) so we don't disturb
 * the audit-bearing fixtures.
 */
const TARGET_EMAIL = testUsers.emptyUser.email;

test.describe.serial("L4: admin lock toggle round-trip", () => {
  let adminToken = "";
  let targetUserId = "";

  test.beforeAll(async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    const login = await ctx.post(`auth/login`, {
      data: { email: testUsers.admin.email, password: TEST_PASSWORD },
    });
    adminToken = ((await login.json()) as { accessToken: string }).accessToken;

    const list = await ctx.get(`admin/users?search=${encodeURIComponent(TARGET_EMAIL)}&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = (await list.json()) as {
      data: Array<{ id: string; email: string }>;
    };
    targetUserId = body.data.find((u) => u.email === TARGET_EMAIL)!.id;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    if (!targetUserId || !adminToken) return;
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    await ctx.patch(`admin/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { isLocked: false },
    });
    await ctx.dispose();
  });

  test("admin locks then unlocks a target user via PATCH /admin/users/:id", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });

    const lock = await ctx.patch(`admin/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { isLocked: true },
    });
    expect(lock.status()).toBe(200);
    expect(await lock.json()).toEqual(
      expect.objectContaining({
        id: targetUserId,
        email: TARGET_EMAIL,
        isLocked: true,
      }),
    );

    const unlock = await ctx.patch(`admin/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { isLocked: false },
    });
    expect(unlock.status()).toBe(200);
    expect(((await unlock.json()) as { isLocked: boolean }).isLocked).toBe(
      false,
    );

    await ctx.dispose();
  });
});
