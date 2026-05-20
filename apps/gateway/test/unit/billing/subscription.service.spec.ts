import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionService } from '../../../src/billing/services/subscription.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';
import { BILLING_DEFAULTS } from '@repo/shared';

describe('SubscriptionService', () => {
  let svc: SubscriptionService;
  const prismaMock = {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new SubscriptionService(prismaMock as unknown as PrismaService);
  });

  it('getCurrent returns user subscription with planCode + expiresAt', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      planCode: 'pro',
      status: 'active',
      startedAt: new Date('2026-05-01'),
      expiresAt: new Date('2026-06-01'),
      canceledAt: null,
      grantedBy: null,
    });
    const sub = await svc.getCurrent('u1');
    expect(sub?.planCode).toBe('pro');
    expect(sub?.isAdminGranted).toBe(false);
  });

  it('getCurrent returns null when user has no subscription row', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    const sub = await svc.getCurrent('u1');
    expect(sub).toBeNull();
  });

  it('activate creates pro subscription with expiresAt = now + 30 days', async () => {
    prismaMock.subscription.upsert.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      planCode: 'pro',
      status: 'active',
      startedAt: new Date(),
      expiresAt: new Date(),
      canceledAt: null,
      grantedBy: null,
    });
    await svc.activate({ userId: 'u1', planCode: 'pro' });
    const callArg = prismaMock.subscription.upsert.mock.calls[0][0];
    expect(callArg.where).toEqual({ userId: 'u1' });
    expect(callArg.create.planCode).toBe('pro');
    expect(callArg.update.planCode).toBe('pro');
    const expires = callArg.create.expiresAt as Date;
    const diffDays = Math.round((expires.getTime() - Date.now()) / 86400000);
    expect(diffDays).toBe(BILLING_DEFAULTS.SUBSCRIPTION_DAYS);
  });

  it('activate with grantedBy marks admin grant', async () => {
    prismaMock.subscription.upsert.mockResolvedValue({});
    await svc.activate({ userId: 'u1', planCode: 'business', grantedBy: 'admin-id' });
    const arg = prismaMock.subscription.upsert.mock.calls[0][0];
    expect(arg.create.grantedBy).toBe('admin-id');
  });
});
