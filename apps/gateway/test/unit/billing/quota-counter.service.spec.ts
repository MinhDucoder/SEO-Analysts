import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaCounterService } from '../../../src/billing/services/quota-counter.service';
import { RedisService } from '../../../src/infra/redis/redis.service';

describe('QuotaCounterService', () => {
  let svc: QuotaCounterService;
  const store = new Map<string, number>();
  const ttls = new Map<string, number>();
  const redisMock = {
    client: {
      get: vi.fn(async (k: string) => (store.has(k) ? String(store.get(k)) : null)),
      incrby: vi.fn(async (k: string, n: number) => {
        const v = (store.get(k) ?? 0) + n;
        store.set(k, v);
        return v;
      }),
      expire: vi.fn(async (k: string, ttl: number) => { ttls.set(k, ttl); return 1; }),
    },
  };

  beforeEach(() => {
    store.clear();
    ttls.clear();
    vi.clearAllMocks();
    svc = new QuotaCounterService(redisMock as unknown as RedisService);
  });

  it('consume increments and returns allowed when under limit', async () => {
    const r = await svc.consume('u1', 'audits_monthly', 10, 1);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(1);
    expect(r.remaining).toBe(9);
  });

  it('consume rejects when limit reached', async () => {
    for (let i = 0; i < 10; i++) {
      await svc.consume('u1', 'audits_monthly', 10, 1);
    }
    const r = await svc.consume('u1', 'audits_monthly', 10, 1);
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(10);
    expect(r.remaining).toBe(0);
  });

  it('limit=0 always rejects (e.g. Free site_audit)', async () => {
    const r = await svc.consume('u1', 'audits_monthly', 0, 1);
    expect(r.allowed).toBe(false);
  });

  it('uses YYYY-MM key namespace', async () => {
    await svc.consume('u1', 'audits_monthly', 10, 1);
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const calls = redisMock.client.incrby.mock.calls;
    expect(calls[0][0]).toBe(`quota:u1:audits_monthly:${ym}`);
  });

  it('sets TTL = 32 days on first increment', async () => {
    await svc.consume('u1', 'audits_monthly', 10, 1);
    expect(redisMock.client.expire).toHaveBeenCalledWith(
      expect.stringContaining('quota:u1:audits_monthly'),
      32 * 86400,
    );
  });

  it('peek reads without incrementing', async () => {
    await svc.consume('u1', 'audits_monthly', 10, 5);
    const r = await svc.peek('u1', 'audits_monthly', 10);
    expect(r.used).toBe(5);
    expect(r.remaining).toBe(5);
    expect(r.allowed).toBe(true);
  });

  describe('daily dimension (*_daily)', () => {
    it('uses YYYY-MM-DD key for *_daily dimensions', async () => {
      await svc.consume('u1', 'tools_fetches_daily', 10, 1);
      const calls = redisMock.client.incrby.mock.calls;
      expect(calls[0][0]).toMatch(/^quota:u1:tools_fetches_daily:\d{4}-\d{2}-\d{2}$/);
    });

    it('sets TTL to 26h on first consume for daily dimension', async () => {
      await svc.consume('u1', 'tools_fetches_daily', 10, 1);
      expect(redisMock.client.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^quota:u1:tools_fetches_daily:\d{4}-\d{2}-\d{2}$/),
        26 * 3600,
      );
    });

    it('still uses YYYY-MM key + 32d TTL for non-daily dimensions', async () => {
      await svc.consume('u1', 'audits_monthly', 100, 1);
      const calls = redisMock.client.incrby.mock.calls;
      expect(calls[0][0]).toMatch(/^quota:u1:audits_monthly:\d{4}-\d{2}$/);
      expect(redisMock.client.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^quota:u1:audits_monthly:\d{4}-\d{2}$/),
        32 * 86400,
      );
    });

    it('resetAt for daily dimension is start of next UTC day', async () => {
      const res = await svc.consume('u1', 'tools_fetches_daily', 10, 1);
      const now = new Date();
      const expectedReset = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
      );
      expect(res.resetAt.getTime()).toBe(expectedReset);
    });
  });
});
