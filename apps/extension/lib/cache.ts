/**
 * Per-device, 1-hour cache for `/public/check` results. Mirrors the
 * gateway's own response cache (PUBLIC_CHECK_LLM_SECONDS = 3600) but
 * lives on the user's machine — saves the network hop entirely when
 * they repeatedly audit the same URL+keyword within an hour.
 *
 * Storage shape:
 *   chrome.storage.local[`ax:${hash}`] = { savedAt: ms, result: ... }
 *
 * The cache is keyed by sha-1-ish of (url, keyword, language) — good
 * enough for collision avoidance at the per-user scale. Crypto-grade
 * hashing isn't worthwhile here; the cache is local-only and any
 * conflict simply means a one-extra-fetch user experience.
 */
import type { PublicCheckResponse } from './api-types';

export const AUDIT_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const KEY_PREFIX = 'ax:';

interface CacheEntry {
  savedAt: number;
  result: PublicCheckResponse;
}

/** Deterministic 32-bit hash. Same algorithm as cyrb53 (truncated)
 * — fast, no deps, no crypto. Two identical inputs produce the same
 * digest; small input changes produce avalanche. */
function fastHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
}

export function cacheKey(url: string, keyword: string, language: string): string {
  return KEY_PREFIX + fastHash(`${url}|${keyword.trim().toLowerCase()}|${language}`);
}

export async function readCache(key: string): Promise<PublicCheckResponse | null> {
  try {
    const out = (await chrome.storage.local.get(key)) as Record<string, unknown>;
    const entry = out[key] as CacheEntry | undefined;
    if (!entry) return null;
    if (Date.now() - entry.savedAt > AUDIT_CACHE_TTL_MS) {
      // Best-effort cleanup so stale entries don't pile up. Errors
      // here are non-fatal — the read still returns null.
      void chrome.storage.local.remove(key);
      return null;
    }
    return {
      ...entry.result,
      meta: { ...entry.result.meta, cached: true },
    };
  } catch {
    return null;
  }
}

export async function writeCache(
  key: string,
  result: PublicCheckResponse,
): Promise<void> {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), result };
    await chrome.storage.local.set({ [key]: entry });
  } catch {
    // Storage failures are non-fatal — the audit already succeeded;
    // just losing the cache means the next call will re-fetch.
  }
}
