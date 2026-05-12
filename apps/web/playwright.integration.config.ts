import { defineConfig, devices } from "@playwright/test";

/**
 * Layer 4 integration config — real gateway + real DB.
 *
 * Distinct from `playwright.config.ts` (which is reserved for the L3
 * mock-based suite that lives under `tests/e2e/`). Always opt-in via
 * `PLAYWRIGHT_INTEGRATION=true`. See `tests/integration/README.md`.
 */
export default defineConfig({
  testDir: "./tests/integration",
  testMatch: /.*\.spec\.ts$/,

  // Serial across files: a few specs (lock toggle, rate-limit) mutate
  // shared state (user.is_locked, rate-limit counter) and would race.
  fullyParallel: false,
  workers: 1,

  timeout: 30_000,
  expect: { timeout: 5_000 },

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/integration" }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
