/**
 * Content script — Phase 1 stub. Phase 2 will fill out
 *   - URL vs HTML mode probe (`type: 'EXTRACT_FOR_CHECK'`)
 *   - HTML serialization with script/style/hidden stripping (cap 200KB)
 * For now, the stub exists so the WXT build emits a content_scripts
 * entry and the manifest stays stable.
 */
import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // Intentionally empty in Phase 1. Phase 2 will register the
    // chrome.runtime.onMessage listener that responds to
    // EXTRACT_FOR_CHECK from the service worker.
  },
});
