/**
 * @file Audit use cases — creates pipeline jobs, queries the Audit table,
 * and proxies report operations to the Report service via gRPC.
 * Enforces ownership (audit.userId === user.id) on every read/delete.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateAuditDto } from '../dto/create-audit.dto';
import { ListAuditsQuery } from '../dto/list-audits.query';
import { validateUrlSafety } from '../../common/utils/url-validator';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';
import { RedisService } from '../../infra/redis/redis.service';
import { RATE_LIMIT, AuditStatus, UserRole, REDIS_KEYS } from '@repo/shared';
import { AuditQueueProducer } from './audit-queue.producer';
import { ReportGrpcClient } from '../../infra/grpc/report.client';
import { clampPagination, buildPaginationMeta } from '../../common/utils/pagination.util';
import { Prisma } from '../../infra/prisma/generated';

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: RateLimiterService,
    private readonly redis: RedisService,
    private readonly producer: AuditQueueProducer,
    private readonly reportClient: ReportGrpcClient,
  ) {}

  async createAudit(userId: string, dto: CreateAuditDto) {
    const rl = await this.rateLimiter.consume(
      this.rateLimiter.auditBucket(userId),
      RATE_LIMIT.AUDIT_PER_HOUR,
      3600,
    );
    if (!rl.allowed) {
      throw new BadRequestException(
        `Da dat gioi han ${RATE_LIMIT.AUDIT_PER_HOUR} audits/gio. Thu lai sau ${rl.retryAfterSeconds}s`,
      );
    }

    const safe = await validateUrlSafety(dto.url);

    const audit = await this.prisma.audit.create({
      data: {
        userId,
        url: safe.href,
        domain: safe.domain,
        targetKeyword: dto.targetKeyword ?? null,
        status: AuditStatus.PENDING,
      },
    });

    await this.producer.enqueueCrawlStart({
      auditId: audit.id,
      url: safe.href,
      options: { targetKeyword: dto.targetKeyword },
    });

    return {
      auditId: audit.id,
      status: audit.status,
      message: 'Audit da bat dau xu ly',
    };
  }

  async listAudits(userId: string, query: ListAuditsQuery) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.AuditWhereInput = { userId };

    if (query.search) {
      where.OR = [
        { domain: { contains: query.search, mode: 'insensitive' } },
        { url: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.scoreMin !== undefined || query.scoreMax !== undefined) {
      where.seoScore = {};
      if (query.scoreMin !== undefined) (where.seoScore as any).gte = query.scoreMin;
      if (query.scoreMax !== undefined) (where.seoScore as any).lte = query.scoreMax;
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(query.dateTo);
    }

    const orderBy: Prisma.AuditOrderByWithRelationInput =
      query.sort === 'seoScore'
        ? { seoScore: query.order ?? 'desc' }
        : { createdAt: query.order ?? 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.audit.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.audit.count({ where }),
    ]);

    return {
      data: data.map((a) => ({
        id: a.id,
        url: a.url,
        domain: a.domain,
        status: a.status,
        seoScore: a.seoScore ? Number(a.seoScore) : null,
        targetKeyword: a.targetKeyword,
        crawlerType: a.crawlerType,
        crawlDurationMs: a.crawlDurationMs,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getAuditDetail(userId: string, role: UserRole, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Khong co quyen xem audit nay');
    }

    let report: unknown = null;
    try {
      report = await this.reportClient.getReport(auditId);
    } catch (e) {
      this.logger.warn(`Report service unavailable for audit ${auditId}: ${(e as Error).message}`);
    }

    return {
      audit: {
        id: audit.id,
        url: audit.url,
        domain: audit.domain,
        status: audit.status,
        seoScore: audit.seoScore ? Number(audit.seoScore) : null,
        targetKeyword: audit.targetKeyword,
        crawlerType: audit.crawlerType,
        crawlDurationMs: audit.crawlDurationMs,
        createdAt: audit.createdAt,
        completedAt: audit.completedAt,
        errorMessage: audit.errorMessage,
      },
      report,
    };
  }

  async getStatus(userId: string, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId) throw new ForbiddenException('Khong co quyen');

    const _stepsKey = REDIS_KEYS.auditCompletedSteps(auditId);
    const progressRaw = await this.redis.client.get(`audit:${auditId}:progress`);
    const stage = await this.redis.client.get(`audit:${auditId}:stage`);
    const progress = progressRaw ? Number(progressRaw) : audit.status === AuditStatus.COMPLETED ? 100 : 0;

    return {
      auditId,
      status: audit.status,
      progress,
      stage: stage ?? audit.status,
      seoScore: audit.seoScore ? Number(audit.seoScore) : undefined,
    };
  }

  async deleteAudit(userId: string, role: UserRole, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Khong co quyen xoa');
    }
    if (
      audit.status === AuditStatus.CRAWLING ||
      audit.status === AuditStatus.ANALYZING ||
      audit.status === AuditStatus.REPORTING
    ) {
      throw new BadRequestException('Khong the xoa audit dang xu ly');
    }
    await this.prisma.audit.delete({ where: { id: auditId } });
  }

  async ensureCompleted(auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.status !== AuditStatus.COMPLETED) {
      throw new BadRequestException('Audit chua hoan thanh');
    }
    return audit;
  }
}
