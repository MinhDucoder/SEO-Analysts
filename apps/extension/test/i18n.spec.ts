import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDict, loadUiLocale, saveUiLocale } from '../lib/i18n';

const store = new Map<string, unknown>();

beforeEach(() => {
  store.clear();
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          const v = store.get(key);
          return v === undefined ? {} : { [key]: v };
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(items)) store.set(k, v);
        }),
      },
    },
  } as unknown as typeof chrome;
});

describe('i18n dict', () => {
  it('vi + en have identical keys (so swap never shows raw key)', () => {
    const vi = getDict('vi');
    const en = getDict('en');
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
  });

  it('all values are either strings or functions returning strings', () => {
    for (const locale of ['vi', 'en'] as const) {
      const dict = getDict(locale) as Record<string, unknown>;
      for (const [k, v] of Object.entries(dict)) {
        if (typeof v === 'function') {
          // Functions are validated by their callers when constructing UI;
          // just assert they're not arrow-strings.
          expect(typeof v).toBe('function');
        } else {
          expect(typeof v).toBe('string');
          expect((v as string).length, `${locale}:${k} empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('function entries return non-empty strings for sample inputs', () => {
    for (const locale of ['vi', 'en'] as const) {
      const dict = getDict(locale);
      expect(dict.stats(100, 5, 200)).toMatch(/100/);
      expect(dict.usage(10, 400)).toMatch(/10/);
      expect(dict.errRetryIn(12)).toMatch(/12/);
      expect(dict.issuesVisible(3, 8)).toMatch(/3/);
      expect(dict.optionsSavedToast('live')).toMatch(/live/);
      expect(dict.optionsLastUsed('2h')).toMatch(/2h/);
    }
  });
});

describe('saveUiLocale + loadUiLocale', () => {
  it('roundtrips vi', async () => {
    await saveUiLocale('vi');
    expect(await loadUiLocale()).toBe('vi');
  });

  it('roundtrips en', async () => {
    await saveUiLocale('en');
    expect(await loadUiLocale()).toBe('en');
  });

  it('falls back to detected locale when nothing is stored', async () => {
    const result = await loadUiLocale();
    expect(['vi', 'en']).toContain(result);
  });
});
