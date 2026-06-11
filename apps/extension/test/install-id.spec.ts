import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ensureInstallId, isValidInstallId, loadInstallId } from '../lib/install-id';

// Fake chrome.storage.local for node-env tests.
let store: Record<string, unknown> = {};
beforeEach(() => {
  store = {};
  // @ts-expect-error inject chrome global
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async (k: string) => ({ [k]: store[k] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
        }),
        remove: vi.fn(async (k: string) => {
          delete store[k];
        }),
      },
    },
  };
  // crypto.randomUUID is available in Node 19+; fall back if missing.
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    // @ts-expect-error
    globalThis.crypto = { randomUUID: () => '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04' };
  }
});

describe('isValidInstallId', () => {
  it('accepts a UUID v4', () => {
    expect(isValidInstallId('4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04')).toBe(true);
  });
  it('rejects a UUID v1', () => {
    expect(isValidInstallId('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });
  it('rejects non-strings and empty strings', () => {
    expect(isValidInstallId('')).toBe(false);
    expect(isValidInstallId(undefined)).toBe(false);
    expect(isValidInstallId(123)).toBe(false);
  });
});

describe('ensureInstallId', () => {
  it('generates and persists a new install id on first call', async () => {
    const id = await ensureInstallId();
    expect(isValidInstallId(id)).toBe(true);
    expect(store['installId']).toBe(id);
  });

  it('returns the same install id on a second call (idempotent)', async () => {
    const first = await ensureInstallId();
    const second = await ensureInstallId();
    expect(second).toBe(first);
  });

  it('regenerates if the stored value is malformed', async () => {
    store['installId'] = 'corrupt';
    const fresh = await ensureInstallId();
    expect(isValidInstallId(fresh)).toBe(true);
    expect(fresh).not.toBe('corrupt');
  });
});

describe('loadInstallId', () => {
  it('returns null when storage is empty', async () => {
    expect(await loadInstallId()).toBeNull();
  });
  it('returns the value when storage contains a valid UUID v4', async () => {
    store['installId'] = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';
    expect(await loadInstallId()).toBe('4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04');
  });
  it('returns null when storage contains a malformed value', async () => {
    store['installId'] = 'corrupt';
    expect(await loadInstallId()).toBeNull();
  });
});
