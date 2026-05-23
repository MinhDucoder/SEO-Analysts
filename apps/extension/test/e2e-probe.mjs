/** Probe: just open chrome://extensions/ to see if extension loaded. */
import { chromium } from 'playwright';
const extPath = '/Users/minhducoder/SEO-Analysts/apps/extension/.output/chrome-mv3-dev';

const ctx = await chromium.launchPersistentContext('/tmp/seo-ext-probe-profile', {
  headless: false,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    '--no-first-run',
  ],
});

const page = await ctx.newPage();
await page.goto('chrome://extensions/');
await page.waitForTimeout(3000);

// Toggle developer mode + read extension list via JS in chrome://extensions
const info = await page.evaluate(() => {
  const mgr = document.querySelector('extensions-manager');
  const itemList = mgr?.shadowRoot?.querySelector('extensions-item-list');
  const items = itemList?.shadowRoot?.querySelectorAll('extensions-item') || [];
  return Array.from(items).map((it) => {
    const card = it.shadowRoot;
    return {
      name: card?.querySelector('#name')?.textContent?.trim(),
      id: it.id,
      enabled: card?.querySelector('#enableToggle')?.checked,
      errorsBtn: !!card?.querySelector('#errors-button'),
      warningText: card?.querySelector('#a11yAssociation')?.textContent?.trim(),
    };
  });
});
console.log('--- chrome://extensions snapshot ---');
console.log(JSON.stringify(info, null, 2));

console.log('--- service workers ---');
console.log(ctx.serviceWorkers().map((sw) => sw.url()));

console.log('--- background pages ---');
console.log(ctx.backgroundPages().map((p) => p.url()));

await page.waitForTimeout(15000);
await ctx.close();
