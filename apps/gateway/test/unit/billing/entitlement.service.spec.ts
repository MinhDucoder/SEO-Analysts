import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntitlementService } from '../../../src/billing/services/entitlement.service';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { FeatureFlag } from '@repo/shared';

describe('EntitlementService', () => {
  let svc: EntitlementService;
  const subSvc = { getCurrent: vi.fn() } as unknown as SubscriptionService;
  const billingOn = { get: vi.fn().mockReturnValue('true') } as any;
  const prisma = { user: { findUnique: vi.fn() } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: non-admin user. Admin tests override this per-case.
    prisma.user.findUnique.mockResolvedValue({ role: 'user' });
    svc = new EntitlementService(subSvc, billingOn, prisma);
  });

  it('Free user lacks SITE_AUDIT feature', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'free', status: 'active' });
    const d = await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT);
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain('site_audit');
  });

  it('Pro user has SITE_AUDIT, lacks PRIORITY_QUEUE', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    expect((await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT)).allowed).toBe(true);
    expect((await svc.hasFeature('u1', FeatureFlag.PRIORITY_QUEUE)).allowed).toBe(false);
  });

  it('Business user has every feature', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'business', status: 'active' });
    for (const f of Object.values(FeatureFlag)) {
      expect((await svc.hasFeature('u1', f)).allowed).toBe(true);
    }
  });

  it('No subscription row falls back to Free entitlements', async () => {
    (subSvc.getCurrent as any).mockResolvedValue(null);
    const d = await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT);
    expect(d.allowed).toBe(false);
  });

  it('Canceled subscription downgrades to Free for entitlement check', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'canceled' });
    const d = await svc.hasFeature('u1', FeatureFlag.SITE_AUDIT);
    expect(d.allowed).toBe(false);
  });

  it('getEffectivePlan returns free for canceled/expired', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'expired' });
    expect(await svc.getEffectivePlan('u1')).toBe('free');
  });

  it('siteAuditMaxPages enforces plan cap', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    const d = await svc.checkSiteAuditPageCount('u1', 150);
    expect(d.allowed).toBe(true);
    const d2 = await svc.checkSiteAuditPageCount('u1', 250);
    expect(d2.allowed).toBe(false);
  });

  it('checkScheduledAuditCron rejects Pro cron <24h', async () => {
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'pro', status: 'active' });
    // Pro min = 1440 minutes (daily). Hourly cron has min interval 60 → reject.
    const d = await svc.checkScheduledAuditCron('u1', '0 * * * *');
    expect(d.allowed).toBe(false);
    const d2 = await svc.checkScheduledAuditCron('u1', '0 0 * * *');
    expect(d2.allowed).toBe(true);
  });

  it('billing disabled → every check allows regardless of plan', async () => {
    const billingOff = { get: vi.fn().mockReturnValue('false') } as any;
    const offSvc = new EntitlementService(subSvc, billingOff, prisma);
    // Free plan would normally block all of these.
    (subSvc.getCurrent as any).mockResolvedValue({ planCode: 'free', status: 'active' });

    expect((await offSvc.hasFeature('u1', FeatureFlag.SCHEDULED_AUDIT)).allowed).toBe(true);
    expect((await offSvc.checkSiteAuditPageCount('u1', 5000)).allowed).toBe(true);
    expect((await offSvc.checkScheduledAuditCount('u1', 999)).allowed).toBe(true);
    expect((await offSvc.checkScheduledAuditCron('u1', '* * * * *')).allowed).toBe(true);
  });

  describe('admin god-mode (billing ON)', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ role: 'admin' });
      // Admin has no purchased subscription → would resolve to Free.
      (subSvc.getCurrent as any).mockResolvedValue(null);
    });

    it('isAdmin returns true for admin role', async () => {
      expect(await svc.isAdmin('admin1')).toBe(true);
    });

    it('admin has every feature despite Free-equivalent plan', async () => {
      for (const f of Object.values(FeatureFlag)) {
        expect((await svc.hasFeature('admin1', f)).allowed).toBe(true);
      }
    });

    it('admin bypasses site-audit page cap', async () => {
      expect((await svc.checkSiteAuditPageCount('admin1', 999999)).allowed).toBe(true);
    });

    it('admin bypasses scheduled-audit count cap', async () => {
      expect((await svc.checkScheduledAuditCount('admin1', 999999)).allowed).toBe(true);
    });

    it('admin bypasses scheduled-audit cron min interval', async () => {
      expect((await svc.checkScheduledAuditCron('admin1', '* * * * *')).allowed).toBe(true);
    });
  });
});
