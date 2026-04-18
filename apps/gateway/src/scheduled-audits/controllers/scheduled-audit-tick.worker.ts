/**
 * @file BullMQ worker for `scheduled-audit.tick` — fires on the cron
 * pattern each ScheduledAudit registered with the Job Scheduler.
 * Responsibilities:
 *   1. look up the ScheduledAudit row (dropped scheduler = dropped job)
 *   2. create a new Audit row owned by the schedule's userId
 *   3. enqueue the normal pipeline (crawl.start or site-crawl.start)
 *   4. remember the Audit→schedule link in Redis so the regression
 *      detector can route audit.completed back to the right schedule
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditStatus, AuditMode, BULLMQ_QUEUES } from '@repo/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { AuditQueueProducer } from '../../audits/services/audit-queue.producer';

interface TickJobData {
  scheduleId: string;
  userId: string;
  url: string;
  mode: AuditMode;
  maxUrls?: number;
  targetKeyword?: string;
}

const SCHEDULE_MAP_TTL = 24 * 3600;

@Processor(BULLMQ_QUEUES.SCHEDULED_AUDIT_TICK)
export class ScheduledAuditTickWorker extends WorkerHost {
  private readonly logger = new Logger(ScheduledAuditTickWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly producer: AuditQueueProducer,
  ) {
    super();
  }

  async process(job: Job<TickJobData>): Promise<void> {
    const { scheduleId, userId, url, mode, maxUrls, targetKeyword } = job.data;
    this.logger.log(`scheduled-audit.tick scheduleId=${scheduleId} user=${userId}`);

    // Guard: drop ticks for deleted / paused schedules so BullMQ's
    // scheduler-survives-Redis-restart-but-DB-row-gone edge case
    // never spams the pipeline.
    const schedule = await this.prisma.scheduledAudit.findUnique({ where: { id: scheduleId } });
    if (!schedule || !schedule.isActive) {
      this.logger.warn(`skipping tick: schedule ${scheduleId} missing or inactive`);
      return;
    }

    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch {
      this.logger.error(`invalid url on schedule ${scheduleId}: ${url}`);
      return;
    }

    const audit = await this.prisma.audit.create({
      data: {
        userId,
        url,
        domain,
        mode,
        targetKeyword: targetKeyword ?? null,
        status: AuditStatus.PENDING,
      },
    });

    // Map audit→schedule so RegressionDetector can look it up on completion.
    await this.redis.client.set(
      `audit:${audit.id}:schedule`,
      scheduleId,
      'EX',
      SCHEDULE_MAP_TTL,
    );

    // Also update lastRunAt immediately so the UI reflects the tick.
    await this.prisma.scheduledAudit.update({
      where: { id: scheduleId },
      data: { lastRunAt: new Date() },
    });

    if (mode === AuditMode.SITE) {
      await this.producer.enqueueSiteCrawlStart({
        auditId: audit.id,
        rootUrl: url,
        maxUrls,
        targetKeyword,
      });
    } else {
      await this.producer.enqueueCrawlStart({
        auditId: audit.id,
        url,
        options: { targetKeyword },
      });
    }

    this.logger.log(`enqueued ${mode}-mode audit ${audit.id} from schedule ${scheduleId}`);
  }
}
