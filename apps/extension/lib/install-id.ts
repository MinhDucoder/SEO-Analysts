/**
 * Per-install UUID v4 that pairs with the API key on the gateway.
 * Sent as the `X-Install-Id` header on every /public/check request.
 *
 * The gateway records the first install_id that uses each key. Subsequent
 * calls with a different install_id are rejected with KEY_INSTALL_MISMATCH.
 * This is what makes "copy my key to my friend" not work — the friend's
 * extension generates a different install_id at install time.
 *
 * Lifecycle:
 *   - Generated lazily on first call to `ensureInstallId()` (typically
 *     from background.ts in `onInstalled`).
 *   - Persists in `chrome.storage.local` (extension-scoped, never synced).
 *   - Cleared only when the user uninstalls or manually wipes storage.
 *   - On UUID-format drift, regenerates.
 */
const STORAGE_KEY = 'installId';
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInstallId(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_REGEX.test(value);
}

export async function loadInstallId(): Promise<string | null> {
  const out = (await chrome.storage.local.get(STORAGE_KEY)) as Record<string, unknown>;
  return isValidInstallId(out[STORAGE_KEY]) ? out[STORAGE_KEY] : null;
}

export async function ensureInstallId(): Promise<string> {
  const existing = await loadInstallId();
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
  return fresh;
}
