import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminSubscriptionsService } from '../../src/admin/services/admin-subscriptions.service';
import { SubscriptionService } from '../../src/billing/services/subscription.service';

describe('AdminSubscriptionsService', () => {
  let svc: AdminSubscriptionsService;
  const subSvc = { activate: vi.fn(), getCurrent: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AdminSubscriptionsService(subSvc);
  });

  it('grant calls activate with grantedBy=adminId and duration', async () => {
    await svc.grant({ userId: 'u1', planCode: 'business', days: 60 }, 'admin-1');
    expect(subSvc.activate).toHaveBeenCalledWith({
      userId: 'u1', planCode: 'business', durationDays: 60, grantedBy: 'admin-1',
    });
  });
});
