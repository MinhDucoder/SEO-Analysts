import { expect, test } from '@playwright/test';
import { uniqueUser } from '../helpers/unique-user';

async function createApiKeyViaApi(apiBase: string, accessToken: string) {
  const r = await fetch(`${apiBase}/users/me/api-keys`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name: 'playwright', environment: 'test' }),
  });
  if (!r.ok) throw new Error(`create key failed: ${r.status}`);
  return (await r.json()) as { plaintext: string };
}

test('playground: paste key + HTML + keyword → check returns score + issues', async ({ page, request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';
  const u = uniqueUser();
  const reg = await request.post(`${apiBase}/auth/register`, {
    data: { email: u.email, password: u.password, fullName: u.fullName },
  });
  const regJson = (await reg.json()) as { accessToken: string };
  const { plaintext } = await createApiKeyViaApi(apiBase, regJson.accessToken);

  await page.goto('/playground');
  await page.getByLabel('API key').fill(plaintext);

  // Switch to HTML tab
  await page.getByRole('tab', { name: /html/i }).click();

  // Fill editor (SSR fallback textarea — Monaco may need longer wait)
  const editor = page.locator('textarea, .monaco-editor').first();
  await editor.waitFor({ timeout: 10_000 });
  await page.keyboard.press('Tab');
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta) {
      const proto = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      proto?.set?.call(ta, '<html><title>Test SEO</title><body><h1>T</h1></body></html>');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await page.getByLabel('Target keyword').fill('seo');
  await page.getByLabel('Enrich mode').selectOption('template');
  await page.getByRole('button', { name: /^check$/i }).click();

  // Score card visible
  await expect(page.getByText(/\/\s*100/)).toBeVisible({ timeout: 15_000 });
});
