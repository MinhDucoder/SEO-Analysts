import { expect, test } from "@playwright/test";
import { request } from "@playwright/test";
import { GATEWAY_BASE, testUsers, TEST_PASSWORD } from "./fixtures/test-users";

/**
 * The gateway emits RFC 7807 problem-details for 4xx auth failures:
 *   { type, title, status, detail, instance, requestId }
 *
 * `detail` is the human phrase (Vietnamese in this project). The FE
 * interceptor in `lib/api/client.ts` reads `detail` (alongside legacy
 * `message`/`code`) to decide whether to open AccountLockedModal — the
 * contract these specs lock in.
 */
type ProblemBody = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  requestId?: string;
};

test.describe("L4: locked / unverified contract", () => {
  test("locked@... gets 403 with a 'lock' phrase in `detail`", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    const res = await ctx.post(`auth/login`, {
      data: { email: testUsers.locked.email, password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(403);

    const body = (await res.json()) as ProblemBody;
    const phrase = `${body.title ?? ""} ${body.detail ?? ""}`.toLowerCase();
    expect(
      phrase,
      "the lock 403 must carry the lock phrase so the FE interceptor opens AccountLockedModal",
    ).toMatch(/locked|khoa|khóa/);
    expect(phrase).not.toMatch(/verif|xac minh|xác minh/);

    await ctx.dispose();
  });

  test("unverified@... gets 403 with a 'verify' phrase (NOT lock)", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    const res = await ctx.post(`auth/login`, {
      data: { email: testUsers.unverified.email, password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(403);

    const body = (await res.json()) as ProblemBody;
    const phrase = `${body.title ?? ""} ${body.detail ?? ""}`.toLowerCase();
    // Verify-marker present
    expect(phrase).toMatch(/verif|xac minh|xác minh/);
    // …and NOT a lock marker — this is the disambiguation case the FE
    // interceptor must respect (Phase 8 trap).
    expect(phrase).not.toMatch(/\blocked\b|\bkhoa\b|\bkhóa\b/);

    await ctx.dispose();
  });
});
