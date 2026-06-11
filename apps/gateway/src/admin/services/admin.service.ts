/**
 * @file Admin use cases — list/lock users, adjust rule weights (via
 * AnalyzerGrpcClient), and gather platform-wide stats (total users,
 * success rate, avg score, top domains over last N days).
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ListUsersQuery } from '../dto/list-users.query';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateRulesDto } from '../dto/update-rules.dto';
import { AnalyzerGrpcClient } from '../../infra/grpc/analyzer.client';
import { clampPagination, buildPaginationMeta } from '../../common/utils/pagination.util';
import { AuditStatus } from '@repo/shared';
import { Prisma } from '../../infra/prisma/generated';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: AnalyzerGrpcClient,
  ) {}

  async listUsers(query: ListUsersQuery) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (query.isLocked !== undefined) where.isLocked = query.isLocked === 'true';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { audits: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        isVerified: u.isVerified,
        isLocked: u.isLocked,
        oauthProvider: u.oauthProvider,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        auditCount: u._count.audits,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async updateUser(adminId: string, targetId: string, dto: UpdateUserDto) {
    if (adminId === targetId && dto.isLocked) {
      throw new BadRequestException('Admin khong the lock chinh minh');
    }
    // Self-demotion guard: changing your own role can only strip admin and
    // lock you out — block it the same way self-lock is blocked.
    if (adminId === targetId && dto.role !== undefined) {
      throw new BadRequestException('Admin khong the doi vai tro cua chinh minh');
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User khong ton tai');

    const data: Prisma.UserUpdateInput = {};
    if (dto.isLocked !== undefined) data.isLocked = dto.isLocked;
    if (dto.role !== undefined) data.role = dto.role;

    return this.prisma.user.update({
      where: { id: targetId },
      data,
      select: { id: true, email: true, isLocked: true, role: true },
    });
  }

  listRules() {
    return this.analyzer.listRules().then((rules) => ({ rules }));
  }

  async updateRules(dto: UpdateRulesDto) {
    // Resolve names → ids once. Saves one gRPC roundtrip per row when the
    // admin saves a batch (previous impl listed inside the loop).
    const all = await this.analyzer.listRules();
    const byName = new Map(all.map((x) => [x.name, x]));

    const updated = [] as Array<unknown>;
    for (const r of dto.rules) {
      const target = byName.get(r.name);
      if (!target) continue;
      if (r.weight === undefined && r.isEnabled === undefined) continue;
      try {
        let row = target;
        if (r.weight !== undefined) {
          row = await this.analyzer.updateRuleWeight(target.id, r.weight);
        }
        if (r.isEnabled !== undefined) {
          row = await this.analyzer.updateRuleEnabled(target.id, r.isEnabled);
        }
        updated.push(row);
      } catch (e) {
        throw new BadRequestException(`Khong the cap nhat rule ${r.name}: ${(e as Error).message}`);
      }
    }
    return { updated };
  }

  async getStats(periodDays = 30) {
    const since = new Date(Date.now() - periodDays * 86400 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalAudits,
      newUsersToday,
      auditsToday,
      successCount,
      failedCount,
      avgScoreAgg,
      avgDurationAgg,
      topDomains,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.audit.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.audit.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.audit.count({ where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } } }),
      this.prisma.audit.count({ where: { status: AuditStatus.FAILED, createdAt: { gte: since } } }),
      this.prisma.audit.aggregate({
        where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } },
        _avg: { seoScore: true },
      }),
      this.prisma.audit.aggregate({
        where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } },
        _avg: { crawlDurationMs: true },
      }),
      this.prisma.audit.groupBy({
        by: ['domain'],
        where: { createdAt: { gte: since } },
        _count: { domain: true },
        orderBy: { _count: { domain: 'desc' } },
        take: 10,
      }),
    ]);

    const totalAttempts = successCount + failedCount;
    const successRate = totalAttempts > 0 ? Number(((successCount / totalAttempts) * 100).toFixed(2)) : 0;

    return {
      overview: {
        totalUsers,
        totalAudits,
        successRate,
        avgCrawlTimeMs: Math.round(Number(avgDurationAgg._avg.crawlDurationMs ?? 0)),
        avgSeoScore: Number((avgScoreAgg._avg.seoScore ?? 0).toString()),
      },
      newUsersToday,
      auditsToday,
      topDomains: topDomains.map((d) => ({ domain: d.domain, count: d._count.domain })),
    };
  }
}
