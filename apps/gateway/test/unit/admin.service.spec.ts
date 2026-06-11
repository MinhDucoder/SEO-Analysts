import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from '../../src/admin/services/admin.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { AnalyzerGrpcClient } from '../../src/infra/grpc/analyzer.client';

describe('AdminService', () => {
  let svc: AdminService;
  const prisma = {
    user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    audit: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
  } as unknown as PrismaService;
  const analyzer = {
    listRules: vi.fn(),
    updateRuleWeight: vi.fn(),
    updateRuleEnabled: vi.fn(),
  } as unknown as AnalyzerGrpcClient;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AdminService(prisma, analyzer);
  });

  describe('listUsers', () => {
    it('maps rows (with audit count) and attaches pagination meta', async () => {
      (prisma.user.findMany as any).mockResolvedValue([
        {
          id: 'u1', email: 'a@x.com', fullName: 'A', role: 'user', isVerified: true,
          isLocked: false, oauthProvider: null, avatarUrl: null, createdAt: new Date('2026-01-01'),
          _count: { audits: 7 },
        },
      ]);
      (prisma.user.count as any).mockResolvedValue(1);

      const out = await svc.listUsers({});

      expect(out.data[0]).toMatchObject({ id: 'u1', email: 'a@x.com', auditCount: 7 });
      expect(out.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('builds a case-insensitive search filter over email and fullName', async () => {
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.user.count as any).mockResolvedValue(0);

      await svc.listUsers({ search: 'minh' });

      const where = (prisma.user.findMany as any).mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { email: { contains: 'minh', mode: 'insensitive' } },
        { fullName: { contains: 'minh', mode: 'insensitive' } },
      ]);
    });

    it('translates the isLocked query string into a boolean filter', async () => {
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.user.count as any).mockResolvedValue(0);

      await svc.listUsers({ isLocked: 'true', role: 'admin' });

      const where = (prisma.user.findMany as any).mock.calls[0][0].where;
      expect(where.isLocked).toBe(true);
      expect(where.role).toBe('admin');
    });
  });

  describe('updateUser', () => {
    it('forbids an admin from locking their own account', async () => {
      await expect(svc.updateUser('a1', 'a1', { isLocked: true })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('forbids an admin from changing their own role', async () => {
      await expect(svc.updateUser('a1', 'a1', { role: 'user' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound when the target user is missing', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      await expect(svc.updateUser('a1', 'u2', { isLocked: true })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('locks / promotes another user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u2' });
      (prisma.user.update as any).mockResolvedValue({ id: 'u2', email: 'b@x.com', isLocked: true, role: 'admin' });

      const out = await svc.updateUser('a1', 'u2', { isLocked: true, role: 'admin' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { isLocked: true, role: 'admin' },
        select: { id: true, email: true, isLocked: true, role: true },
      });
      expect(out).toMatchObject({ id: 'u2', isLocked: true, role: 'admin' });
    });
  });

  describe('updateRules', () => {
    it('resolves rule names to ids and applies weight then enabled flags', async () => {
      (analyzer.listRules as any).mockResolvedValue([
        { id: 'r1', name: 'title-tag' },
        { id: 'r2', name: 'meta-description' },
      ]);
      (analyzer.updateRuleWeight as any).mockResolvedValue({ id: 'r1', weight: 5 });
      (analyzer.updateRuleEnabled as any).mockResolvedValue({ id: 'r1', weight: 5, isEnabled: false });

      const out = await svc.updateRules({ rules: [{ name: 'title-tag', weight: 5, isEnabled: false }] });

      expect(analyzer.updateRuleWeight).toHaveBeenCalledWith('r1', 5);
      expect(analyzer.updateRuleEnabled).toHaveBeenCalledWith('r1', false);
      expect(out.updated).toHaveLength(1);
    });

    it('skips unknown rule names and no-op rows', async () => {
      (analyzer.listRules as any).mockResolvedValue([{ id: 'r1', name: 'title-tag' }]);

      const out = await svc.updateRules({
        rules: [{ name: 'does-not-exist', weight: 9 }, { name: 'title-tag' }],
      });

      expect(analyzer.updateRuleWeight).not.toHaveBeenCalled();
      expect(analyzer.updateRuleEnabled).not.toHaveBeenCalled();
      expect(out.updated).toHaveLength(0);
    });

    it('wraps a downstream gRPC failure in a BadRequest', async () => {
      (analyzer.listRules as any).mockResolvedValue([{ id: 'r1', name: 'title-tag' }]);
      (analyzer.updateRuleWeight as any).mockRejectedValue(new Error('grpc unavailable'));

      await expect(svc.updateRules({ rules: [{ name: 'title-tag', weight: 5 }] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('computes success rate, averages, and top domains', async () => {
      (prisma.user.count as any)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(3); // newUsersToday
      (prisma.audit.count as any)
        .mockResolvedValueOnce(500) // totalAudits
        .mockResolvedValueOnce(12) // auditsToday
        .mockResolvedValueOnce(80) // successCount
        .mockResolvedValueOnce(20); // failedCount
      (prisma.audit.aggregate as any)
        .mockResolvedValueOnce({ _avg: { seoScore: 73.5 } })
        .mockResolvedValueOnce({ _avg: { crawlDurationMs: 1499.6 } });
      (prisma.audit.groupBy as any).mockResolvedValue([
        { domain: 'a.com', _count: { domain: 9 } },
        { domain: 'b.com', _count: { domain: 4 } },
      ]);

      const stats = await svc.getStats();

      expect(stats.overview.totalUsers).toBe(100);
      expect(stats.overview.totalAudits).toBe(500);
      expect(stats.overview.successRate).toBe(80); // 80 / (80+20) * 100
      expect(stats.overview.avgCrawlTimeMs).toBe(1500); // rounded
      expect(stats.overview.avgSeoScore).toBe(73.5);
      expect(stats.newUsersToday).toBe(3);
      expect(stats.auditsToday).toBe(12);
      expect(stats.topDomains).toEqual([
        { domain: 'a.com', count: 9 },
        { domain: 'b.com', count: 4 },
      ]);
      expect(stats).not.toHaveProperty('revenue');
    });

    it('reports a 0 success rate when there are no completed/failed audits', async () => {
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.audit.count as any).mockResolvedValue(0);
      (prisma.audit.aggregate as any).mockResolvedValue({ _avg: { seoScore: null, crawlDurationMs: null } });
      (prisma.audit.groupBy as any).mockResolvedValue([]);

      const stats = await svc.getStats();
      expect(stats.overview.successRate).toBe(0);
      expect(stats.overview.avgSeoScore).toBe(0);
      expect(stats.overview.avgCrawlTimeMs).toBe(0);
    });
  });
});
