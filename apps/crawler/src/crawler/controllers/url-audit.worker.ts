/**
 * @file BullMQ worker for `site-crawl.url-audit` — runs one sub-audit
 * per URL fanned out by the site-crawl start worker. Pipeline per URL:
 *   1. CrawlerOrchestrator.crawl() (skip Lighthouse — too expensive
 *      at site scale; the aggregate score already covers the root URL)
 *   2. AnalyzerGrpcClient.analyzePage() — synchronous gRPC (cheaper
 *      than fanning N jobs into BullMQ for 500 URLs)
 *   3. Append to PageAuditResultStore (Redis list) for aggregate worker
 *   4. Publish `page-audit.done` so gateway persists the PageAudit row
 *   5. Mark done in SiteCrawlCounter → if the whole audit is complete,
 *      enqueue `site-crawl.aggregate`
 * Per-URL failures are recorded as zero-score results but never
 * rethrown — one dead URL must not stall the whole site audit.
 */
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { AuditStatus, BULLMQ_QUEUES } from '@repo/shared';
import { CrawlerOrchestrator } from '../services/crawler.orchestrator';
import { AnalyzerGrpcClient, AnalyzerRuleResult } from '../infra/grpc/analyzer-grpc-client';
import {
  PageAuditResult,
  PageAuditResultStore,
} from '../services/page-audit-result-store.service';
import { SiteCrawlCounter } from '../services/site-crawl-counter.service';
import { EventPublisher } from '../services/event-publisher';

export interface UrlAuditJobData {
  auditId: string;
  url: string;
  rootUrl: string;
  targetKeyword?: string;
}

@Processor(BULLMQ_QUEUES.SITE_CRAWL_URL_AUDIT)
export class UrlAuditWorker extends WorkerHost {
  private readonly logger = new Logger(UrlAuditWorker.name);

  constructor(
    private readonly orchestrator: CrawlerOrchestrator,
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly resultStore: PageAuditResultStore,
    private readonly counter: SiteCrawlCounter,
    private readonly publisher: EventPublisher,
    @InjectQueue(BULLMQ_QUEUES.SITE_CRAWL_AGGREGATE) private readonly aggregateQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<UrlAuditJobData>): Promise<void> {
    const { auditId, url, rootUrl, targetKeyword } = job.data;
    this.logger.log(`url-audit job=${job.id} audit=${auditId} url=${url}`);

    const result = await this.runSubAudit(auditId, url, targetKeyword);

    // Always persist + publish + count, even on failure — prevents stuck audits
    await this.resultStore.append(auditId, result);
    await this.publisher.publishPageAuditDone(auditId, result);
    const { done, expected, complete } = await this.counter.markDone(auditId);

    if (expected !== null && expected > 0) {
      // 20% discovery complete -> 90% just before aggregate; linear in progress fraction
      const pct = Math.min(90, 20 + Math.floor((done / expected) * 70));
      await this.publisher.publishProgress(
        auditId,
        pct,
        'site-crawl-audit',
        AuditStatus.CRAWLING,
        `${done}/${expected} URLs audited`,
      );
    }

    if (complete) {
      await this.aggregateQueue.add(
        'site-crawl.aggregate',
        { auditId, rootUrl },
        {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      this.logger.log(`url-audit fan-in complete audit=${auditId}, aggregate enqueued`);
    }
  }

  private async runSubAudit(
    auditId: string,
    url: string,
    targetKeyword?: string,
  ): Promise<PageAuditResult> {
    const fetchedAt = new Date().toISOString();
    try {
      const crawl = await this.orchestrator.crawl(url, { includeLighthouse: false });
      const analyze = await this.analyzer.analyzePage(auditId, crawl.pageData, targetKeyword);
      return {
        url,
        score: Math.round(analyze.overallScore),
        issues: analyze.ruleResults.map((r: AnalyzerRuleResult) => ({
          ruleId: r.ruleId,
          ruleName: r.ruleName,
          status: r.status,
          score: r.score,
          message: r.message,
          suggestion: r.suggestion,
          category: r.category,
        })),
        fetchedAt,
      };
    } catch (err) {
      const error = err as Error;
      this.logger.warn(`url-audit failed audit=${auditId} url=${url}: ${error.message}`);
      return {
        url,
        score: 0,
        issues: [],
        fetchedAt,
        error: error.message,
      };
    }
  }
}
