import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntitlementService } from '../../../src/billing/services/entitlement.service';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { QuotaCounterService } from '../../../src/billing/services/quota-counter.service';

/**
 * Task 24 — EntitlementService.canRunGeo
 *
 * Deviations from plan template (which used a hypothetical userRepo/quotaCounter adapter):
 *  - Real DI: EntitlementService(subscriptions, config, prisma, quotaCounter)
 *  - Admin detection uses prisma.user.findUnique (same as isAdmin())
 *  - Plan resolution uses subscriptions.getCurrent() → getEffectivePlan()
 *  - QuotaCounterService.getRemaining(dimension, userId, limit) is the new method
 *    added in Task 25 (no-op code path — generic string dimension, monthly window).
 */
describe('EntitlementService.canRunGeo', () => {
  const subSvc = { getCurrent: vi.fn() } as unknown as SubscriptionService;
  const billingOn = { get: vi.fn().mockReturnValue('true') } as any;
  const prisma = { user: { findUnique: vi.fn() } } as any;
  const quotaCounter = { getRemaining: vi.fn() } as unknown as QuotaCounterService;

  let svc: EntitlementService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: non-admin user
    prisma.user.findUnique.mockResolvedValue({ role: 'user' });
    svc = new EntitlementService(subSvc, billingOn, prisma, quotaCounter);
  });

  it('free user denied — no GEO_AUDIT feature on free plan', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'free', status: 'active' });
    // quota.getRemaining should not be called for free plan (feature flag blocks first)
    const result = await svc.canRunGeo('u1');
    expect(result).toEqual({ allowed: false, reason: 'free_plan', remainingQuota: 0 });
  });

  it('pro user allowed with remaining quota', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    (quotaCounter.getRemaining as any).mockResolvedValue(50);
    const result = await svc.canRunGeo('u1');
    expect(result).toEqual({ allowed: true, reason: null, remainingQuota: 50 });
  });

  it('pro user with 0 remaining quota → quota_exhausted', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    (quotaCounter.getRemaining as any).mockResolvedValue(0);
    const result = await svc.canRunGeo('u1');
    expect(result).toEqual({ allowed: false, reason: 'quota_exhausted', remainingQuota: 0 });
  });

  it('business user allowed with remaining quota', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'business', status: 'active' });
    (quotaCounter.getRemaining as any).mockResolvedValue(300);
    const result = await svc.canRunGeo('u1');
    expect(result).toEqual({ allowed: true, reason: null, remainingQuota: 300 });
  });

  it('admin bypasses plan/quota — allowed regardless of free plan + 0 quota', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    (subSvc.getCurrent as any).mockResolvedValue(null); // no subscription → would be free
    const result = await svc.canRunGeo('u1');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('no subscription falls back to free → denied', async () => {
    (subSvc.getCurrent as any).mockResolvedValue(null);
    const result = await svc.canRunGeo('u1');
    expect(result).toEqual({ allowed: false, reason: 'free_plan', remainingQuota: 0 });
  });

  it('billing disabled → allowed regardless of plan', async () => {
    const billingOff = { get: vi.fn().mockReturnValue('false') } as any;
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'free', status: 'active' });
    (quotaCounter.getRemaining as any).mockResolvedValue(0);
    const offSvc = new EntitlementService(subSvc, billingOff, prisma, quotaCounter);
    const result = await offSvc.canRunGeo('u1');
    expect(result.allowed).toBe(true);
  });
});
