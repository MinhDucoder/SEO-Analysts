/**
 * Wrapper around `chrome.storage.local` for the BYOK API key.
 *
 * Storage rationale (see docs/superpowers/specs/2026-04-29-chrome-ext-design.md
 * § 6.3): the API key is stored plaintext. Chrome scopes
 * `chrome.storage.local` to the extension ID — content scripts can't read
 * it, sibling extensions can't read it, and `crypto.subtle`-based
 * "encryption" would have to persist its own key on the same disk anyway,
 * so it adds no real defense. The key user is the operator of their own
 * machine; if their device is compromised, encryption here doesn't help.
 *
 * What we DO defend:
 *   - Format-validate on save so a typo (`live_...`, `pk_live_...`) is
 *     surfaced immediately instead of returning 401 on first audit.
 *   - Never sync (use `local`, not `sync`) — `sync` would push the key
 *     across the user's Google account into other browser profiles.
 */
const STORAGE_KEY = 'apiKey';

/**
 * Validates the format that gateway's ApiKeyService emits:
 *   `sk_live_<43 chars>` or `sk_test_<43 chars>` where the 43 chars are
 *   base64url alphabet (A-Z a-z 0-9 _ -).
 *
 * The exact entropy budget is set on the gateway side and reflected here
 * as the strictest pattern that matches the issued keys. Bumping the key
 * length on the gateway requires updating this regex (and ideally moving
 * the pattern into `@repo/shared` so both ends stay in sync).
 */
const API_KEY_PATTERN = /^sk_(live|test)_[A-Za-z0-9_-]{43}$/;

export function isValidApiKeyFormat(value: string): boolean {
  return API_KEY_PATTERN.test(value);
}

export function parseApiKeyEnvironment(value: string): 'live' | 'test' | null {
  const m = /^sk_(live|test)_/.exec(value);
  return (m?.[1] as 'live' | 'test' | undefined) ?? null;
}

export async function saveApiKey(plaintext: string): Promise<void> {
  if (!isValidApiKeyFormat(plaintext)) {
    throw new Error(
      'Invalid API key format — expected sk_live_... or sk_test_... (43 chars suffix)',
    );
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: plaintext });
}

export async function loadApiKey(): Promise<string | null> {
  const out = (await chrome.storage.local.get(STORAGE_KEY)) as Record<string, unknown>;
  const v = out[STORAGE_KEY];
  return typeof v === 'string' ? v : null;
}

export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
