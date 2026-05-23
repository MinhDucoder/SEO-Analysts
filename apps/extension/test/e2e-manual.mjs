/**
 * E2E manual probe: launch Chromium with the dev extension, drop the
 * seeded API key into chrome.storage.local, navigate to example.com,
 * trigger AUDIT_PAGE from the popup context (so the message lands on the
 * background SW the same way a real popup click would), capture the
 * reply + the SW console.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const extPath = resolve(here, '../.output/chrome-mv3-dev');
const apiKey = 'sk_test_gO8iTd-9DVJXTxTmN4wlfM_B_wKRnbthevdQGL2f16w';
const testUrl = 'https://example.com/';

function log(label, payload) {
  console.log(`\n--- ${label} ---`);
  console.log(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
}

const userDataDir = '/tmp/seo-ext-e2e-profile';

const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    '--no-first-run',
    '--no-default-browser-check',
  ],
});

// Capture SW console as soon as one spawns
ctx.on('serviceworker', (sw) => {
  log('SW spawned', sw.url());
  sw.on('console', (m) => console.log(`[sw:${m.type()}]`, m.text()));
});

// Wake the SW by opening a tab first (extension installs registers SW)
const wakerPage = await ctx.newPage();
await wakerPage.goto('about:blank');
await wakerPage.waitForTimeout(2000);

let sw = ctx.serviceWorkers()[0];
if (!sw) {
  log('No SW yet — waiting up to 30s', '');
  sw = await ctx.waitForEvent('serviceworker', { timeout: 30000 });
}
sw.on('console', (m) => console.log(`[sw:${m.type()}]`, m.text()));
log('SW URL', sw.url());

const extId = new URL(sw.url()).host;
log('Extension ID', extId);

await wakerPage.close();

// 1) Seed storage with API key
const seedRes = await sw.evaluate(async (key) => {
  await chrome.storage.local.set({ apiKey: key });
  const stored = await chrome.storage.local.get('apiKey');
  return stored;
}, apiKey);
log('Storage after seed', seedRes);

// 2) Navigate to example.com (so content script can inject)
const page = await ctx.newPage();
page.on('console', (m) => console.log(`[page:${m.type()}]`, m.text()));
await page.goto(testUrl, { waitUntil: 'load' });
log('Page title', await page.title());

// Give content-script registration + injection some time
await page.waitForTimeout(1500);

// 3) Trigger AUDIT_PAGE from the SW context (equivalent to popup msg)
const auditResult = await sw.evaluate(async () => {
  const reply = await chrome.runtime.sendMessage({
    type: 'AUDIT_PAGE',
    targetKeyword: 'example',
    language: 'en',
  });
  return reply;
});
log('AUDIT_PAGE reply', auditResult);

await ctx.close();
console.log('\nDone.');
