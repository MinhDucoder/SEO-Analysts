/**
 * @file Redis pub/sub listener for `page-audit.done` — emitted once
 * per URL by the crawler's UrlAuditWorker during F1 site-wide audits.
 * Persists one PageAudit row per message so the gateway's detail API
 * can surface per-URL scores. Failures are swallowed (logged) so a
 * single bad row never tears down the whole listener.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface PageAuditDonePayload {
  auditId?: string;
  result?: {
    url?: string;
    score?: number;
    issues?: unknown[];
    fetchedAt?: string;
    error?: string;
  };
}

@Injectable()
export class PageAuditSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(PageAuditSubscriberService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redis.subscribe('page-audit.done', (data) =>
      this.handle(data as PageAuditDonePayload),
    );
    this.logger.log('Subscribed to page-audit.done channel');
  }

  private async handle(payload: PageAuditDonePayload): Promise<void> {
    const auditId = payload?.auditId;
    const result = payload?.result;
    if (!auditId || !result || !result.url) return;

    const fetchedAt = this.parseDate(result.fetchedAt);

    try {
      await this.prisma.pageAudit.create({
        data: {
          auditId,
          url: result.url,
          score: typeof result.score === 'number' ? result.score : 0,
          issues: (result.issues ?? []) as never,
          fetchedAt,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist PageAudit for audit=${auditId} url=${result.url}: ${(err as Error).message}`,
      );
    }
  }

  private parseDate(iso?: string): Date {
    if (!iso) return new Date();
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
}
