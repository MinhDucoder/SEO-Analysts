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

  it('cancel sets status=canceled + canceledAt without touching planCode', async () => {
    prismaMock.subscription.update.mockResolvedValue({});
    const before = Date.now();
    await svc.cancel('u1');
    const callArg = prismaMock.subscription.update.mock.calls[0][0];
    expect(callArg.where).toEqual({ userId: 'u1' });
    expect(callArg.data.status).toBe('canceled');
    expect(callArg.data.canceledAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(callArg.data).not.toHaveProperty('planCode');
  });

  it('downgradeExpiredToFree returns 0 and skips transaction when no expired subs', async () => {
    prismaMock.subscription.findMany = vi.fn().mockResolvedValue([]);
    prismaMock.$transaction = vi.fn();
    const n = await svc.downgradeExpiredToFree();
    expect(n).toBe(0);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('downgradeExpiredToFree marks expired, upserts Free, returns count', async () => {
    const now = new Date('2026-06-15T00:00:00Z');
    const expired = [
      { id: 's1', userId: 'u1' },
      { id: 's2', userId: 'u2' },
    ];
    prismaMock.subscription.findMany = vi.fn().mockResolvedValue(expired);
    const tx = {
      subscription: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction = vi.fn(async (cb: (t: typeof tx) => Promise<void>) => cb(tx));

    const n = await svc.downgradeExpiredToFree(now);
    expect(n).toBe(2);
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1', 's2'] } },
      data: { status: 'expired' },
    });
    expect(tx.subscription.upsert).toHaveBeenCalledTimes(2);
    const firstUpsert = tx.subscription.upsert.mock.calls[0][0];
    expect(firstUpsert.create.planCode).toBe('free');
    expect(firstUpsert.create.expiresAt).toBeNull();
    expect(firstUpsert.update.grantedBy).toBeNull();
  });
});
