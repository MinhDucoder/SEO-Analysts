import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRulesDto } from './dto/update-rules.dto';
import { AnalyzerGrpcClient } from '../grpc/analyzer.client';
import { clampPagination, buildPaginationMeta } from '../common/utils/pagination.util';
import { AuditStatus } from '@repo/shared';
import { Prisma } from '../generated/prisma';

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
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User khong ton tai');
    return this.prisma.user.update({
      where: { id: targetId },
      data: { isLocked: dto.isLocked },
      select: { id: true, email: true, isLocked: true },
    });
  }

  listRules() {
    return this.analyzer.listRules().then((rules) => ({ rules }));
  }

  async updateRules(dto: UpdateRulesDto) {
    const updated = [];
    for (const r of dto.rules) {
      try {
        // Resolve rule name → ruleId by listing first (cached server-side ideally)
        const all = await this.analyzer.listRules();
        const target = all.find((x) => x.name === r.name);
        if (!target) continue;
        const u = await this.analyzer.updateRuleWeight(target.id, r.weight);
        updated.push(u);
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
