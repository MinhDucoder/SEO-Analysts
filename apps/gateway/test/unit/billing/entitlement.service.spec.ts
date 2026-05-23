import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntitlementService } from '../../../src/billing/services/entitlement.service';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { FeatureFlag } from '@repo/shared';

describe('EntitlementService', () => {
  let svc: EntitlementService;
  const subSvc = { getCurrent: vi.fn() } as unknown as SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new EntitlementService(subSvc);
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
});
