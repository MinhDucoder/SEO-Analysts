import { defineConfig } from 'wxt';

// Manifest V3 for Chrome / Edge. Firefox port (post-MVP) flips a few
// fields automatically via `wxt build -b firefox`.
export default defineConfig({
  manifest: ({ mode }) => ({
    name: 'SEO Analyst',
    description: 'On-page SEO audit + AI fix suggestions',
    version: '0.1.0',
    // `activeTab`: only granted when the user clicks the action — no
    //   background scraping. `storage`: required for the BYOK key.
    // `sidePanel`: Phase 4 detailed view (Chrome 114+).
    // We deliberately do NOT request `tabs`, `cookies`, or `<all_urls>`
    // host permissions — minimal surface helps with Web Store review
    // and limits the blast radius if the extension is ever compromised.
    permissions: ['activeTab', 'storage', 'sidePanel'],
    host_permissions:
      mode === 'production'
        ? ['https://api.seoanalyst.app/*']
        : ['https://api.seoanalyst.app/*', 'http://localhost:3000/*'],
    action: { default_popup: 'popup.html' },
    options_page: 'options.html',
    side_panel: { default_path: 'sidepanel.html' },
  }),
  modules: ['@wxt-dev/module-react'],
  runner: { startUrls: ['https://example.com'] },
  dev: { server: { port: 3030 } },
});
