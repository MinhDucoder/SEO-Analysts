# Recipe — Playwright Integration Config

Config variant riêng cho L4. Tách khỏi `playwright.config.ts` (L3) để không ảnh hưởng dev loop.

## File: `apps/web/playwright.integration.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config cho L4 integration — hit real gateway + real DB.
 *
 * Differences vs playwright.config.ts (L3):
 *  - testDir chỉ trỏ vào tests/integration/
 *  - fullyParallel: false (serial — tránh DB race)
 *  - timeout 30s (gateway round-trip chậm hơn mock)
 *  - retries: 1 local, 2 CI (docker flake protection)
 *  - globalSetup/Teardown seed + cleanup
 *  - webServer KHÔNG auto-start docker — yêu cầu dev chạy `npm run docker:up` trước
 */
export default defineConfig({
  testDir: "./tests/integration",
  fullyParallel: false,          // serial — shared DB state
  workers: 1,                     // 1 worker để tránh concurrent DB writes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  timeout: 30_000,                // 30s per test — real docker slower
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-integration-report", open: "never" }],
  ],
  globalSetup: require.resolve("./tests/integration/fixtures/seed-users.ts"),
  globalTeardown: require.resolve("./tests/integration/fixtures/cleanup.ts"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",   // giữ trace cho tests fail, dễ debug
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    extraHTTPHeaders: {
      "X-Integration-Test": "true",  // gateway có thể bypass 1 số rate limits nếu setup
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev --workspace=@seo/web",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3000/api/v1",
    },
  },
});
```

## Env var guard — opt-in only

`package.json`:

```json
{
  "scripts": {
    "test:integration": "PLAYWRIGHT_INTEGRATION=true playwright test --config=playwright.integration.config.ts",
    "test:integration:headed": "PLAYWRIGHT_INTEGRATION=true playwright test --config=playwright.integration.config.ts --headed",
    "test:integration:debug": "PLAYWRIGHT_INTEGRATION=true playwright test --config=playwright.integration.config.ts --debug"
  }
}
```

Thêm check vào `globalSetup`:

```ts
// seed-users.ts — thêm đầu file
if (process.env.PLAYWRIGHT_INTEGRATION !== "true") {
  throw new Error(
    "Integration tests require PLAYWRIGHT_INTEGRATION=true. " +
    "Run `npm run test:integration` instead.",
  );
}
```

→ Prevents accidental run với normal `playwright test`.

## Preflight check script

`apps/web/tests/integration/fixtures/preflight.ts`:

```ts
import { execSync } from "child_process";

export function preflight(): void {
  // 1. Docker services up?
  try {
    execSync("docker compose ps --services --filter 'status=running'", {
      encoding: "utf-8",
      stdio: "pipe",
    });
  } catch {
    throw new Error(
      "Docker services not running. Run `npm run docker:up` first.",
    );
  }

  // 2. Gateway health?
  try {
    execSync("curl -fs http://localhost:3000/api/v1/health", {
      stdio: "pipe",
    });
  } catch {
    throw new Error(
      "Gateway not healthy at http://localhost:3000/api/v1/health. " +
      "Check `docker compose logs gateway`.",
    );
  }
}
```

Gọi ở top của `seed-users.ts`:

```ts
import { preflight } from "./preflight";

export default async function globalSetup() {
  preflight();
  await seedUsers();
}
```

## Anti-patterns

- ❌ `fullyParallel: true` → DB race → flaky → blame-shifting.
- ❌ Workers > 1 → concurrent seed/cleanup → data corruption.
- ❌ Không có timeout explicit → test hang 120s khi gateway down → CI timeout kill everything.
- ❌ `trace: "on"` → tốn disk + slow mỗi run.
- ❌ `webServer.command: "npm run docker:up && npm run dev"` → gộp docker vào webServer → slow start + hard to kill.

## Checklist

- [ ] `testDir: "./tests/integration"` — tách khỏi L3.
- [ ] `fullyParallel: false` + `workers: 1`.
- [ ] `timeout: 30_000` tối thiểu.
- [ ] `globalSetup` + `globalTeardown` reference seed/cleanup.
- [ ] `PLAYWRIGHT_INTEGRATION=true` guard trong globalSetup.
- [ ] Script `test:integration` trong package.json.
- [ ] Preflight check gateway health trước test run.
