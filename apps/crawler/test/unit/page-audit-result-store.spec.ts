import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PageAuditResultStore, PageAuditResult } from '../../src/crawler/services/page-audit-result-store.service';

interface RedisStub {
  rpush: ReturnType<typeof vi.fn>;
  lrange: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  llen: ReturnType<typeof vi.fn>;
}

describe('PageAuditResultStore', () => {
  let redis: RedisStub;
  let store: PageAuditResultStore;

  beforeEach(() => {
    redis = {
      rpush: vi.fn().mockResolvedValue(1),
      lrange: vi.fn().mockResolvedValue([]),
      expire: vi.fn().mockResolvedValue(1),
      del: vi.fn().mockResolvedValue(1),
      llen: vi.fn().mockResolvedValue(0),
    };
    store = new PageAuditResultStore(redis as never);
  });

  const result: PageAuditResult = {
    url: 'https://example.com/a',
    score: 82,
    issues: [{ ruleId: 'r1', ruleName: 'meta-title', status: 'pass', score: 100 }],
    fetchedAt: '2026-04-18T12:00:00.000Z',
  };

  it('append writes a JSON-serialized result to the audit result list', async () => {
    await store.append('aud-1', result);
    expect(redis.rpush).toHaveBeenCalledWith(
      'site-crawl:aud-1:results',
      JSON.stringify(result),
    );
  });

  it('append sets a 1-hour expiry on the list key', async () => {
    await store.append('aud-2', result);
    expect(redis.expire).toHaveBeenCalledWith('site-crawl:aud-2:results', 3600);
  });

  it('readAll returns parsed results preserving insertion order', async () => {
    const r1 = { ...result, url: 'https://example.com/a', score: 80 };
    const r2 = { ...result, url: 'https://example.com/b', score: 90 };
    redis.lrange.mockResolvedValue([JSON.stringify(r1), JSON.stringify(r2)]);

    const out = await store.readAll('aud-3');

    expect(redis.lrange).toHaveBeenCalledWith('site-crawl:aud-3:results', 0, -1);
    expect(out).toHaveLength(2);
    expect(out[0].url).toBe('https://example.com/a');
    expect(out[1].score).toBe(90);
  });

  it('readAll returns empty array when no results stored', async () => {
    redis.lrange.mockResolvedValue([]);
    const out = await store.readAll('aud-4');
    expect(out).toEqual([]);
  });

  it('readAll drops corrupt JSON entries without throwing', async () => {
    const good = { ...result, url: 'https://example.com/ok' };
    redis.lrange.mockResolvedValue(['not json', JSON.stringify(good), '{"incomplete":']);

    const out = await store.readAll('aud-corrupt');

    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://example.com/ok');
  });

  it('clear deletes the list key', async () => {
    await store.clear('aud-5');
    expect(redis.del).toHaveBeenCalledWith('site-crawl:aud-5:results');
  });

  it('count returns the current list length', async () => {
    redis.llen.mockResolvedValue(7);
    await expect(store.count('aud-6')).resolves.toBe(7);
    expect(redis.llen).toHaveBeenCalledWith('site-crawl:aud-6:results');
  });
});
