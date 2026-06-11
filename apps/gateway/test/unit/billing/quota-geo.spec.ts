import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaCounterService } from '../../../src/billing/services/quota-counter.service';
import { RedisService } from '../../../src/infra/redis/redis.service';
import { PLAN_FEATURES } from '@repo/shared';

/**
 * Task 25 — geo_audits_monthly dimension in QuotaCounterService
 *
 * QuotaCounterService already accepts any string dimension generically.
 * geo_audits_monthly ends with _monthly (not _daily) so it uses the
 * monthly window (YYYY-MM key, 32d TTL). No code change was needed —
 * this test suite confirms correct behaviour for the new dimension.
 */
describe('geo_audits_monthly quota dimension', () => {
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
      expire: vi.fn(async (k: string, ttl: number) => {
        ttls.set(k, ttl);
        return 1;
      }),
    },
  };

  beforeEach(() => {
    store.clear();
    ttls.clear();
    vi.clearAllMocks();
    svc = new QuotaCounterService(redisMock as unknown as RedisService);
  });

  it.each([
    ['free', 0],
    ['pro', 50],
    ['business', 300],
  ] as const)('PLAN_FEATURES[%s].geo_audits_monthly = %d', (plan, expected) => {
    expect(PLAN_FEATURES[plan].geo_audits_monthly).toBe(expected);
  });

  it('consume geo_audits_monthly uses YYYY-MM monthly key namespace', async () => {
    await svc.consume('u1', 'geo_audits_monthly', 50, 1);
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const calls = redisMock.client.incrby.mock.calls;
    expect(calls[0][0]).toBe(`quota:u1:geo_audits_monthly:${ym}`);
  });

  it('consume geo_audits_monthly sets 32d TTL on first call', async () => {
    await svc.consume('u1', 'geo_audits_monthly', 50, 1);
    expect(redisMock.client.expire).toHaveBeenCalledWith(
      expect.stringContaining('quota:u1:geo_audits_monthly'),
      32 * 86400,
    );
  });

  it('consume tracks usage correctly up to pro limit (50)', async () => {
    const limit = PLAN_FEATURES.pro.geo_audits_monthly; // 50
    for (let i = 0; i < 50; i++) {
      const r = await svc.consume('u1', 'geo_audits_monthly', limit, 1);
      expect(r.allowed).toBe(true);
    }
    const r = await svc.consume('u1', 'geo_audits_monthly', limit, 1);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('getRemaining returns correct value after partial consumption', async () => {
    const limit = PLAN_FEATURES.pro.geo_audits_monthly; // 50
    // Use 10 calls
    for (let i = 0; i < 10; i++) {
      await svc.consume('u1', 'geo_audits_monthly', limit, 1);
    }
    const remaining = await svc.getRemaining('geo_audits_monthly', 'u1', limit);
    expect(remaining).toBe(40);
  });

  it('getRemaining returns full limit when no usage yet', async () => {
    const limit = PLAN_FEATURES.pro.geo_audits_monthly; // 50
    const remaining = await svc.getRemaining('geo_audits_monthly', 'u1', limit);
    expect(remaining).toBe(50);
  });

  it('getRemaining returns 0 when quota exhausted', async () => {
    const limit = PLAN_FEATURES.pro.geo_audits_monthly; // 50
    for (let i = 0; i < 50; i++) {
      await svc.consume('u1', 'geo_audits_monthly', limit, 1);
    }
    const remaining = await svc.getRemaining('geo_audits_monthly', 'u1', limit);
    expect(remaining).toBe(0);
  });

  it('limit=0 (free plan) always rejects consume', async () => {
    const r = await svc.consume('u1', 'geo_audits_monthly', PLAN_FEATURES.free.geo_audits_monthly, 1);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });
});
