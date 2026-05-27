import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Pay the reused server's cold-start cost once, up front (see global-setup).
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry too: the VS Code extension can respawn the :3001 server
  // mid-suite, and the first hit on a cold `next start` route is slow. The
  // retry runs against an already-warmed server.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  // Web-first assertions wait up to 10s — generous enough that a momentarily
  // loaded/cold server doesn't fail an otherwise-correct assertion.
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    navigationTimeout: 30_000,
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
