# Recipe — MSW Node setupServer

Intercept fetch ở node layer (jsdom) cho Vitest unit tests. Shape handler gần prod để tests không bị bất ngờ khi thay response shape.

## File 1: `apps/web/tests/msw/handlers.ts`

```ts
import { http, HttpResponse } from "msw";
import type { AuthSession, AuthenticatedUser } from "@/lib/api/types";

/**
 * Default MSW handlers cho gateway `/<scope>/*`. Tests override per-case
 * via `server.use(http.post(...))` — last-registered handler wins.
 *
 * Base URL đọc từ NEXT_PUBLIC_API_URL. Trong vitest (jsdom) fallback
 * 'http://localhost:3000/api/v1' per apps/web/src/lib/constants.ts.
 */
const API = "http://localhost:3000/api/v1";

// Fixtures — export tất cả để tests reuse
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

// Scope-specific handler arrays — compose vào `handlers` cuối file
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

// TODO slug N: thêm <scope>Handlers khi wire slug tiếp theo
// export const auditsHandlers = [...]
// export const reportsHandlers = [...]

export const handlers = [...authHandlers];
```

## File 2: `apps/web/tests/msw/server.ts`

```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

## Convention mở rộng per-slug

**Option A — Add to default handlers** (recommended cho endpoints ổn định):

```ts
// tests/msw/handlers.ts
export const auditsHandlers = [
  http.get(`${API}/audits`, () => HttpResponse.json({ items: [] })),
  http.post(`${API}/audits`, () => HttpResponse.json({ id: "audit-1" }, { status: 201 })),
];

export const handlers = [...authHandlers, ...auditsHandlers];
```

**Option B — Per-test override** (recommended cho edge cases):

```ts
// tests/unit/feature.test.tsx
import { server } from "@/../tests/msw/server";
import { http, HttpResponse } from "msw";

it("handles 401 gracefully", async () => {
  server.use(
    http.post("http://localhost:3000/api/v1/auth/login", () =>
      HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
    ),
  );
  // ... test body
});
```

`server.resetHandlers()` trong `afterEach` đảm bảo override không leak sang test khác.

## Checklist khi seed handlers

- [ ] Base URL match với `NEXT_PUBLIC_API_URL` default (check `apps/web/src/lib/constants.ts`).
- [ ] Mọi endpoint slug vừa build có handler default 2xx.
- [ ] Fixtures (`sampleUser`, `sampleAdmin`, tokens) export để tests reuse.
- [ ] TypeScript import types từ `@/lib/api/types` — không `any`.
- [ ] Handler body shape match response thật của gateway (check backend DTOs).