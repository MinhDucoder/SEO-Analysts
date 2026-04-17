import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SiteCrawlCounter } from '../../src/crawler/services/site-crawl-counter.service';

describe('SiteCrawlCounter', () => {
  const store: Record<string, string> = {};
  const redis = {
    setex: vi.fn(async (key: string, _ttl: number, val: string) => { store[key] = val; return 'OK'; }),
    get: vi.fn(async (key: string) => store[key] ?? null),
    incr: vi.fn(async (key: string) => {
      const cur = Number(store[key] ?? '0') + 1;
      store[key] = String(cur);
      return cur;
    }),
    expire: vi.fn(async () => 1),
    del: vi.fn(async (...keys: string[]) => {
      for (const k of keys) delete store[k];
      return keys.length;
    }),
  };
  let counter: SiteCrawlCounter;

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.clearAllMocks();
    counter = new SiteCrawlCounter(redis as any);
  });

  it('setExpected stores under site-crawl:<id>:expected with 1h TTL', async () => {
    await counter.setExpected('aud-1', 5);
    expect(redis.setex).toHaveBeenCalledWith('site-crawl:aud-1:expected', 3600, '5');
  });

  it('getExpected returns the stored number', async () => {
    await counter.setExpected('aud-1', 7);
    expect(await counter.getExpected('aud-1')).toBe(7);
  });

  it('getExpected returns null when never set', async () => {
    expect(await counter.getExpected('unknown')).toBeNull();
  });

  it('markDone increments and reports not complete before last URL', async () => {
    await counter.setExpected('aud-1', 3);
    const first = await counter.markDone('aud-1');
    expect(first.done).toBe(1);
    expect(first.expected).toBe(3);
    expect(first.complete).toBe(false);
    const second = await counter.markDone('aud-1');
    expect(second.done).toBe(2);
    expect(second.complete).toBe(false);
  });

  it('markDone reports complete=true on the final URL', async () => {
    await counter.setExpected('aud-1', 2);
    await counter.markDone('aud-1');
    const final = await counter.markDone('aud-1');
    expect(final.done).toBe(2);
    expect(final.complete).toBe(true);
  });

  it('markDone returns complete=false if expected is missing (fail-safe)', async () => {
    const res = await counter.markDone('aud-no-setup');
    expect(res.done).toBe(1);
    expect(res.expected).toBeNull();
    expect(res.complete).toBe(false);
  });

  it('cleanup deletes both keys', async () => {
    await counter.setExpected('aud-1', 2);
    await counter.markDone('aud-1');
    await counter.cleanup('aud-1');
    expect(redis.del).toHaveBeenCalledWith('site-crawl:aud-1:expected', 'site-crawl:aud-1:done');
    expect(await counter.getExpected('aud-1')).toBeNull();
  });
});
