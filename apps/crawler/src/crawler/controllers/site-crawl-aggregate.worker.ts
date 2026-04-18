/**
 * @file BullMQ worker for `site-crawl.aggregate` — fan-in stage of
 * the F1 site-wide pipeline. Fires once per audit after every URL
 * sub-audit has reported in (the counter's `complete=true` signal).
 * Reduces N per-URL scores to a site-level summary (avg, median,
 * top-10 worst pages, failed-URL count), publishes `site-crawl.done`
 * so downstream listeners can finalize the Audit row, then cleans up
 * the in-flight Redis state (counters + results list).
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditStatus, BULLMQ_QUEUES } from '@repo/shared';
import {
  PageAuditResult,
  PageAuditResultStore,
} from '../services/page-audit-result-store.service';
import { SiteCrawlCounter } from '../services/site-crawl-counter.service';
import { EventPublisher } from '../services/event-publisher';

export interface SiteCrawlAggregateJobData {
  auditId: string;
  rootUrl: string;
}

const WORST_PAGES_LIMIT = 10;

export interface WorstPage {
  url: string;
  score: number;
  issueCount: number;
  error?: string;
}

export interface SiteCrawlSummary {
  rootUrl: string;
  totalUrls: number;
  auditedUrls: number;
  failedUrls: number;
  avgScore: number;
  medianScore: number;
  worstPages: WorstPage[];
}

@Processor(BULLMQ_QUEUES.SITE_CRAWL_AGGREGATE)
export class SiteCrawlAggregateWorker extends WorkerHost {
  private readonly logger = new Logger(SiteCrawlAggregateWorker.name);

  constructor(
    private readonly resultStore: PageAuditResultStore,
    private readonly counter: SiteCrawlCounter,
    private readonly publisher: EventPublisher,
  ) {
    super();
  }

  async process(job: Job<SiteCrawlAggregateJobData>): Promise<void> {
    const { auditId, rootUrl } = job.data;
    this.logger.log(`site-crawl.aggregate job=${job.id} audit=${auditId}`);

    const results = await this.resultStore.readAll(auditId);
    const summary = this.summarize(rootUrl, results);

    await this.publisher.publishSiteCrawlDone(auditId, summary);
    await this.publisher.publishProgress(
      auditId,
      100,
      'site-crawl-done',
      AuditStatus.COMPLETED,
      `Audited ${summary.auditedUrls}/${summary.totalUrls} URLs, avg score ${summary.avgScore}`,
    );

    // Cleanup after publish so late subscribers still see a consistent list.
    await this.counter.cleanup(auditId);
    await this.resultStore.clear(auditId);
  }

  private summarize(rootUrl: string, results: PageAuditResult[]): SiteCrawlSummary {
    const totalUrls = results.length;
    if (totalUrls === 0) {
      return {
        rootUrl,
        totalUrls: 0,
        auditedUrls: 0,
        failedUrls: 0,
        avgScore: 0,
        medianScore: 0,
        worstPages: [],
      };
    }

    let failedUrls = 0;
    const scores: number[] = [];
    for (const r of results) {
      if (r.error) failedUrls++;
      scores.push(r.score);
    }
    const auditedUrls = totalUrls - failedUrls;

    const sum = scores.reduce((acc, s) => acc + s, 0);
    const avgScore = Math.round(sum / totalUrls);

    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    // totalUrls > 0 guarantees sorted is non-empty, so mid-1 and mid are in-range.
    const medianScore =
      sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
        : sorted[mid]!;

    const worstPages = [...results]
      .sort((a, b) => a.score - b.score)
      .slice(0, WORST_PAGES_LIMIT)
      .map((r) => ({
        url: r.url,
        score: r.score,
        issueCount: r.issues.length,
        ...(r.error ? { error: r.error } : {}),
      }));

    return { rootUrl, totalUrls, auditedUrls, failedUrls, avgScore, medianScore, worstPages };
  }
}
