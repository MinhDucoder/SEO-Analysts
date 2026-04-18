/**
 * @file Thin DI wrapper around BullMQ v5's Job Scheduler API for F2
 * scheduled audits. Keyed by `sched:<userId>:<scheduleId>` so that
 *   - upsertJobScheduler is idempotent for the lifetime of a schedule
 *   - deleting a user wipes every schedule via a single SCAN + remove
 *   - restart survives because schedulers live in Redis (the boot-time
 *     reconciler re-reads ScheduledAudit rows and upserts each).
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULLMQ_QUEUES, AuditMode } from '@repo/shared';

export interface SchedulePayload {
  scheduleId: string;
  userId: string;
  url: string;
  cron: string;
  mode: AuditMode;
  maxUrls?: number;
  targetKeyword?: string;
}

@Injectable()
export class ScheduledAuditScheduler {
  private readonly logger = new Logger(ScheduledAuditScheduler.name);

  constructor(
    @InjectQueue(BULLMQ_QUEUES.SCHEDULED_AUDIT_TICK) private readonly tickQueue: Queue,
  ) {}

  key(userId: string, scheduleId: string): string {
    return `sched:${userId}:${scheduleId}`;
  }

  async upsert(payload: SchedulePayload): Promise<void> {
    await this.tickQueue.upsertJobScheduler(
      this.key(payload.userId, payload.scheduleId),
      { pattern: payload.cron },
      {
        name: 'scheduled-audit.tick',
        data: {
          scheduleId: payload.scheduleId,
          userId: payload.userId,
          url: payload.url,
          mode: payload.mode,
          maxUrls: payload.maxUrls,
          targetKeyword: payload.targetKeyword,
        },
        opts: {
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      },
    );
    this.logger.log(`upserted scheduler ${this.key(payload.userId, payload.scheduleId)} pattern="${payload.cron}"`);
  }

  async remove(userId: string, scheduleId: string): Promise<void> {
    const id = this.key(userId, scheduleId);
    await this.tickQueue.removeJobScheduler(id);
    this.logger.log(`removed scheduler ${id}`);
  }
}
