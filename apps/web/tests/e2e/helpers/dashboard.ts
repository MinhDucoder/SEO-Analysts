import { type Page } from "@playwright/test";

/**
 * Playwright helper for dashboard e2e. Installs gateway mocks for auth +
 * audits so the test runs without `docker:up`.
 *
 * Call `stubDashboardRoutes(page)` BEFORE `page.goto("/login")` or
 * navigating to a dashboard-adjacent page.
 */
const API_PATTERN = "**/api/v1";

export async function stubDashboardRoutes(page: Page) {
  // Login → returns session so AuthBootstrap + login mutation hydrate.
  await page.route(`${API_PATTERN}/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "e2e-token",
        user: {
          id: "e2e-user",
          email: "e2e@example.com",
          fullName: "E2E User",
          role: "user",
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route(`${API_PATTERN}/auth/refresh`, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "No cookie" }),
    });
  });

  await page.route(`${API_PATTERN}/auth/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-user",
        email: "e2e@example.com",
        fullName: "E2E User",
        role: "user",
        emailVerified: true,
        createdAt: new Date().toISOString(),
      }),
    });
  });

  // Dashboard audits list — 3 completed audits so stats + trend render.
  await page.route(`${API_PATTERN}/audits**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "aud-e1",
            url: "https://example.com/alpha",
            domain: "example.com",
            status: "COMPLETED",
            seoScore: 82,
            targetKeyword: null,
            crawlerType: "cheerio",
            crawlDurationMs: 1500,
            createdAt: "2026-04-18T09:00:00Z",
            completedAt: "2026-04-18T09:05:00Z",
          },
          {
            id: "aud-e2",
            url: "https://example.com/beta",
            domain: "example.com",
            status: "COMPLETED",
            seoScore: 71,
            targetKeyword: null,
            crawlerType: "cheerio",
            crawlDurationMs: 1200,
            createdAt: "2026-04-17T14:00:00Z",
            completedAt: "2026-04-17T14:04:00Z",
          },
          {
            id: "aud-e3",
            url: "https://example.com/gamma",
            domain: "example.com",
            status: "COMPLETED",
            seoScore: 88,
            targetKeyword: null,
            crawlerType: "cheerio",
            crawlDurationMs: 1800,
            createdAt: "2026-04-16T08:00:00Z",
            completedAt: "2026-04-16T08:07:00Z",
          },
        ],
        total: 3,
        page: 1,
        limit: 30,
      }),
    });
  });
}
