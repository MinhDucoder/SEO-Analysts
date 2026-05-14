/**
 * Unit tests for the chrome.storage.local wrapper. The implementation
 * never touches the real Chrome API in tests — instead we stub
 * `globalThis.chrome.storage.local` with an in-memory map and assert
 * call shape + return values.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveApiKey,
  loadApiKey,
  clearApiKey,
  isValidApiKeyFormat,
  parseApiKeyEnvironment,
} from '../lib/storage';

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

describe('isValidApiKeyFormat', () => {
  it.each([
    'sk_live_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
    'sk_test_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
  ])('accepts %s', (k) => {
    expect(isValidApiKeyFormat(k)).toBe(true);
  });

  it.each([
    '',
    'sk_live_',
    'live_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
    'sk_prod_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
    'pk_live_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
    'sk_live_short',
    'sk_live_invalid!chars$inkey',
    'SK_LIVE_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
  ])('rejects %s', (k) => {
    expect(isValidApiKeyFormat(k)).toBe(false);
  });
});

describe('parseApiKeyEnvironment', () => {
  it('returns "live" for sk_live_...', () => {
    expect(parseApiKeyEnvironment('sk_live_xyz')).toBe('live');
  });
  it('returns "test" for sk_test_...', () => {
    expect(parseApiKeyEnvironment('sk_test_xyz')).toBe('test');
  });
  it('returns null for invalid key prefix', () => {
    expect(parseApiKeyEnvironment('pk_live_xyz')).toBeNull();
    expect(parseApiKeyEnvironment('')).toBeNull();
  });
});

describe('saveApiKey / loadApiKey / clearApiKey', () => {
  beforeEach(() => {
    stubChromeStorage();
  });

  it('saves and loads a valid key', async () => {
    const key = 'sk_test_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE';
    await saveApiKey(key);
    expect(await loadApiKey()).toBe(key);
  });

  it('returns null when no key has been saved', async () => {
    expect(await loadApiKey()).toBeNull();
  });

  it('rejects malformed keys without touching storage', async () => {
    const { store } = stubChromeStorage();
    await expect(saveApiKey('invalid')).rejects.toThrow(/format/i);
    expect(store.size).toBe(0);
  });

  it('clearApiKey removes the entry', async () => {
    const key = 'sk_live_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE';
    await saveApiKey(key);
    await clearApiKey();
    expect(await loadApiKey()).toBeNull();
  });
});
