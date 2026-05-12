import { expect, test } from "@playwright/test";
import { request } from "@playwright/test";
import { GATEWAY_BASE } from "./fixtures/test-users";

/**
 * Hammer the login endpoint with wrong credentials for an unused email
 * so we don't pollute counters on real test users. The rate limit is
 * per-email (RATE_LIMIT.AUTH.LOGIN = 10/15min per BACKEND-API §rate-limit).
 *
 * **L4 finding** (Phase 9 L4 run): the gateway surfaces throttling as
 * **HTTP 403 with a Vietnamese phrase + wait-seconds in the `detail`
 * field**, NOT as a 429 with `Retry-After`. The FE interceptor
 * accommodates both — this spec locks in the actual contract.
 *
 * NOTE: counter persists in Redis across runs within the 15-minute
 * window. We pick a unique-per-run email (timestamp suffix) so reruns
 * are independent.
 */
const HAMMER_EMAIL = `ratelimit-${Date.now()}@l4-test.local`;

type ProblemBody = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
};

test.describe("L4: gateway rate-limit on /auth/login", () => {
  test("trips to 403 with a rate-limit phrase after the per-email budget is exhausted", async () => {
    const ctx = await request.newContext({ baseURL: GATEWAY_BASE });
    let throttledStatus: number | null = null;
    let throttledDetail: string | null = null;

    // 12 attempts > 10/15min budget. Each gets 401 (unknown email) until
    // the limit trips, then the gateway swaps to 403 with the throttle
    // copy.
    for (let i = 0; i < 12; i++) {
      const r = await ctx.post(`auth/login`, {
        data: { email: HAMMER_EMAIL, password: "AlsoWrong!1" },
      });
      if (r.status() === 403 || r.status() === 429) {
        throttledStatus = r.status();
        const body = (await r.json()) as ProblemBody;
        throttledDetail = body.detail ?? null;
        break;
      }
      expect([401, 403, 429]).toContain(r.status());
    }
    await ctx.dispose();

    expect(throttledStatus, "gateway must throttle within 12 attempts").not.toBeNull();
    // Real BE behaviour: 403 with the Vietnamese phrase. Accept 429 too
    // in case BE swaps to a stricter contract later.
    expect([403, 429]).toContain(throttledStatus!);

    if (throttledStatus === 403) {
      expect(
        (throttledDetail ?? "").toLowerCase(),
        "the 403 throttle response must carry a rate-limit phrase the FE interceptor can match",
      ).toMatch(/qua nhieu|quá nhiều|too many/);
      expect(
        throttledDetail,
        "wait-seconds must be embedded in the detail string so the FE can extract a countdown",
      ).toMatch(/\d+\s*s\b/);
    }
  });
});
