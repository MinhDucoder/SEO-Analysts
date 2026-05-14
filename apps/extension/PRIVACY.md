# SEO Analyst — Privacy Policy

**Effective date:** 2026-05-15
**Contact:** support@seoanalyst.app

This extension audits the SEO of the page you are currently viewing.
It is a thin client over the SEO Analyst public API — all rules and
AI suggestions run server-side. The extension itself does not phone
home, run analytics, or share data with third parties.

## What data the extension collects

| Data | Where it goes | Why |
|---|---|---|
| The URL of the active tab | Sent to the SEO Analyst gateway (`https://api.seoanalyst.app`) when you click the action | The gateway fetches the page server-side to score it |
| Or: the serialized DOM of the active tab (HTML mode) | Sent to the gateway only when the page is gated behind auth (e.g. CMS draft) and only when you click the action | Some pages the gateway cannot fetch, so the extension scrapes them locally before sending |
| The target keyword you type in | Sent to the gateway as part of the audit request | The audit needs a keyword to rank against |
| Your API key (`sk_live_...` or `sk_test_...`) | Stored in `chrome.storage.local` on this device only. Sent to the gateway as a Bearer token on every audit request | The gateway uses the key for authentication and rate-limiting |

The extension does **not** collect or transmit:

- Browsing history
- Cookies (it does not request the `cookies` permission)
- Form input outside of the keyword field
- Personally identifiable information beyond what is in the URL or
  visible DOM of the page you choose to audit
- Behavioural telemetry of any kind

## When data is sent

Data is only sent to the gateway when **you click the extension
icon** and trigger an audit. There is no passive scraping, no
background polling, no auto-audit on page load.

## Storage location

| Data | Storage | Synced across devices? |
|---|---|---|
| API key | `chrome.storage.local` (this device only) | No — we explicitly do not use `chrome.storage.sync` |
| Audit history (last 20 audits) | `chrome.storage.local` (this device only) | No |
| UI language preference | `chrome.storage.local` (this device only) | No |
| Theme preference | `chrome.storage.local` (this device only) | No |

`chrome.storage.local` is scoped to this extension's ID. Other
extensions you have installed cannot read it. Content scripts inside
this extension also cannot read it — only the service worker and the
extension's own popup/options/sidepanel pages have access.

## What the gateway does with the data

The gateway (operated by SEO Analyst) processes audit requests as
documented at <https://api.seoanalyst.app/docs>:

- HTTPS only. TLS terminates at the gateway.
- The audit response is cached on the server for up to 24 hours
  against a hash of the content, keyword, language, and rule
  version. The hash is one-way; the original content is not stored
  after the cache entry expires.
- LLM-based suggestions, when requested, go through the configured
  AI provider (Anthropic). The provider's privacy policy applies
  to that hop; the gateway does not retain the prompt or response
  beyond the cache window.
- Rate-limit counters track API key ID and IP address for abuse
  prevention. These counters reset on a sliding 24-hour window.

No third-party analytics or telemetry services are connected to
the gateway.

## Permissions explained

The extension requests the minimum permissions needed:

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's URL and DOM **only when you click the extension** — never passively |
| `storage` | Save your API key + audit history + preferences locally |
| `sidePanel` | Render the larger side-panel view (Chrome 114+) |
| `host_permissions: https://api.seoanalyst.app/*` | Send audit requests to the gateway |

Not requested: `tabs`, `cookies`, `webNavigation`, `<all_urls>`.

## Your rights

- **Forget your key:** Open the extension's settings and click
  "Forget this key". This removes it from local storage. To revoke
  it on the server, go to the web app's `/settings/api-keys`.
- **Clear history:** Open the side panel and click "Clear history",
  or call `chrome.storage.local.clear()` from the extension's
  context. This wipes all locally-stored audit data.
- **Uninstall:** Removing the extension also removes everything in
  `chrome.storage.local` for this extension. Server-side data is
  unaffected; see the web app to delete your account.

## Changes to this policy

Material changes will bump the extension version and be noted in
`apps/extension/CHANGELOG.md` (mirrored to the Chrome Web Store
release notes).
