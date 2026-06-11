import { request } from "@playwright/test";

/**
 * Warm the reused Next server before the suite runs.
 *
 * The e2e project runs against whatever server is already on :3001
 * (`reuseExistingServer`). A production `next start` lazy-loads each route's
 * server modules on the FIRST hit, so a freshly (re)started server — the VS
 * Code extension respawns `npm start` periodically — makes the first parallel
 * page loads take 5–30s and trip the assertion timeouts (all green once warm).
 *
 * Hitting the key routes once here, serially, pays that cold-start cost up
 * front so the real tests always run against a warm server. Failures are
 * swallowed: warmup is best-effort, never a gate.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const ROUTES = [
  "/vi/pricing",
  "/vi/login",
  "/vi/billing/checkout/warmup",
  "/settings/billing",
];

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE });
  for (const route of ROUTES) {
    await ctx.get(route, { timeout: 60_000 }).catch(() => {});
  }
  await ctx.dispose();
}
