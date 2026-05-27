import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolsQuotaService } from './tools-quota.service';

describe('ToolsQuotaService', () => {
  let entitlement: any, counter: any, rateLimiter: any, config: any, svc: ToolsQuotaService;

  beforeEach(() => {
    entitlement = { getEffectivePlan: vi.fn(), isAdmin: vi.fn().mockResolvedValue(false) };
    counter = { consume: vi.fn(), peek: vi.fn() };
    rateLimiter = { consume: vi.fn() };
    config = { get: vi.fn().mockReturnValue('true') };
    svc = new ToolsQuotaService(entitlement, counter, rateLimiter, config);
  });

  it('anonymous → consumes IP sliding-window bucket', async () => {
    rateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    const r = await svc.checkAndIncrement({ userId: undefined, ip: '203.0.113.1' });
    expect(r).toMatchObject({ scope: 'ip-hour', used: 1, limit: 3 });
    expect(rateLimiter.consume).toHaveBeenCalledWith('rate_limit:tools:anon:203.0.113.1', 3, 3600);
  });

  it('anonymous over limit → throws 429 with TOOLS_ANON_RATE_LIMIT', async () => {
    rateLimiter.consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 1200 });
    await expect(svc.checkAndIncrement({ userId: undefined, ip: '203.0.113.1' })).rejects.toMatchObject({
      status: 429,
      response: { code: 'TOOLS_ANON_RATE_LIMIT' },
    });
  });

  it('authed free → consumes tools_fetches_daily', async () => {
    entitlement.getEffectivePlan.mockResolvedValue('free');
    counter.consume.mockResolvedValue({ allowed: true, used: 1, remaining: 9, resetAt: new Date() });
    const r = await svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' });
    expect(r).toMatchObject({ scope: 'user-day', used: 1, limit: 10 });
    expect(counter.consume).toHaveBeenCalledWith('u1', 'tools_fetches_daily', 10, 1);
  });

  it('authed free over quota → throws TOOLS_QUOTA_EXCEEDED', async () => {
    entitlement.getEffectivePlan.mockResolvedValue('free');
    counter.consume.mockResolvedValue({ allowed: false, used: 11, remaining: 0, resetAt: new Date() });
    await expect(svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' })).rejects.toMatchObject({
      status: 429,
      response: { code: 'TOOLS_QUOTA_EXCEEDED' },
    });
  });

  it('authed pro → uses 1000 soft cap when limit is -1', async () => {
    entitlement.getEffectivePlan.mockResolvedValue('pro');
    counter.consume.mockResolvedValue({ allowed: true, used: 50, remaining: 950, resetAt: new Date() });
    const r = await svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' });
    expect(counter.consume).toHaveBeenCalledWith('u1', 'tools_fetches_daily', 1000, 1);
    expect(r.limit).toBe(1000);
  });

  it('billing feature off → skips quota, returns unlimited user-day', async () => {
    config.get.mockReturnValue('false');
    const r = await svc.checkAndIncrement({ userId: 'u1', ip: '203.0.113.1' });
    expect(counter.consume).not.toHaveBeenCalled();
    expect(r).toMatchObject({ scope: 'user-day', limit: -1 });
  });
});
