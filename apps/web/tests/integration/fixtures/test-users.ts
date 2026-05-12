/**
 * Test user credentials seeded by the gateway docker entrypoint.
 * Password is the same for every user per docker seed convention.
 *
 * Mirror of BACKEND-API.md §test-users. If the gateway seed ever
 * changes, update this file in tandem.
 */
export const TEST_PASSWORD = "Admin1234!";

export const testUsers = {
  admin: {
    email: "admin@test.seo.local",
    password: TEST_PASSWORD,
    role: "admin" as const,
  },
  regularWithAudits: {
    email: "duc@test.seo.local",
    password: TEST_PASSWORD,
    role: "user" as const,
    expectedAuditCount: 10,
  },
  regularLight: {
    email: "linh@test.seo.local",
    password: TEST_PASSWORD,
    role: "user" as const,
    expectedAuditCount: 2,
  },
  emptyUser: {
    email: "nam@test.seo.local",
    password: TEST_PASSWORD,
    role: "user" as const,
    expectedAuditCount: 0,
  },
  unverified: {
    email: "unverified@test.seo.local",
    password: TEST_PASSWORD,
    role: "user" as const,
  },
  locked: {
    email: "locked@test.seo.local",
    password: TEST_PASSWORD,
    role: "user" as const,
  },
} as const;

/**
 * Trailing slash matters — Playwright's `request.newContext({ baseURL })`
 * follows the WHATWG URL spec, so a path that starts with `/` discards
 * the existing path on the base. Keeping the slash here lets specs pass
 * relative paths (e.g. `"auth/login"`) and end up at
 * `http://localhost:3000/api/v1/auth/login`.
 */
export const GATEWAY_BASE = "http://localhost:3000/api/v1/";
export const FRONTEND_BASE = "http://localhost:3001";
