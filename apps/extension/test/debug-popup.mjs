/** Load extension, open popup.html, capture all console + page errors. */
import { chromium } from 'playwright';

const extPath = '/Users/minhducoder/SEO-Analysts/apps/extension/.output/chrome-mv3';

const ctx = await chromium.launchPersistentContext('/tmp/seo-debug-profile', {
  headless: false,
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    '--no-first-run',
  ],
});

// Wake the SW (extensions register their SW on browser start)
const wakerPage = await ctx.newPage();
await wakerPage.goto('about:blank');
await wakerPage.waitForTimeout(3000);

console.log('--- contexts ---');
console.log('service workers:', ctx.serviceWorkers().map((sw) => sw.url()));
console.log('background pages:', ctx.backgroundPages().map((p) => p.url()));

let sw = ctx.serviceWorkers()[0];
if (!sw) {
  console.log('no SW — extension not loaded properly');
  await ctx.close();
  process.exit(1);
}

const extId = new URL(sw.url()).host;
console.log('extension ID:', extId);

// Open popup.html directly
const popup = await ctx.newPage();
popup.on('console', (m) => console.log(`[popup:${m.type()}]`, m.text()));
popup.on('pageerror', (e) => console.log('[popup:pageerror]', e.message, e.stack));
popup.on('requestfailed', (r) =>
  console.log('[popup:reqfail]', r.url(), r.failure()?.errorText),
);

await popup.goto(`chrome-extension://${extId}/popup.html`);
await popup.waitForTimeout(3000);

const html = await popup.evaluate(() => ({
  bodyHTML: document.body.innerHTML.slice(0, 500),
  rootChildren: document.getElementById('root')?.children.length,
  rootHTML: document.getElementById('root')?.innerHTML?.slice(0, 500),
  bodyWidth: document.body.getBoundingClientRect().width,
  bodyHeight: document.body.getBoundingClientRect().height,
}));
console.log('--- popup DOM state ---');
console.log(JSON.stringify(html, null, 2));

await popup.waitForTimeout(15000);
await ctx.close();
