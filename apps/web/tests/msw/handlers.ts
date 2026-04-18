import { http, HttpResponse } from "msw";
import { AuditStatus } from "@repo/shared";
import type {
  AuditListItem,
  AuthSession,
  AuthenticatedUser,
  Paginated,
} from "@/lib/api/types";

/**
 * Default MSW handlers for gateway `/auth/*` endpoints. Tests can override
 * per-case via `server.use(http.post(...))` — last-registered handler wins.
 *
 * Base URL is read from `NEXT_PUBLIC_API_URL` at runtime. In vitest env
 * (jsdom) the var falls back to `http://localhost:3000/api/v1` per
 * apps/web/src/lib/constants.ts.
 */

const API = "http://localhost:3000/api/v1";

export const sampleUser: AuthenticatedUser = {
  id: "user-test-1",
  email: "test@example.com",
  fullName: "Test User",
  role: "user",
  emailVerified: true,
  createdAt: "2026-04-18T00:00:00.000Z",
};

export const sampleAdmin: AuthenticatedUser = {
  ...sampleUser,
  id: "user-admin-1",
  email: "admin@example.com",
  fullName: "Admin",
  role: "admin",
};

export const sampleAccessToken = "test-access-token";

const sampleSession: AuthSession = {
  user: sampleUser,
  accessToken: sampleAccessToken,
};

export const authHandlers = [
  http.post(`${API}/auth/register`, () => HttpResponse.json(sampleSession, { status: 201 })),
  http.post(`${API}/auth/login`, () => HttpResponse.json(sampleSession, { status: 200 })),
  http.post(`${API}/auth/refresh`, () =>
    HttpResponse.json({ accessToken: sampleAccessToken }, { status: 200 }),
  ),
  http.post(`${API}/auth/logout`, () => HttpResponse.json({ message: "ok" }, { status: 200 })),
  http.get(`${API}/auth/me`, () => HttpResponse.json(sampleUser, { status: 200 })),
  http.post(`${API}/auth/verify-email`, () =>
    HttpResponse.json({ message: "Verified" }, { status: 200 }),
  ),
  http.post(`${API}/auth/forgot-password`, () =>
    HttpResponse.json({ message: "Sent" }, { status: 200 }),
  ),
  http.post(`${API}/auth/reset-password`, () =>
    HttpResponse.json({ message: "Reset" }, { status: 200 }),
  ),
];

/**
 * Fixture audits for dashboard + list endpoints. Slug 3 uses `recent 5`
 * for the populated dashboard case; slug 4 will extend with filter
 * permutations. Tests override via `server.use(http.get(…))` for empty /
 * error cases.
 */
export function makeAudit(
  overrides: Partial<AuditListItem> & { id: string },
): AuditListItem {
  return {
    url: "https://example.com",
    domain: "example.com",
    status: AuditStatus.COMPLETED,
    seoScore: 75,
    targetKeyword: null,
    crawlerType: "cheerio",
    crawlDurationMs: 1500,
    createdAt: new Date("2026-04-15T10:00:00Z").toISOString(),
    completedAt: new Date("2026-04-15T10:05:00Z").toISOString(),
    ...overrides,
  };
}

export const sampleAudits: AuditListItem[] = [
  makeAudit({
    id: "aud-1",
    url: "https://example.com/alpha",
    seoScore: 82,
    createdAt: new Date("2026-04-18T09:00:00Z").toISOString(),
  }),
  makeAudit({
    id: "aud-2",
    url: "https://example.com/beta",
    seoScore: 71,
    createdAt: new Date("2026-04-17T14:00:00Z").toISOString(),
  }),
  makeAudit({
    id: "aud-3",
    url: "https://example.com/gamma",
    seoScore: 88,
    createdAt: new Date("2026-04-16T08:00:00Z").toISOString(),
  }),
  makeAudit({
    id: "aud-4",
    url: "https://example.com/delta",
    seoScore: 55,
    createdAt: new Date("2026-04-15T11:00:00Z").toISOString(),
  }),
  makeAudit({
    id: "aud-5",
    url: "https://example.com/epsilon",
    seoScore: 64,
    createdAt: new Date("2026-04-14T13:00:00Z").toISOString(),
  }),
];

export const sampleAuditsEmpty: Paginated<AuditListItem> = {
  data: [],
  total: 0,
  page: 1,
  limit: 30,
};

export const sampleAuditsResponse: Paginated<AuditListItem> = {
  data: sampleAudits,
  total: sampleAudits.length,
  page: 1,
  limit: 30,
};

export const auditsHandlers = [
  http.get(`${API}/audits`, () =>
    HttpResponse.json(sampleAuditsResponse, { status: 200 }),
  ),
];

export const handlers = [...authHandlers, ...auditsHandlers];
