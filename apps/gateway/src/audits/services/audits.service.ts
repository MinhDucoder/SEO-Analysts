/**
 * @file Audit use cases — creates pipeline jobs, queries the Audit table,
 * and proxies report operations to the Report service via gRPC.
 * Enforces ownership (audit.userId === user.id) on every read/delete.
 */
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateAuditDto, AuditModeDto } from '../dto/create-audit.dto';
import { ListAuditsQuery } from '../dto/list-audits.query';
import { validateUrlSafety } from '../../common/utils/url-validator';
import { RateLimiterService } from '../../infra/redis/rate-limiter.service';
import { RedisService } from '../../infra/redis/redis.service';
import {
  RATE_LIMIT,
  AuditStatus,
  AuditMode,
  UserRole,
  SITE_CRAWL_LIMITS,
  FeatureFlag,
  PLAN_FEATURES,
} from '@repo/shared';
import { AuditQueueProducer } from './audit-queue.producer';
import { ReportGrpcClient } from '../../infra/grpc/report.client';
import { EntitlementService } from '../../billing/services/entitlement.service';
import { QuotaCounterService } from '../../billing/services/quota-counter.service';
import { FeatureNotAvailableError, QuotaExceededError } from '../../billing/domain/billing.errors';
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
    private readonly entitlement: EntitlementService,
    private readonly config: ConfigService,
    private readonly counter: QuotaCounterService,
  ) {}

  async createAudit(userId: string, dto: CreateAuditDto) {
    const mode = dto.mode === AuditModeDto.SITE ? AuditMode.SITE : AuditMode.SINGLE;

    // Gate site-mode behind SITE_AUDIT feature entitlement
    if (mode === AuditMode.SITE) {
      const featureDecision = await this.entitlement.hasFeature(userId, FeatureFlag.SITE_AUDIT);
      if (!featureDecision.allowed) {
        const plan = await this.entitlement.getEffectivePlan(userId);
        throw new FeatureNotAvailableError(FeatureFlag.SITE_AUDIT, plan);
      }
      if (dto.maxUrls !== undefined) {
        const pageDecision = await this.entitlement.checkSiteAuditPageCount(userId, dto.maxUrls);
        if (!pageDecision.allowed) {
          const plan = await this.entitlement.getEffectivePlan(userId);
          throw new FeatureNotAvailableError('site_audit_max_pages', plan);
        }
      }
    }

    if (mode === AuditMode.SITE && dto.maxUrls !== undefined) {
      if (dto.maxUrls > SITE_CRAWL_LIMITS.HARD_CAP_MAX_URLS_PER_AUDIT) {
        throw new BadRequestException(
          `maxUrls vuot qua gioi han ${SITE_CRAWL_LIMITS.HARD_CAP_MAX_URLS_PER_AUDIT}`,
        );
      }
    }

    // Admin god-mode: no per-hour audit rate limit.
    if (!(await this.entitlement.isAdmin(userId))) {
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
    }

    const safe = await validateUrlSafety(dto.url);

    const audit = await this.prisma.audit.create({
      data: {
        userId,
        url: safe.href,
        domain: safe.domain,
        mode,
        targetKeyword: dto.targetKeyword ?? null,
        status: AuditStatus.PENDING,
      },
    });

    if (mode === AuditMode.SITE) {
      await this.producer.enqueueSiteCrawlStart({
        auditId: audit.id,
        rootUrl: safe.href,
        maxUrls: dto.maxUrls,
        targetKeyword: dto.targetKeyword,
      });
    } else {
      await this.producer.enqueueCrawlStart({
        auditId: audit.id,
        url: safe.href,
        options: { targetKeyword: dto.targetKeyword },
      });
    }

    return {
      auditId: audit.id,
      status: audit.status,
      mode: audit.mode,
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

    const auditView = {
      id: audit.id,
      url: audit.url,
      domain: audit.domain,
      status: audit.status,
      mode: audit.mode,
      seoScore: audit.seoScore ? Number(audit.seoScore) : null,
      targetKeyword: audit.targetKeyword,
      crawlerType: audit.crawlerType,
      crawlDurationMs: audit.crawlDurationMs,
      discoveredUrlsCount: audit.discoveredUrlsCount,
      auditedUrlsCount: audit.auditedUrlsCount,
      createdAt: audit.createdAt,
      completedAt: audit.completedAt,
      errorMessage: audit.errorMessage,
    };

    // Site-mode audits never produce a per-page Report in the report service —
    // their results live in the gateway's own page_audits table + Audit summary
    // columns. Building the aggregate from the DB (not the 1h Redis cache) keeps
    // the detail page working for audits older than the cache TTL.
    if (audit.mode === AuditMode.SITE) {
      const siteSummary = await this.buildSiteSummary(audit);
      return { audit: auditView, report: null, siteSummary };
    }

    let report: unknown = null;
    try {
      report = await this.reportClient.getReport(auditId);
    } catch (e) {
      this.logger.warn(`Report service unavailable for audit ${auditId}: ${(e as Error).message}`);
    }

    return { audit: auditView, report, siteSummary: null };
  }

  /**
   * Aggregate view for a SITE-mode audit, recomputed from the durable
   * page_audits rows + Audit summary columns. `worstPages` carries the 10
   * lowest-scoring URLs with their failing-issue count.
   */
  private async buildSiteSummary(audit: {
    id: string;
    seoScore: Prisma.Decimal | null;
    discoveredUrlsCount: number | null;
    auditedUrlsCount: number | null;
  }) {
    const [scoreRows, worst] = await Promise.all([
      this.prisma.pageAudit.findMany({ where: { auditId: audit.id }, select: { score: true } }),
      this.prisma.pageAudit.findMany({
        where: { auditId: audit.id },
        orderBy: { score: 'asc' },
        take: 10,
        select: { url: true, score: true, issues: true },
      }),
    ]);

    const scores = scoreRows.map((r) => r.score).sort((a, b) => a - b);
    const medianScore =
      scores.length === 0
        ? 0
        : scores.length % 2 === 0
          ? Math.round((scores[scores.length / 2 - 1]! + scores[scores.length / 2]!) / 2)
          : scores[(scores.length - 1) / 2]!;

    const totalUrls = audit.discoveredUrlsCount ?? scoreRows.length;
    const auditedUrls = audit.auditedUrlsCount ?? scoreRows.length;

    return {
      totalUrls,
      auditedUrls,
      failedUrls: Math.max(0, totalUrls - auditedUrls),
      avgScore: audit.seoScore ? Number(audit.seoScore) : 0,
      medianScore,
      worstPages: worst.map((w) => ({
        url: w.url,
        score: w.score,
        issueCount: countFailingIssues(w.issues),
      })),
    };
  }

  /**
   * Paginated per-URL results for a SITE-mode audit (lowest score first), so
   * the detail page can render the full crawled-page table. Returns the flat
   * `{ data, total, page, limit }` shape the web client's `Paginated<T>` expects.
   */
  async getAuditPages(
    userId: string,
    role: UserRole,
    auditId: string,
    query: { page?: number; limit?: number },
  ) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Khong co quyen xem audit nay');
    }

    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.PageAuditWhereInput = { auditId };
    const [rows, total] = await Promise.all([
      this.prisma.pageAudit.findMany({
        where,
        orderBy: { score: 'asc' },
        skip,
        take: limit,
        select: { url: true, score: true, issues: true, fetchedAt: true },
      }),
      this.prisma.pageAudit.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        url: r.url,
        score: r.score,
        issueCount: countFailingIssues(r.issues),
        fetchedAt: r.fetchedAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getStatus(userId: string, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId) throw new ForbiddenException('Khong co quyen');

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

  /**
   * On-demand AI suggestion for a completed single-mode audit. Quota
   * (`ai_calls_monthly`) is metered HERE — the only place that knows the
   * user's subscription. Peek before the (expensive) LLM call; consume 1
   * lượt ONLY when the report service reports `generated`. Admin + billing-off
   * bypass metering (mirrors PlanGuard/QuotaGuard).
   */
  async suggest(userId: string, role: UserRole, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Khong co quyen xem audit nay');
    }
    if (audit.mode !== AuditMode.SINGLE) {
      throw new BadRequestException('AI goi y chi ho tro audit don trang');
    }
    if (audit.status !== AuditStatus.COMPLETED) {
      throw new BadRequestException('Audit chua hoan thanh');
    }

    const billingOn = this.config.get<string>('BILLING_FEATURE_ENABLED') === 'true';
    const isAdmin = await this.entitlement.isAdmin(userId);
    const meter = billingOn && !isAdmin;

    let limit = 0;
    if (meter) {
      const plan = await this.entitlement.getEffectivePlan(userId);
      limit = PLAN_FEATURES[plan].ai_calls_monthly;
      const peek = await this.counter.peek(userId, 'ai_calls_monthly', limit);
      if (!peek.allowed) throw new QuotaExceededError('ai_calls_monthly', limit, peek.resetAt);
    }

    const res = (await this.reportClient.generateSuggestions(auditId)) as {
      status: string;
      count: number;
      aiSuggestionsGeneratedAt: string;
    };

    if (res.status === 'disabled') {
      throw new ServiceUnavailableException('Tinh nang AI dang tat');
    }
    if (res.status === 'failed') {
      throw new BadGatewayException('Tao AI goi y that bai, thu lai sau');
    }

    let remaining: number | null = null;
    if (meter) {
      remaining =
        res.status === 'generated'
          ? (await this.counter.consume(userId, 'ai_calls_monthly', limit, 1)).remaining
          : (await this.counter.peek(userId, 'ai_calls_monthly', limit)).remaining;
    }

    return { status: res.status, count: res.count, remaining };
  }
}

/**
 * Count only the actionable issues (fail/warn) in a stored page_audits.issues
 * blob. New rows carry proto enum names (CHECK_STATUS_FAIL); tolerate the
 * lowercase form too for rows written before the analyzer wire-format fix.
 */
function countFailingIssues(issues: unknown): number {
  if (!Array.isArray(issues)) return 0;
  return issues.filter((i) => {
    const status = (i as { status?: unknown } | null)?.status;
    return (
      status === 'fail' ||
      status === 'warn' ||
      status === 'CHECK_STATUS_FAIL' ||
      status === 'CHECK_STATUS_WARN'
    );
  }).length;
}
