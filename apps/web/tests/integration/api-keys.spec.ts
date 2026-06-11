import { expect, test } from '@playwright/test';
import { uniqueUser } from '../helpers/unique-user';

test('api-keys: login → create → plaintext modal → list shows prefix → revoke', async ({ page, request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';
  const u = uniqueUser();
  await request.post(`${apiBase}/auth/register`, {
    data: { email: u.email, password: u.password, fullName: u.fullName },
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto('/settings/api-keys');
  await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible();
  await page.getByRole('button', { name: /\+ create key/i }).click();
  await page.getByLabel('Name').fill('Smoke key');
  await page.getByLabel('Environment').selectOption('test');
  await page.getByRole('button', { name: /^create$/i }).click();

  // Plaintext modal
  await expect(page.getByText(/Copy your new API key/i)).toBeVisible({ timeout: 10_000 });
  const plaintextBlock = page.locator('pre');
  const plaintext = (await plaintextBlock.textContent())?.trim();
  expect(plaintext).toMatch(/^sk_test_/);

  // Close plaintext modal
  await page.getByRole('button', { name: /i saved it/i }).click();

  // Row appears in list
  await expect(page.getByText('Smoke key')).toBeVisible();

  // Revoke (confirm dialog)
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /revoke/i }).first().click();
  await expect(page.getByText('revoked')).toBeVisible({ timeout: 10_000 });
});
