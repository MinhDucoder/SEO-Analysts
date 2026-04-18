/**
 * @file Redis list holding per-URL audit results for the F1 site-wide
 * pipeline. The url-audit worker appends one entry per URL; the
 * aggregate worker reads the full list to compute site-level score
 * (avg/median/worst). Gateway persists each entry to Postgres via the
 * `page-audit.done` pub/sub channel — this list is the in-flight
 * working set the aggregate worker consumes without touching the
 * gateway DB.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../persistence/cache.service';

const EXPIRE_SECONDS = 3600;

export interface PageAuditIssue {
  ruleId: string;
  ruleName: string;
  status: string;
  score: number;
  message?: string;
  suggestion?: string;
  category?: string;
}

export interface PageAuditResult {
  url: string;
  score: number;
  issues: PageAuditIssue[];
  fetchedAt: string;
  error?: string;
}

@Injectable()
export class PageAuditResultStore {
  private readonly logger = new Logger(PageAuditResultStore.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async append(auditId: string, result: PageAuditResult): Promise<void> {
    const key = this.key(auditId);
    await this.redis.rpush(key, JSON.stringify(result));
    await this.redis.expire(key, EXPIRE_SECONDS);
  }

  async readAll(auditId: string): Promise<PageAuditResult[]> {
    const raw = await this.redis.lrange(this.key(auditId), 0, -1);
    const out: PageAuditResult[] = [];
    for (const entry of raw) {
      try {
        out.push(JSON.parse(entry) as PageAuditResult);
      } catch (err) {
        this.logger.warn(
          `dropping corrupt page-audit entry for audit=${auditId}: ${(err as Error).message}`,
        );
      }
    }
    return out;
  }

  async count(auditId: string): Promise<number> {
    return this.redis.llen(this.key(auditId));
  }

  async clear(auditId: string): Promise<void> {
    await this.redis.del(this.key(auditId));
  }

  private key(auditId: string): string {
    return `site-crawl:${auditId}:results`;
  }
}
