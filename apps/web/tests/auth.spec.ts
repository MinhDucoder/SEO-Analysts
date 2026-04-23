import { expect, test } from '@playwright/test';
import { uniqueUser } from './helpers/unique-user';

test('register → lands on dashboard → logout returns to login', async ({ page }) => {
  const u = uniqueUser();

  await page.goto('/register');
  await page.getByLabel('Full name').fill(u.fullName);
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: /register/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText('Playground')).toBeVisible();
  await expect(page.getByText('API keys')).toBeVisible();

  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('login with existing account lands on dashboard', async ({ page, request }) => {
  const u = uniqueUser();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';
  const resp = await request.post(`${apiBase}/auth/register`, {
    data: { email: u.email, password: u.password, fullName: u.fullName },
  });
  expect(resp.ok()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText(u.email)).toBeVisible();
});
