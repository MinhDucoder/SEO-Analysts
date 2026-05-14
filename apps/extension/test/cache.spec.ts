/**
 * Tests the audit-result cache that mirrors what gateway does
 * server-side, only at the per-device layer with a 1h TTL.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cacheKey,
  readCache,
  writeCache,
  AUDIT_CACHE_TTL_MS,
} from '../lib/cache';
import type { PublicCheckResponse } from '../lib/api-types';

function stubChromeStorage(): { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  const chrome = {
    storage: {
      local: {
        get: vi.fn(async (keys: string | string[] | null) => {
          if (typeof keys === 'string') {
            return store.has(keys) ? { [keys]: store.get(keys) } : {};
          }
          return Object.fromEntries(store.entries());
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(items)) store.set(k, v);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          for (const k of arr) store.delete(k);
        }),
      },
    },
  };
  (globalThis as unknown as { chrome: typeof chrome }).chrome = chrome;
  return { store };
}

function fakeResult(score: number): PublicCheckResponse {
  return {
    score,
    scoreBreakdown: { meta: score },
    issues: [],
    meta: {
      inputType: 'url',
      contentStats: { words: 1, characters: 1, readingTimeSec: 1 },
      processingTimeMs: 50,
      ruleVersion: '1.2.0',
      enrichMode: 'llm',
      suggestionSource: 'llm',
      degraded: false,
      cached: false,
      requestId: 'req_x',
      usage: { remaining: { minute: 10, day: 100 }, resetAt: { minute: '', day: '' } },
    },
  };
}

describe('cacheKey', () => {
  it('produces a stable hash for the same inputs', () => {
    const a = cacheKey('https://example.com', 'seo', 'vi');
    const b = cacheKey('https://example.com', 'seo', 'vi');
    expect(a).toBe(b);
  });

  it('varies by URL', () => {
    const a = cacheKey('https://example.com/a', 'seo', 'vi');
    const b = cacheKey('https://example.com/b', 'seo', 'vi');
    expect(a).not.toBe(b);
  });

  it('varies by keyword', () => {
    const a = cacheKey('https://example.com', 'seo', 'vi');
    const b = cacheKey('https://example.com', 'SEO 2026', 'vi');
    expect(a).not.toBe(b);
  });

  it('varies by language', () => {
    const a = cacheKey('https://example.com', 'seo', 'vi');
    const b = cacheKey('https://example.com', 'seo', 'en');
    expect(a).not.toBe(b);
  });
});

describe('writeCache / readCache', () => {
  beforeEach(() => {
    stubChromeStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'));
  });

  it('round-trips a result under the same key', async () => {
    const k = cacheKey('https://example.com', 'seo', 'vi');
    const result = fakeResult(92);
    await writeCache(k, result);
    const out = await readCache(k);
    expect(out).toBeTruthy();
    expect(out!.score).toBe(92);
    // The returned `cached: true` flag is set on read so the popup can
    // surface it without the cache having to mutate the original copy.
    expect(out!.meta.cached).toBe(true);
  });

  it('returns null when nothing has been written', async () => {
    const k = cacheKey('https://example.com', 'seo', 'vi');
    expect(await readCache(k)).toBeNull();
  });

  it('returns null after the TTL elapses', async () => {
    const k = cacheKey('https://example.com', 'seo', 'vi');
    await writeCache(k, fakeResult(50));
    vi.setSystemTime(Date.now() + AUDIT_CACHE_TTL_MS + 1000);
    expect(await readCache(k)).toBeNull();
  });

  it('preserves the original cached flag if it was already true', async () => {
    // (rare but plausible if gateway returned cached: true; we don't
    // want to flip it to false on local cache write/read)
    const r = fakeResult(80);
    r.meta.cached = true;
    const k = cacheKey('https://example.com', 'seo', 'vi');
    await writeCache(k, r);
    const out = await readCache(k);
    expect(out!.meta.cached).toBe(true);
  });
});
