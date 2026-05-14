/**
 * Content script — responds to EXTRACT_FOR_CHECK from the service
 * worker. Two modes:
 *   - `needHtml=false` (probe): return URL + auth-gated flag so the
 *     background can decide URL vs HTML mode without paying the cost
 *     of full DOM serialization.
 *   - `needHtml=true`: serialise the DOM (script/style/hidden stripped,
 *     200 KB cap) and return it. Errors surface as `{ error }`.
 *
 * `activeTab` permission gates this — the content script only runs in
 * pages the user has explicitly invoked the extension on, never
 * passively across all sites.
 */
import { defineContentScript } from 'wxt/utils/define-content-script';
import { shouldUseHtmlMode, serializeMinimalHtml } from '@/lib/scraper';
import type { ContentScrapeProbe, ExtensionMessage } from '@/lib/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    chrome.runtime.onMessage.addListener((rawMsg, _sender, sendResponse) => {
      const msg = rawMsg as ExtensionMessage;
      if (msg.type !== 'EXTRACT_FOR_CHECK') return false;
      try {
        const probe: ContentScrapeProbe = {
          url: window.location.href,
          isAuthGated: shouldUseHtmlMode(window.location.href),
        };
        if (msg.needHtml) {
          probe.html = serializeMinimalHtml(document);
        }
        sendResponse({ ok: true, probe });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      return true; // keep the channel open for the async response
    });
  },
});
