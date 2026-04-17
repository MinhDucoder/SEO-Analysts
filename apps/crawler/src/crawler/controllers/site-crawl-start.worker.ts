/**
 * @file BullMQ worker for `site-crawl.start` — entry point for F1
 * site-wide audits. Responsibilities:
 *   1. discover URLs via SitemapDiscovery (robots → sitemap chain)
 *   2. set the fan-in counter for this audit to N
 *   3. enqueue N × `site-crawl.url-audit` jobs (one per URL)
 *   4. publish progress events so Gateway / UI can track the audit
 * On any failure (zero URLs / network error) it publishes
 * `crawl.failed` so downstream listeners can mark the Audit FAILED.
 */
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AuditStatus, BULLMQ_QUEUES, SITE_CRAWL_LIMITS } from '@repo/shared';
import { SitemapDiscovery } from '../infra/sitemap/sitemap-discovery';
import { SiteCrawlCounter } from '../services/site-crawl-counter.service';
import { EventPublisher } from '../services/event-publisher';

export interface SiteCrawlStartJobData {
  auditId: string;
  rootUrl: string;
  maxUrls?: number;
}

@Processor(BULLMQ_QUEUES.SITE_CRAWL_START)
export class SiteCrawlStartWorker extends WorkerHost {
  private readonly logger = new Logger(SiteCrawlStartWorker.name);

  constructor(
    private readonly discovery: SitemapDiscovery,
    private readonly counter: SiteCrawlCounter,
    @InjectQueue(BULLMQ_QUEUES.SITE_CRAWL_URL_AUDIT) private readonly urlAuditQueue: Queue,
    private readonly publisher: EventPublisher,
  ) {
    super();
  }

  async process(job: Job<SiteCrawlStartJobData>): Promise<void> {
    const { auditId, rootUrl, maxUrls } = job.data;
    const cap = Math.min(
      maxUrls ?? SITE_CRAWL_LIMITS.DEFAULT_MAX_URLS_PER_AUDIT,
      SITE_CRAWL_LIMITS.HARD_CAP_MAX_URLS_PER_AUDIT,
    );
    this.logger.log(`site-crawl.start job=${job.id} audit=${auditId} root=${rootUrl} maxUrls=${cap}`);

    try {
      await this.publisher.publishProgress(auditId, 10, 'site-crawl-discovery', AuditStatus.CRAWLING, 'Discovering URLs');

      const urls = await this.discovery.discoverAllUrls(rootUrl, cap);
      if (urls.length === 0) {
        throw new Error(`no URLs discovered for ${rootUrl} (robots.txt + /sitemap.xml both empty)`);
      }

      await this.counter.setExpected(auditId, urls.length);
      await this.publisher.publishProgress(
        auditId, 20, 'site-crawl-fanout', AuditStatus.CRAWLING, `Discovered ${urls.length} URLs, fanning out audits`,
      );

      for (const url of urls) {
        await this.urlAuditQueue.add(
          'site-crawl.url-audit',
          { auditId, url, rootUrl },
          { removeOnComplete: true, removeOnFail: false, attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
        );
      }

      this.logger.log(`enqueued ${urls.length} site-crawl.url-audit jobs for audit=${auditId}`);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`site-crawl.start failed audit=${auditId}: ${error.message}`);
      await this.publisher.publishCrawlFailed(auditId, error);
      throw error;
    }
  }
}
