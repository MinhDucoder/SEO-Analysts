import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CacheService } from '../../src/crawler/persistence/cache.service';
import { CACHE_TTL, FormFactor } from '@repo/shared';

const fakeRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  quit: vi.fn(),
};

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheService(fakeRedis as any);
  });

  it('hashes URLs deterministically with sha256', () => {
    const a = cache.hashUrl('https://example.com/');
    const b = cache.hashUrl('https://example.com/');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different URLs', () => {
    expect(cache.hashUrl('https://a.com/')).not.toBe(cache.hashUrl('https://b.com/'));
  });

  it('writes crawl results with the configured TTL', async () => {
    await cache.setCrawl('https://example.com/', { foo: 'bar' });
    expect(fakeRedis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^crawl:[a-f0-9]{64}$/),
      CACHE_TTL.CRAWL_SECONDS,
      JSON.stringify({ foo: 'bar' }),
    );
  });

  it('returns parsed crawl result on hit', async () => {
    fakeRedis.get.mockResolvedValueOnce(JSON.stringify({ ok: true }));
    const result = await cache.getCrawl('https://example.com/');
    expect(result).toEqual({ ok: true });
  });

  it('returns null on cache miss', async () => {
    fakeRedis.get.mockResolvedValueOnce(null);
    const result = await cache.getCrawl('https://example.com/');
    expect(result).toBeNull();
  });

  it('writes mobile lighthouse results with 1h TTL under formFactor-keyed path', async () => {
    await cache.setLighthouse('https://example.com/', FormFactor.MOBILE, { lcpMs: 1200 });
    expect(fakeRedis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^lighthouse:mobile:[a-f0-9]{64}$/),
      CACHE_TTL.LIGHTHOUSE_SECONDS,
      JSON.stringify({ lcpMs: 1200 }),
    );
  });

  it('writes desktop lighthouse results under a separate cache key', async () => {
    await cache.setLighthouse('https://example.com/', FormFactor.DESKTOP, { lcpMs: 900 });
    expect(fakeRedis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^lighthouse:desktop:[a-f0-9]{64}$/),
      CACHE_TTL.LIGHTHOUSE_SECONDS,
      JSON.stringify({ lcpMs: 900 }),
    );
  });

  it('reads lighthouse by formFactor — mobile and desktop keys do not collide', async () => {
    fakeRedis.get.mockImplementation((key: string) => {
      if (key.startsWith('lighthouse:mobile:'))  return Promise.resolve(JSON.stringify({ lcpMs: 1500 }));
      if (key.startsWith('lighthouse:desktop:')) return Promise.resolve(JSON.stringify({ lcpMs: 900  }));
      return Promise.resolve(null);
    });
    const mobile  = await cache.getLighthouse<{ lcpMs: number }>('https://example.com/', FormFactor.MOBILE);
    const desktop = await cache.getLighthouse<{ lcpMs: number }>('https://example.com/', FormFactor.DESKTOP);
    expect(mobile?.lcpMs).toBe(1500);
    expect(desktop?.lcpMs).toBe(900);
  });

  it('returns null when stored JSON is corrupted', async () => {
    fakeRedis.get.mockResolvedValueOnce('not-json');
    const result = await cache.getCrawl('https://example.com/');
    expect(result).toBeNull();
  });
});
