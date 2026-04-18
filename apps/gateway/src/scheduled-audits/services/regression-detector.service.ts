/**
 * @file F2 regression detector. Listens on Redis pub/sub channels
 * that signal an audit is finished (single-mode: `report.done`,
 * site-mode: `site-crawl.done`) and, if the Audit row is linked to a
 * ScheduledAudit, compares the new score to the previous snapshot.
 * Anything worse than SCORE_DROP_THRESHOLD writes an AuditAlert row
 * with type=score_drop. A score of 0 (site unreachable) writes a
 * site_down alert. Updates ScheduledAudit.lastScore on every run.
 *
 * This subscriber deliberately does NOT send email/webhooks itself
 * — alerting transport is a separate concern (alert.send queue) the
 * product can wire to SMTP / Slack / webhook later.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AlertType, SCHEDULED_AUDIT_LIMITS } from '@repo/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

interface CompletedPayload {
  auditId?: string;
  finalScore?: number;
  summary?: { avgScore?: number };
}

@Injectable()
export class RegressionDetectorService implements OnModuleInit {
  private readonly logger = new Logger(RegressionDetectorService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Piggy-back on the existing completion signals rather than
    // invent a new one — keeps the channel list short.
    await this.redis.subscribe('report.done', (data) => this.handle(data as CompletedPayload));
    await this.redis.subscribe('site-crawl.done', (data) =>
      this.handle(data as CompletedPayload, true),
    );
    this.logger.log('Subscribed to report.done + site-crawl.done for regression detection');
  }

  private async handle(payload: CompletedPayload, site = false): Promise<void> {
    const auditId = payload?.auditId;
    if (!auditId) return;

    const scheduleId = await this.redis.client.get(`audit:${auditId}:schedule`);
    if (!scheduleId) return; // not a scheduled audit — nothing to compare against

    const score = site ? payload.summary?.avgScore : payload.finalScore;
    if (typeof score !== 'number') {
      this.logger.warn(`no score on ${site ? 'site-crawl.done' : 'report.done'} for audit=${auditId}`);
      return;
    }

    try {
      const schedule = await this.prisma.scheduledAudit.findUnique({ where: { id: scheduleId } });
      if (!schedule) {
        this.logger.warn(`audit ${auditId} maps to missing schedule ${scheduleId}`);
        return;
      }

      const previous = schedule.lastScore;
      await this.prisma.scheduledAudit.update({
        where: { id: scheduleId },
        data: { lastScore: Math.round(score) },
      });

      if (score === 0) {
        await this.emit(auditId, scheduleId, AlertType.SITE_DOWN, null, 'Site returned zero score — possibly down');
        return;
      }

      if (previous !== null && previous !== undefined) {
        const delta = previous - Math.round(score);
        if (delta >= SCHEDULED_AUDIT_LIMITS.SCORE_DROP_THRESHOLD) {
          await this.emit(
            auditId,
            scheduleId,
            AlertType.SCORE_DROP,
            delta,
            `SEO score dropped ${delta} points (from ${previous} to ${Math.round(score)})`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`regression detect failed audit=${auditId}: ${(err as Error).message}`);
    }
  }

  private async emit(
    auditId: string,
    scheduleId: string,
    type: AlertType,
    deltaScore: number | null,
    message: string,
  ): Promise<void> {
    try {
      await this.prisma.auditAlert.create({
        data: {
          auditId,
          scheduleId,
          type,
          deltaScore,
          message,
        },
      });
      this.logger.log(`emitted ${type} alert for audit=${auditId}: ${message}`);
    } catch (err) {
      this.logger.warn(
        `failed to persist AuditAlert for audit=${auditId}: ${(err as Error).message}`,
      );
    }
  }
}
