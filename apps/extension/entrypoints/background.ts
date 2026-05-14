/**
 * MV3 service worker. Phase 1 scope: open the options page on demand
 * (e.g. when the popup requests it) and forward storage events.
 * Phase 2 will add the `AUDIT_PAGE` handler that actually calls
 * `POST /api/v1/public/check`.
 */
import { defineBackground } from 'wxt/utils/define-background';
import { loadApiKey } from '@/lib/storage';
import type { ExtensionMessage } from '@/lib/types';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((rawMsg, _sender, sendResponse) => {
    const msg = rawMsg as ExtensionMessage;
    void handleMessage(msg).then(sendResponse).catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      sendResponse({ ok: false, error: message });
    });
    return true; // keep the channel open for the async response
  });

  // Open options page when the user clicks the extension action but no
  // key has been saved yet. UX hint: surface the setup step at the first
  // sign of trouble rather than buried under a popup error.
  chrome.runtime.onInstalled.addListener(async () => {
    if (!(await loadApiKey())) {
      chrome.runtime.openOptionsPage();
    }
  });
});

async function handleMessage(
  msg: ExtensionMessage,
): Promise<{ ok: true } | { ok: false; error: string }> {
  switch (msg.type) {
    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      return { ok: true };
    case 'API_KEY_SAVED':
    case 'API_KEY_CLEARED':
      // Phase 2 will use this to invalidate the popup's cached state.
      return { ok: true };
    default:
      return { ok: false, error: `Unknown message: ${(msg as { type: string }).type}` };
  }
}
