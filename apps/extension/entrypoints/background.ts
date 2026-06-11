/**
 * MV3 service worker. Owns the audit pipeline:
 *
 *   popup → AUDIT_PAGE → background
 *     1. loadApiKey() — bail with MISSING_API_KEY + open options if absent
 *     2. ask content script for URL probe (cheap)
 *     3. pick mode (URL by default; HTML if auth-gated)
 *     4. if HTML: ask content script for serialised DOM
 *     5. POST /public/check via client.check
 *     6. return parsed PublicCheckResponse OR { error: PublicApiError shape }
 *
 * On any auth error (`OPEN_OPTIONS` action) the worker also opens the
 * options page so the user lands where they need to be without an
 * extra click.
 */
import { defineBackground } from 'wxt/utils/define-background';
import { loadApiKey } from '@/lib/storage';
import { check } from '@/lib/client';
import { PublicApiError } from '@/lib/errors';
import { API_BASE_URL } from '@/lib/api-base';
import { ensureInstallId } from '@/lib/install-id';
import { cacheKey, readCache, writeCache } from '@/lib/cache';
import type {
  ContentScrapeProbe,
  ExtensionMessage,
  PublicApiLanguage,
} from '@/lib/types';
import type {
  PublicCheckInput,
  PublicCheckResponse,
} from '@/lib/api-types';

export type AuditOk = { ok: true; result: PublicCheckResponse };
export type AuditErr = {
  ok: false;
  code: string;
  message: string;
  status: number;
  requestId?: string;
  retryAfterSeconds?: number;
};
export type AuditReply = AuditOk | AuditErr;

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((rawMsg, _sender, sendResponse) => {
    const msg = rawMsg as ExtensionMessage;
    void handleMessage(msg)
      .then(sendResponse)
      .catch((e: unknown) => {
        sendResponse({
          ok: false,
          code: 'CLIENT_UNKNOWN',
          message: e instanceof Error ? e.message : String(e),
          status: 0,
        } satisfies AuditErr);
      });
    return true; // keep the channel open
  });

  chrome.runtime.onInstalled.addListener(async () => {
    await ensureInstallId();
    if (!(await loadApiKey())) chrome.runtime.openOptionsPage();
  });
});

async function handleMessage(msg: ExtensionMessage): Promise<unknown> {
  switch (msg.type) {
    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      return { ok: true };
    case 'API_KEY_SAVED':
    case 'API_KEY_CLEARED':
      return { ok: true };
    case 'AUDIT_PAGE':
      return await runAudit(msg);
    default:
      return {
        ok: false,
        code: 'CLIENT_UNKNOWN',
        message: `Unhandled message: ${(msg as { type: string }).type}`,
        status: 0,
      } satisfies AuditErr;
  }
}

