import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminRevenueService } from '../../src/admin/services/admin-revenue.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';

describe('AdminRevenueService.getRevenue', () => {
  let svc: AdminRevenueService;
  const prisma = {
    paymentIntent: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    plan: { findMany: vi.fn() },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AdminRevenueService(prisma);
    (prisma.plan.findMany as any).mockResolvedValue([
      { code: 'free', displayName: 'Miễn phí' },
      { code: 'pro', displayName: 'Chuyên nghiệp' },
      { code: 'business', displayName: 'Doanh nghiệp' },
    ]);
  });

  it('computes gross/net/vat, delta vs previous period, and per-plan breakdown (free excluded)', async () => {
    (prisma.paymentIntent.aggregate as any)
      .mockResolvedValueOnce({ _sum: { amountVnd: 497000 }, _count: 3 }) // current
      .mockResolvedValueOnce({ _sum: { amountVnd: 400000 } }); // previous
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([
      { planCode: 'pro', _sum: { amountVnd: 198000 }, _count: { _all: 2 } },
      { planCode: 'business', _sum: { amountVnd: 299000 }, _count: { _all: 1 } },
    ]);

    const out = await svc.getRevenue({ type: 'month', year: 2026, month: 5 });

    expect(out.grossVnd).toBe(497000);
    expect(out.vatVnd).toBe(45182);
    expect(out.netVnd).toBe(451818);
    expect(out.vatPercent).toBe(10);
    expect(out.paidCount).toBe(3);
    expect(out.deltaPercent).toBe(24.25); // (497000-400000)/400000*100
    expect(out.period).toMatchObject({ type: 'month', year: 2026, month: 5, label: 'Tháng 5/2026' });
    expect(out.byPlan).toEqual([
      { planCode: 'business', displayName: 'Doanh nghiệp', count: 1, grossVnd: 299000 },
      { planCode: 'pro', displayName: 'Chuyên nghiệp', count: 2, grossVnd: 198000 },
    ]);
  });

  it('filters paid intents by paidAt within [start, end)', async () => {
    (prisma.paymentIntent.aggregate as any).mockResolvedValue({ _sum: { amountVnd: 0 }, _count: 0 });
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([]);

    await svc.getRevenue({ type: 'month', year: 2026, month: 5 });

    const where = (prisma.paymentIntent.aggregate as any).mock.calls[0][0].where;
    expect(where.status).toBe('paid');
    expect(where.paidAt.gte).toBeInstanceOf(Date);
    expect(where.paidAt.lt).toBeInstanceOf(Date);
    expect(where.paidAt.gte.getTime()).toBe(new Date(2026, 4, 1).getTime());
    expect(where.paidAt.lt.getTime()).toBe(new Date(2026, 5, 1).getTime());
  });

  it('returns null delta when the previous period had zero revenue, and empty byPlan', async () => {
    (prisma.paymentIntent.aggregate as any)
      .mockResolvedValueOnce({ _sum: { amountVnd: 99000 }, _count: 1 }) // current
      .mockResolvedValueOnce({ _sum: { amountVnd: null } }); // previous = 0
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([]);

    const out = await svc.getRevenue({ type: 'month', year: 2026, month: 5 });

    expect(out.deltaPercent).toBeNull();
    expect(out.byPlan).toEqual([]);
  });
});

describe('AdminRevenueService.buildCsv', () => {
  let svc: AdminRevenueService;
  const prisma = {
    paymentIntent: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    plan: { findMany: vi.fn() },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AdminRevenueService(prisma);
    (prisma.plan.findMany as any).mockResolvedValue([
      { code: 'pro', displayName: 'Chuyên nghiệp' },
      { code: 'business', displayName: 'Doanh nghiệp' },
    ]);
    (prisma.paymentIntent.aggregate as any).mockResolvedValue({ _sum: { amountVnd: 99000 }, _count: 1 });
    (prisma.paymentIntent.groupBy as any).mockResolvedValue([
      { planCode: 'pro', _sum: { amountVnd: 99000 }, _count: { _all: 1 } },
    ]);
    (prisma.paymentIntent.findMany as any).mockResolvedValue([
      {
        refCode: 'SEOAB,CDE',
        paidAt: new Date('2026-05-10T03:00:00.000Z'),
        amountVnd: 99000,
        planCode: 'pro',
        user: { email: 'u@x.com' },
      },
    ]);
  });

  it('builds a UTF-8-BOM CSV with a summary block + a detail row per transaction', async () => {
    const { filename, content } = await svc.buildCsv({ type: 'month', year: 2026, month: 5 });

    expect(filename).toBe('doanh-thu-2026-05.csv');
    expect(content.startsWith('﻿')).toBe(true);
    expect(content).toContain('Mã GD');
    expect(content).toContain('Doanh thu thuần (VND)');
    expect(content).toContain('"SEOAB,CDE"');
    expect(content).toContain('u@x.com');
    const lines = content.split('\n');
    const headerIdx = lines.findIndex((l) => l.startsWith('Mã GD'));
    expect(headerIdx).toBeGreaterThan(0);
    expect(lines.slice(headerIdx + 1).filter((l) => l.trim().length > 0)).toHaveLength(1);
  });

  it('names the file by quarter and by year', async () => {
    (prisma.paymentIntent.findMany as any).mockResolvedValue([]);
    const q = await svc.buildCsv({ type: 'quarter', year: 2026, quarter: 2 });
    expect(q.filename).toBe('doanh-thu-2026-Q2.csv');
    const y = await svc.buildCsv({ type: 'year', year: 2026 });
    expect(y.filename).toBe('doanh-thu-2026.csv');
  });
});
