import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlansService } from '../../../src/billing/services/plans.service';
import { PrismaService } from '../../../src/infra/prisma/prisma.service';

describe('PlansService', () => {
  let svc: PlansService;
  const prismaMock = {
    plan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new PlansService(prismaMock as unknown as PrismaService);
  });

  it('listPublicPlans merges DB price/display with code features', async () => {
    prismaMock.plan.findMany.mockResolvedValue([
      { code: 'free', displayName: 'Cá nhân', priceVnd: 0, sortOrder: 1, isPublic: true },
      { code: 'pro', displayName: 'Chuyên nghiệp', priceVnd: 99000, sortOrder: 2, isPublic: true },
      { code: 'business', displayName: 'Doanh nghiệp', priceVnd: 299000, sortOrder: 3, isPublic: true },
    ]);
    const plans = await svc.listPublicPlans();
    expect(plans).toHaveLength(3);
    expect(plans[0].code).toBe('free');
    expect(plans[1].priceVnd).toBe(99000);
    expect(plans[1].features.audits_monthly).toBe(200);
    expect(plans[2].features.features).toContain('priority_queue');
  });

  it('getPlan returns merged plan or null', async () => {
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      code: 'pro', displayName: 'Chuyên nghiệp', priceVnd: 99000, sortOrder: 2, isPublic: true,
    });
    const plan = await svc.getPlan('pro');
    expect(plan?.features.api_keys_max).toBe(1);

    prismaMock.plan.findUnique.mockResolvedValueOnce(null);
    expect(await svc.getPlan('pro')).toBeNull();
  });
});
