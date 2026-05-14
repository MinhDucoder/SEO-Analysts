import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HISTORY_MAX_ENTRIES,
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  getHistoryResult,
  listHistory,
} from '../lib/history';
import type { PublicCheckResponse } from '../lib/api-types';

function fakeResult(over: Partial<PublicCheckResponse> = {}): PublicCheckResponse {
  return {
    score: 78,
    scoreBreakdown: { content: 85, meta: 70 },
    issues: [],
    meta: {
      inputType: 'url',
      resolvedUrl: 'https://example.com/post',
      contentStats: { words: 1000, characters: 5000, readingTimeSec: 300 },
      processingTimeMs: 800,
      ruleVersion: '1.2.0',
      enrichMode: 'llm',
      suggestionSource: 'llm',
      degraded: false,
      cached: false,
      requestId: 'req_01',
      usage: {
        remaining: { minute: 10, day: 400 },
        resetAt: { minute: '', day: '' },
      },
    },
    ...over,
  };
}

const store = new Map<string, unknown>();
let bytesInUseMock = 0;

beforeEach(() => {
  store.clear();
  bytesInUseMock = 0;
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async (key?: string | string[]) => {
          if (key == null) return Object.fromEntries(store.entries());
          if (typeof key === 'string') {
            const v = store.get(key);
            return v === undefined ? {} : { [key]: v };
          }
          const out: Record<string, unknown> = {};
          for (const k of key) {
            const v = store.get(k);
            if (v !== undefined) out[k] = v;
          }
          return out;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(items)) store.set(k, v);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const k of Array.isArray(keys) ? keys : [keys]) store.delete(k);
        }),
        getBytesInUse: vi.fn(async () => bytesInUseMock),
      },
    },
  } as unknown as typeof chrome;
});

describe('history', () => {
  it('list returns empty when nothing saved', async () => {
    expect(await listHistory()).toEqual([]);
  });

  it('addHistoryEntry saves an entry that listHistory returns', async () => {
    const e = await addHistoryEntry(fakeResult(), {
      url: 'https://example.com/post',
      keyword: 'seo 2026',
      language: 'vi',
    });
    expect(e.url).toBe('https://example.com/post');
    expect(e.keyword).toBe('seo 2026');
    expect(e.score).toBe(78);
    expect(typeof e.id).toBe('string');
    const list = await listHistory();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(e.id);
  });

  it('listHistory returns newest first', async () => {
    const e1 = await addHistoryEntry(fakeResult(), {
      url: 'https://a',
      keyword: 'a',
      language: 'vi',
    });
    await new Promise((r) => setTimeout(r, 1));
    const e2 = await addHistoryEntry(fakeResult(), {
      url: 'https://b',
      keyword: 'b',
      language: 'vi',
    });
    const list = await listHistory();
    expect(list.map((e) => e.id)).toEqual([e2.id, e1.id]);
  });

  it('cap at HISTORY_MAX_ENTRIES — oldest dropped', async () => {
    for (let i = 0; i < HISTORY_MAX_ENTRIES + 3; i++) {
      await addHistoryEntry(fakeResult({ score: i }), {
        url: `https://example.com/${i}`,
        keyword: 'k',
        language: 'vi',
      });
    }
    const list = await listHistory();
    expect(list).toHaveLength(HISTORY_MAX_ENTRIES);
    // newest first; oldest 3 should be gone
    expect(list[0]!.url).toBe(`https://example.com/${HISTORY_MAX_ENTRIES + 2}`);
    expect(list.at(-1)!.url).toBe('https://example.com/3');
  });

  it('getHistoryResult returns full response by id', async () => {
    const e = await addHistoryEntry(fakeResult({ score: 91 }), {
      url: 'https://x',
      keyword: 'k',
      language: 'vi',
    });
    const r = await getHistoryResult(e.id);
    expect(r?.score).toBe(91);
  });

  it('getHistoryResult returns null on unknown id', async () => {
    expect(await getHistoryResult('does-not-exist')).toBeNull();
  });

  it('deleteHistoryEntry removes one entry + its blob', async () => {
    const e1 = await addHistoryEntry(fakeResult(), {
      url: 'https://a',
      keyword: 'k',
      language: 'vi',
    });
    const e2 = await addHistoryEntry(fakeResult(), {
      url: 'https://b',
      keyword: 'k',
      language: 'vi',
    });
    await deleteHistoryEntry(e1.id);
    const list = await listHistory();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(e2.id);
    expect(await getHistoryResult(e1.id)).toBeNull();
  });

  it('clearHistory removes everything', async () => {
    await addHistoryEntry(fakeResult(), {
      url: 'https://a',
      keyword: 'k',
      language: 'vi',
    });
    await addHistoryEntry(fakeResult(), {
      url: 'https://b',
      keyword: 'k',
      language: 'vi',
    });
    await clearHistory();
    expect(await listHistory()).toEqual([]);
  });

  it('addHistoryEntry drops oldest when quota above 4 MB', async () => {
    await addHistoryEntry(fakeResult(), {
      url: 'https://old',
      keyword: 'k',
      language: 'vi',
    });
    bytesInUseMock = 4.5 * 1024 * 1024;
    await addHistoryEntry(fakeResult(), {
      url: 'https://new',
      keyword: 'k',
      language: 'vi',
    });
    const list = await listHistory();
    expect(list).toHaveLength(1);
    expect(list[0]!.url).toBe('https://new');
  });
});
