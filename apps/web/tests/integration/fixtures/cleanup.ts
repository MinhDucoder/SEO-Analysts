import { request } from "@playwright/test";
import { GATEWAY_BASE, TEST_PASSWORD, testUsers } from "./test-users";

/**
 * Restore mutable test-state after specs that change DB rows.
 * The integration suite intentionally mutates:
 *   - `users.is_locked` (admin-lock-toggle.spec.ts)
 *
 * This helper relies on the admin endpoint instead of hitting Prisma
 * directly — keeps the harness portable across DB migrations. If the
 * admin endpoint is itself the thing under test, prefer raw SQL via
 * `docker exec seo-gateway-db psql ...` instead.
 */
export async function restoreUserUnlocked(
  email: string,
  adminAccessToken: string,
): Promise<void> {
  const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
  try {
    // Find the user row first to know their id (admin list returns id).
    const listRes = await ctx.get(`admin/users`, {
      params: { search: email, limit: 5 },
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    if (!listRes.ok()) return;
    const list = (await listRes.json()) as {
      data: Array<{ id: string; email: string; isLocked: boolean }>;
    };
    const target = list.data.find((u) => u.email === email);
    if (!target || !target.isLocked) return;

    await ctx.patch(`admin/users/${target.id}`, {
      data: { isLocked: false },
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
  } finally {
    await ctx.dispose();
  }
}

/**
 * Issue a real login against the gateway and return the bearer token.
 * Used by specs that need a pre-authenticated request context.
 */
export async function loginAndGetToken(
  email: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
  try {
    const res = await ctx.post(`auth/login`, {
      data: { email, password },
    });
    if (!res.ok()) {
      throw new Error(
        `loginAndGetToken: ${email} -> ${res.status()} ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { accessToken: string };
    return body.accessToken;
  } finally {
    await ctx.dispose();
  }
}

export async function getAdminToken(): Promise<string> {
  return loginAndGetToken(testUsers.admin.email);
}
