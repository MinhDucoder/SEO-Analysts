import { http, HttpResponse } from "msw";
import type { AuthSession, AuthenticatedUser } from "@/lib/api/types";

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

export const handlers = [...authHandlers];