async function runAudit(msg: {
  targetKeyword: string;
  language?: PublicApiLanguage;
  secondaryKeywords?: string[];
}): Promise<AuditReply> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    chrome.runtime.openOptionsPage();
    return {
      ok: false,
      code: 'MISSING_API_KEY',
      message: 'Set up an API key in the extension options to enable audits.',
      status: 401,
    };
  }
  if (!msg.targetKeyword || msg.targetKeyword.trim().length === 0) {
    return {
      ok: false,
      code: 'MISSING_TARGET_KEYWORD',
      message: 'Enter a target keyword before running an audit.',
      status: 422,
    };
  }

  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) {
    return {
      ok: false,
      code: 'CLIENT_UNKNOWN',
      message: 'No active tab — try clicking the extension from a regular page.',
      status: 0,
    };
  }

  let probe: ContentScrapeProbe;
  try {
    probe = await askContent(tab.id, { type: 'EXTRACT_FOR_CHECK', needHtml: false });
  } catch (e) {
    return {
      ok: false,
      code: 'CLIENT_UNKNOWN',
      message:
        e instanceof Error
          ? `Cannot probe page (${e.message}). Reload the tab and try again.`
          : 'Cannot probe page.',
      status: 0,
    };
  }

  const language = msg.language ?? 'vi';
  const keyword = msg.targetKeyword.trim();

  // Local 1h cache (URL mode only). HTML mode varies with the live
  // DOM, so caching could surface stale results after the user edits
  // a draft — defeats the point of the extension on a CMS page.
  if (!probe.isAuthGated) {
    const ck = cacheKey(probe.url, keyword, language);
    const cached = await readCache(ck);
    if (cached) return { ok: true, result: cached };
  }

  let input: PublicCheckInput;
  if (probe.isAuthGated) {
    const full = await tryFetchHtml(tab.id);
    if (!full.ok) return full.err;
    input = { type: 'html', html: full.html };
  } else {
    input = { type: 'url', url: probe.url };
  }

  const callApi = async (body: PublicCheckInput): Promise<PublicCheckResponse> => {
    const installId = await ensureInstallId();
    return check({
      apiKey,
      installId,
      baseUrl: API_BASE_URL,
      body: {
        input: body,
        targetKeyword: keyword,
        secondaryKeywords: msg.secondaryKeywords,
        options: { enrichMode: 'llm', language },
      },
    });
  };

  try {
    const result = await callApi(input);
    if (input.type === 'url') {
      void writeCache(cacheKey(probe.url, keyword, language), result);
    }
    return { ok: true, result };
  } catch (e) {
    // Auto-fallback URL→HTML: gateway-reported fetch failures
    // (URL_FETCH_FAILED / URL_FETCH_TIMEOUT) are most often caused by
    // the page requiring auth, geo-restriction, or being behind a
    // CDN that blocks the gateway UA. Re-extract via the content
    // script and retry once in HTML mode before surfacing the error.
    if (
      e instanceof PublicApiError &&
      input.type === 'url' &&
      (e.code === 'URL_FETCH_FAILED' || e.code === 'URL_FETCH_TIMEOUT')
    ) {
      const full = await tryFetchHtml(tab.id);
      if (full.ok) {
        try {
          const result = await callApi({ type: 'html', html: full.html });
          // Not cached: we only cache URL-mode results.
          return { ok: true, result };
        } catch (e2) {
          return mapAuditError(e2);
        }
      }
      // HTML extraction itself failed — fall through to the original
      // gateway error so the popup explains the actual cause.
    }
    return mapAuditError(e);
  }
}

function mapAuditError(e: unknown): AuditErr {
  if (e instanceof PublicApiError) {
    if (e.action === 'OPEN_OPTIONS') chrome.runtime.openOptionsPage();
    return {
      ok: false,
      code: e.code,
      message: e.message,
      status: e.status,
      requestId: e.requestId,
      retryAfterSeconds: e.retryAfterSeconds,
    };
  }
  return {
    ok: false,
    code: 'CLIENT_UNKNOWN',
    message: e instanceof Error ? e.message : String(e),
    status: 0,
  };
}

async function tryFetchHtml(
  tabId: number,
): Promise<{ ok: true; html: string } | { ok: false; err: AuditErr }> {
  let full: ContentScrapeProbe;
  try {
    full = await askContent(tabId, { type: 'EXTRACT_FOR_CHECK', needHtml: true });
  } catch (e) {
    return {
      ok: false,
      err: {
        ok: false,
        code: 'CLIENT_PAYLOAD_TOO_LARGE',
        message: e instanceof Error ? e.message : 'HTML payload exceeds the 200KB cap.',
        status: 0,
      },
    };
  }
  if (!full.html) {
    return {
      ok: false,
      err: {
        ok: false,
        code: 'CLIENT_UNKNOWN',
        message: 'Content script returned no HTML.',
        status: 0,
      },
    };
  }
  return { ok: true, html: full.html };
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function askContent(
  tabId: number,
  msg: ExtensionMessage,
): Promise<ContentScrapeProbe> {
  const reply = (await chrome.tabs.sendMessage(tabId, msg)) as
    | { ok: true; probe: ContentScrapeProbe }
    | { ok: false; error: string };
  if (!reply) throw new Error('No reply from content script');
  if ('ok' in reply && reply.ok) return reply.probe;
  throw new Error('error' in reply ? reply.error : 'Unknown content-script error');
}
