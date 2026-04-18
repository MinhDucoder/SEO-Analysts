/**
 * @file Redis pub/sub listener for `site-crawl.done` — emitted once
 * by the crawler's SiteCrawlAggregateWorker when a F1 site-wide
 * audit has fanned in. Finalizes the root Audit row (status
 * COMPLETED, seoScore=avg, counts) and caches the full summary in
 * Redis so the detail endpoint can return per-site aggregates
 * (worst pages, median, failed count) without touching the crawler.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditStatus } from '@repo/shared';
import { RedisService } from '../../infra/redis/redis.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditGateway } from '../../infra/websocket/audit.gateway';

const SUMMARY_TTL_SECONDS = 3600;

interface SiteCrawlSummary {
  rootUrl: string;
  totalUrls: number;
  auditedUrls: number;
  failedUrls: number;
  avgScore: number;
  medianScore: number;
  worstPages: Array<{ url: string; score: number; issueCount: number; error?: string }>;
}

interface SiteCrawlDonePayload {
  auditId?: string;
  summary?: SiteCrawlSummary;
}

@Injectable()
export class SiteCrawlSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(SiteCrawlSubscriberService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly gateway: AuditGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redis.subscribe('site-crawl.done', (data) =>
      this.handle(data as SiteCrawlDonePayload),
    );
    this.logger.log('Subscribed to site-crawl.done channel');
  }

  private async handle(payload: SiteCrawlDonePayload): Promise<void> {
    const auditId = payload?.auditId;
    const summary = payload?.summary;
    if (!auditId || !summary) return;

    try {
      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.COMPLETED,
          seoScore: summary.avgScore,
          discoveredUrlsCount: summary.totalUrls,
          auditedUrlsCount: summary.auditedUrls,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(
        `site-crawl.done finalize failed audit=${auditId}: ${(err as Error).message}`,
      );
      return;
    }

    await this.redis.client.set(
      `audit:${auditId}:site-summary`,
      JSON.stringify(summary),
      'EX',
      SUMMARY_TTL_SECONDS,
    );
    await this.redis.client.set(
      `audit:${auditId}:progress`,
      '100',
      'EX',
      SUMMARY_TTL_SECONDS,
    );

    this.gateway.emitCompleted(auditId, {
      auditId,
      finalScore: summary.avgScore,
      summary,
    });
  }
}
