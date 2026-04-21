import { test, expect } from "@playwright/test";

test.describe("landing page (web-bootstrap placeholder)", () => {
  test("renders the SEO Analyst wordmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /SEO Analyst/i })).toBeVisible();
  });

  test("renders the web-bootstrap badge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("web-bootstrap")).toBeVisible();
  });

  test("has Vietnamese html lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("vi");
  });

  test("exposes an SVG favicon in head", async ({ page }) => {
    await page.goto("/");
    const iconHref = await page.locator('link[rel="icon"]').first().getAttribute("href");
    expect(iconHref).toMatch(/favicon\.svg/);
  });
});
