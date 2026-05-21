import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuotaGuard } from '../../../src/common/guards/quota.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

function ctx(userId = 'u1'): ExecutionContext {
  const req = { user: { id: userId }, res: { setHeader: vi.fn() } };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => req.res }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('QuotaGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
  const ent = { getEffectivePlan: vi.fn() } as any;
  const counter = { consume: vi.fn() } as any;
  let guard: QuotaGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new QuotaGuard(reflector as any, ent, counter);
  });

  it('passes through when no @RequireQuota metadata', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue(undefined);
    expect(await guard.canActivate(ctx())).toBe(true);
  });

  it('throws QuotaExceeded when counter rejects', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue({ dimension: 'audits_monthly', increment: 1 });
    ent.getEffectivePlan.mockResolvedValue('free');
    counter.consume.mockResolvedValue({ allowed: false, used: 10, remaining: 0, resetAt: new Date() });
    await expect(guard.canActivate(ctx())).rejects.toThrow(/QUOTA_EXCEEDED/);
  });

  it('sets X-RateLimit-Remaining header on success', async () => {
    (reflector.getAllAndOverride as any).mockReturnValue({ dimension: 'audits_monthly', increment: 1 });
    ent.getEffectivePlan.mockResolvedValue('pro');
    const reset = new Date();
    counter.consume.mockResolvedValue({ allowed: true, used: 1, remaining: 199, resetAt: reset });
    const c = ctx();
    expect(await guard.canActivate(c)).toBe(true);
    const res = (c as any).switchToHttp().getResponse();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '199');
    expect(res.setHeader).toHaveBeenCalledWith('X-Quota-Reset', reset.toISOString());
  });
});
