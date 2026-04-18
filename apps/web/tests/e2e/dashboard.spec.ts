import { test, expect } from "@playwright/test";
import { stubDashboardRoutes } from "./helpers/dashboard";
import { loginViaForm } from "./helpers/auth";

/**
 * Dashboard shell smoke: login → /dashboard → assert bento widgets
 * render. Uses page.route() mocks for the full /auth/* + /audits surface
 * so the test runs without `docker:up`.
 */

test.describe("Dashboard shell", () => {
  test("login mock + /dashboard renders sidebar + header + widgets", async ({
    page,
  }) => {
    await stubDashboardRoutes(page);

    await loginViaForm(page, "e2e@example.com", "password123");
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Sidebar wordmark is only visible on lg+ (Playwright default
    // viewport is 1280×720 → lg breakpoint). Scope the match to the
    // heading role to avoid matching the sr-only dialog title in the
    // mobile-nav portal.
    await expect(
      page.getByRole("heading", { name: "SEO Analyst" }),
    ).toBeVisible();

    // Header page title.
    await expect(
      page.getByRole("heading", { name: /Tổng quan/i }),
    ).toBeVisible();

    // Primary CTA present.
    await expect(
      page.getByRole("link", { name: /Audit mới/i }),
    ).toBeVisible();

    // Widgets: stats grid label + recent-audits card + trend-chart.
    await expect(page.getByText(/Audit tháng này/i)).toBeVisible();
    await expect(page.getByText(/Audit gần đây/i)).toBeVisible();
    await expect(page.getByText(/Xu hướng điểm SEO/i)).toBeVisible();
  });

  test("dashboard sidebar links to /audits and /audits/new", async ({ page }) => {
    await stubDashboardRoutes(page);
    await loginViaForm(page, "e2e@example.com", "password123");
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    const sidebarAuditLink = page
      .getByRole("link", { name: /^Audit$/i })
      .first();
    await expect(sidebarAuditLink).toHaveAttribute("href", "/audits");

    const ctaAuditNew = page.getByRole("link", { name: /Audit mới/i });
    await expect(ctaAuditNew).toHaveAttribute("href", "/audits/new");
  });
});
