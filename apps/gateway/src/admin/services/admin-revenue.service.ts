/**
 * @file Admin revenue reporting — calendar-period aggregates over confirmed
 * payments (PaymentIntent status='paid'), with per-plan breakdown,
 * previous-period delta, and CSV export. Revenue is VAT-inclusive; VAT is
 * split out of the gross total. Reads gateway Prisma directly (same pattern as
 * AdminService), since this is admin-only reporting.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RevenueQueryDto } from '../dto/revenue-query.dto';
import { resolvePeriod, previousPeriod, splitVat, VAT_PERCENT } from './admin-revenue.util';

export interface RevenueByPlan {
  planCode: string;
  displayName: string;
  count: number;
  grossVnd: number;
}

export interface RevenueResult {
  period: {
    type: string;
    year: number;
    month?: number;
    quarter?: number;
    label: string;
    start: string;
    end: string;
  };
  grossVnd: number;
  netVnd: number;
  vatVnd: number;
  vatPercent: number;
  paidCount: number;
  deltaPercent: number | null;
  byPlan: RevenueByPlan[];
}

@Injectable()
export class AdminRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenue(query: RevenueQueryDto): Promise<RevenueResult> {
    const period = resolvePeriod(query);
    const prev = previousPeriod(period);

    const [curAgg, prevAgg, planGroups, plans] = await Promise.all([
      this.prisma.paymentIntent.aggregate({
        where: { status: 'paid', paidAt: { gte: period.start, lt: period.end } },
        _sum: { amountVnd: true },
        _count: true,
      }),
      this.prisma.paymentIntent.aggregate({
        where: { status: 'paid', paidAt: { gte: prev.start, lt: prev.end } },
        _sum: { amountVnd: true },
      }),
      this.prisma.paymentIntent.groupBy({
        by: ['planCode'],
        where: { status: 'paid', paidAt: { gte: period.start, lt: period.end } },
        _sum: { amountVnd: true },
        _count: { _all: true },
      }),
      this.prisma.plan.findMany({ select: { code: true, displayName: true } }),
    ]);

    const grossVnd = curAgg._sum.amountVnd ?? 0;
    const { vatVnd, netVnd } = splitVat(grossVnd);

    const prevGross = prevAgg._sum.amountVnd ?? 0;
    const deltaPercent =
      prevGross === 0 ? null : Number((((grossVnd - prevGross) / prevGross) * 100).toFixed(2));

    const planNames = new Map(plans.map((p) => [p.code, p.displayName]));
    const byPlan: RevenueByPlan[] = planGroups
      .filter((g) => g.planCode !== 'free')
      .map((g) => ({
        planCode: g.planCode,
        displayName: planNames.get(g.planCode) ?? g.planCode,
        count: g._count._all,
        grossVnd: g._sum.amountVnd ?? 0,
      }))
      .sort((a, b) => b.grossVnd - a.grossVnd);

    return {
      period: {
        type: period.type,
        year: period.year,
        month: period.month,
        quarter: period.quarter,
        label: period.label,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      grossVnd,
      netVnd,
      vatVnd,
      vatPercent: VAT_PERCENT,
      paidCount: curAgg._count,
      deltaPercent,
      byPlan,
    };
  }

  /** Quote a CSV cell when it contains a comma, quote, or newline; double inner quotes. */
  private csvCell(value: string | number): string {
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  async buildCsv(query: RevenueQueryDto): Promise<{ filename: string; content: string }> {
    const period = resolvePeriod(query);
    const summary = await this.getRevenue(query);
    const txns = await this.prisma.paymentIntent.findMany({
      where: { status: 'paid', paidAt: { gte: period.start, lt: period.end } },
      select: {
        refCode: true,
        paidAt: true,
        amountVnd: true,
        planCode: true,
        user: { select: { email: true } },
      },
      orderBy: { paidAt: 'asc' },
    });

    const planNames = new Map(summary.byPlan.map((p) => [p.planCode, p.displayName]));
    const lines: string[] = [];

    // Summary block
    lines.push(this.csvCell('Báo cáo doanh thu') + ',' + this.csvCell(period.label));
    lines.push(this.csvCell('Tổng doanh thu (VND)') + ',' + this.csvCell(summary.grossVnd));
    lines.push(this.csvCell('Doanh thu thuần (VND)') + ',' + this.csvCell(summary.netVnd));
    lines.push(this.csvCell(`Thuế VAT (${summary.vatPercent}%) (VND)`) + ',' + this.csvCell(summary.vatVnd));
    lines.push(this.csvCell('Số giao dịch') + ',' + this.csvCell(summary.paidCount));
    for (const p of summary.byPlan) {
      lines.push(
        this.csvCell(`Gói ${p.displayName}`) + ',' + this.csvCell(p.grossVnd) + ',' + this.csvCell(`${p.count} GD`),
      );
    }

    lines.push(''); // blank separator

    // Detail block
    lines.push(
      ['Mã GD', 'Ngày thanh toán', 'Email', 'Gói', 'Doanh thu (VND)', 'VAT (VND)', 'Doanh thu thuần (VND)']
        .map((h) => this.csvCell(h))
        .join(','),
    );
    for (const t of txns) {
      const { vatVnd, netVnd } = splitVat(t.amountVnd);
      lines.push(
        [
          this.csvCell(t.refCode),
          this.csvCell(t.paidAt ? t.paidAt.toISOString() : ''),
          this.csvCell(t.user?.email ?? ''),
          this.csvCell(planNames.get(t.planCode) ?? t.planCode),
          this.csvCell(t.amountVnd),
          this.csvCell(vatVnd),
          this.csvCell(netVnd),
        ].join(','),
      );
    }

    const suffix =
      period.type === 'year'
        ? `${period.year}`
        : period.type === 'quarter'
          ? `${period.year}-Q${period.quarter}`
          : `${period.year}-${String(period.month).padStart(2, '0')}`;

    return { filename: `doanh-thu-${suffix}.csv`, content: '﻿' + lines.join('\n') };
  }
}
