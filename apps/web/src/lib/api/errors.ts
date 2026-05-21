import { HTTPError } from "ky";

/**
 * Statuses whose UX is already owned by a global handler, so a page-level
 * `toast.error(...)` would be redundant noise stacked on top of a modal:
 *   401 → silent refresh / redirect to login (AuthGuard)
 *   403 → AccountLocked modal · feature-not-available dialog · throttle modal
 *   429 → RateLimit modal · quota / upgrade dialog
 * See `lib/api/client.ts` interceptors for the source of these.
 */
const MODAL_HANDLED_STATUSES = new Set([401, 403, 429]);

/**
 * True when the error is an HTTP error already surfaced by a global modal or
 * auth flow. Callers use this to skip a duplicate toast.
 */
export function isHandledByModal(err: unknown): boolean {
  if (err instanceof HTTPError) {
    return MODAL_HANDLED_STATUSES.has(err.response?.status);
  }
  return false;
}

/**
 * A user-safe message for a toast.
 *
 * ky's `HTTPError.message` is the raw `"Request failed with status code N: ..."`
 * (English, leaks the internal URL) — never show it. For HTTP errors we fall
 * back to the caller-supplied context message; for plain `Error`s we trust
 * their (typically already-localised) message; otherwise the fallback.
 */
export function getFriendlyMessage(err: unknown, fallback: string): string {
  if (err instanceof HTTPError) return fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
