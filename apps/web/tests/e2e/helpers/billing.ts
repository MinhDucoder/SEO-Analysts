import type { Page, Route } from "@playwright/test";

/**
 * Reusable network mocks for the billing / pricing flow Playwright specs.
 *
 * The e2e Playwright project (playwright.config.ts) boots ONLY the Next dev
 * server for apps/web — there is no gateway. Every backend call must therefore
 * be stubbed via `page.route` so the pricing → checkout flow renders
 * deterministically and offline.
 *
 * Patterns are RegExp (not glob) to unambiguously separate the payment-intents
 * *create/list* endpoint (`…/payment-intents`) from the *:id detail* endpoint
 * (`…/payment-intents/:id`). Extend per-slug by registering more
 * `page.route(...)` AFTER these helpers — Playwright matches the LAST
 * registered handler.
 */

const PLANS_RE = /\/api\/v1\/plans(\?.*)?$/;
const REFRESH_RE = /\/api\/v1\/auth\/refresh$/;
const ME_RE = /\/api\/v1\/auth\/me$/;
const SUB_RE = /\/api\/v1\/me\/subscription$/;
const INTENT_CREATE_RE = /\/api\/v1\/billing\/payment-intents$/;
const INTENT_DETAIL_RE = /\/api\/v1\/billing\/payment-intents\/[^/]+$/;

type PlanCode = "free" | "pro" | "business";

export interface PlanFixture {
  code: PlanCode;
  displayName: string;
  priceVnd: number;
  sortOrder: number;
  features: Record<string, unknown>;
}

/** Mirrors `PLAN_FEATURES` from `@repo/shared` so the cards/table render real values. */
const FEATURES: Record<PlanCode, Record<string, unknown>> = {
  free: {
    audits_monthly: 10, site_audit_max_pages: 0, scheduled_audits_max: 0,
    scheduled_audit_min_interval_min: 1440, api_keys_max: 0, api_calls_daily: 0,
    ai_calls_monthly: 0, tools_fetches_daily: 10, history_retention_days: 7, features: [],
  },
  pro: {
    audits_monthly: 200, site_audit_max_pages: 200, scheduled_audits_max: 5,
    scheduled_audit_min_interval_min: 1440, api_keys_max: 1, api_calls_daily: 1000,
    ai_calls_monthly: 100, tools_fetches_daily: -1, history_retention_days: 90,
    features: ["site_audit", "scheduled_audit", "api_key", "ai_suggestions", "pdf_export", "share_link", "email_alert"],
  },
  business: {
    audits_monthly: 1000, site_audit_max_pages: 2000, scheduled_audits_max: 30,
    scheduled_audit_min_interval_min: 15, api_keys_max: 5, api_calls_daily: 20_000,
    ai_calls_monthly: 1000, tools_fetches_daily: -1, history_retention_days: -1,
    features: ["site_audit", "scheduled_audit", "api_key", "ai_suggestions", "pdf_export", "share_link", "email_alert", "priority_queue"],
  },
};

/** The default 3-plan catalogue returned by `GET /plans`, sorted by `sortOrder`. */
export const PLANS_FIXTURE: PlanFixture[] = [
  { code: "free", displayName: "Cá nhân", priceVnd: 0, sortOrder: 0, features: FEATURES.free },
  { code: "pro", displayName: "Chuyên nghiệp", priceVnd: 99_000, sortOrder: 1, features: FEATURES.pro },
  { code: "business", displayName: "Doanh nghiệp", priceVnd: 299_000, sortOrder: 2, features: FEATURES.business },
];

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Stub `GET /plans`. Pass `status >= 400` to exercise the error branch. */
export async function mockPlans(
  page: Page,
  opts: { status?: number; plans?: PlanFixture[] } = {},
): Promise<void> {
  await page.route(PLANS_RE, (route) =>
    opts.status && opts.status >= 400
      ? route.fulfill({ status: opts.status, contentType: "application/json", body: JSON.stringify({ message: "boom" }) })
      : json(route, opts.plans ?? PLANS_FIXTURE),
  );
}

/** Boot the app as a guest: the silent refresh returns 401 → no access token. */
export async function mockGuest(page: Page): Promise<void> {
  await page.route(REFRESH_RE, (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
}

export interface AuthedOpts {
  /** Which plan the current user is subscribed to (drives the "Đang dùng" badge). */
  planCode?: PlanCode;
  role?: "user" | "admin";
}

/**
 * Boot the app authenticated: refresh → token, me → user, subscription → plan.
 * Replicates the AuthBootstrap handshake so AuthGuard renders `(app)` pages.
 */
export async function mockAuthed(page: Page, opts: AuthedOpts = {}): Promise<void> {
  const planCode = opts.planCode ?? "free";
  await page.route(REFRESH_RE, (route) => json(route, { accessToken: "e2e-access-token" }));
  await page.route(ME_RE, (route) =>
    json(route, {
      id: "user-e2e",
      email: "e2e@example.com",
      fullName: "E2E User",
      role: opts.role ?? "user",
      emailVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  );
  await page.route(SUB_RE, (route) =>
    json(route, {
      planCode,
      status: "active",
      expiresAt: planCode === "free" ? null : "2026-12-31T00:00:00.000Z",
      isAdminGranted: false,
      features: FEATURES[planCode],
    }),
  );
}

export interface IntentFixture {
  id: string;
  userId: string;
  refCode: string;
  planCode: PlanCode;
  amountVnd: number;
  vietqrUrl: string;
  status: "pending" | "paid" | "expired" | "failed";
  expiresAt: string;
  paidAt: string | null;
}

export function makeIntent(over: Partial<IntentFixture> = {}): IntentFixture {
  return {
    id: "intent-e2e-1",
    userId: "user-e2e",
    refCode: "SEOABC12",
    planCode: "pro",
    amountVnd: 99_000,
    vietqrUrl: "https://img.vietqr.io/test.png",
    status: "pending",
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    paidAt: null,
    ...over,
  };
}

/** Stub `POST /billing/payment-intents` (create) → returns the given intent. */
export async function mockCreateIntent(page: Page, intent: IntentFixture): Promise<void> {
  await page.route(INTENT_CREATE_RE, (route) =>
    route.request().method() === "POST" ? json(route, intent, 201) : route.fallback(),
  );
}

/** Stub `GET /billing/payment-intents/:id` (detail) → returns the given intent. */
export async function mockIntentDetail(page: Page, intent: IntentFixture): Promise<void> {
  await page.route(INTENT_DETAIL_RE, (route) => json(route, intent));
}
