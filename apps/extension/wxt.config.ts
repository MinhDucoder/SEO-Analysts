import { defineConfig } from 'wxt';

// Manifest V3 for Chrome / Edge. Firefox port (post-MVP) flips a few
// fields automatically via `wxt build -b firefox`.
export default defineConfig({
  manifest: { 
    name: 'SEO Analyst',
    description: 'On-page SEO audit + AI fix suggestions',
    version: '0.1.0',
    // `activeTab`: only granted when the user clicks the action — no
    //   background scraping. `storage`: required for the BYOK key.
    // We deliberately do NOT request `tabs`, `cookies`, or `<all_urls>`
    // host permissions — minimal surface helps with Web Store review
    // and limits the blast radius if the extension is ever compromised.
    permissions: ['activeTab', 'storage'],
    host_permissions: [
      'https://api.seoanalyst.app/*',
      'http://localhost:3000/*',
      'http://localhost:3010/*',
    ],
    action: { default_popup: 'popup.html' },
    options_page: 'options.html',
  },
  modules: ['@wxt-dev/module-react'],
  runner: { startUrls: ['https://example.com'] },
  // Pin the WXT dev server off :3000 so the whole stack runs together via
  // `npm run dev`. Gateway owns :3000 (the extension calls its API there),
  // web owns :3001 — WXT's HMR server lives on :3002. `origin` must track the
  // port or the injected HMR client would dial :3000 (the gateway) instead.
  dev: {
    server: { port: 3002, origin: 'http://localhost:3002' },
  },
});
