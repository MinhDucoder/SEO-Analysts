/**
 * @file F2 — scheduled audit use cases. Each write-path method keeps
 * the Postgres row (source of truth for persistence) and the BullMQ
 * scheduler (source of truth for next-fire times) in lockstep.
 */
import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AuditMode } from '@repo/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateScheduledAuditDto } from '../dto/create-scheduled-audit.dto';
import { AuditModeDto } from '../../audits/dto/create-audit.dto';
import { validateUrlSafety } from '../../common/utils/url-validator';
import { ScheduledAuditScheduler } from './scheduled-audit-scheduler.service';
import { EntitlementService } from '../../billing/services/entitlement.service';

@Injectable()
export class ScheduledAuditsService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledAuditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: ScheduledAuditScheduler,
    private readonly entitlement: EntitlementService,
  ) {}

  /** On boot, re-register every active schedule with BullMQ. */
  async onModuleInit(): Promise<void> {
    try {
      const active = await this.prisma.scheduledAudit.findMany({ where: { isActive: true } });
      for (const s of active) {
        await this.scheduler.upsert({
          scheduleId: s.id,
          userId: s.userId,
          url: s.url,
          cron: s.cron,
          mode: s.mode as AuditMode,
          maxUrls: s.maxUrls ?? undefined,
          targetKeyword: s.targetKeyword ?? undefined,
        });
      }
      this.logger.log(`re-registered ${active.length} active schedules on boot`);
    } catch (err) {
      // boot reconciliation should never crash the app — schedulers
      // can be re-registered on the next upsert call instead.
      this.logger.warn(`scheduler boot reconcile failed: ${(err as Error).message}`);
    }
  }

  async create(userId: string, dto: CreateScheduledAuditDto) {
    const current = await this.prisma.scheduledAudit.count({ where: { userId, isActive: true } });
    const countCheck = await this.entitlement.checkScheduledAuditCount(userId, current);
    if (!countCheck.allowed) throw new ForbiddenException({ code: countCheck.code, message: countCheck.reason });
    const cronCheck = await this.entitlement.checkScheduledAuditCron(userId, dto.cron);
    if (!cronCheck.allowed) throw new ForbiddenException({ code: cronCheck.code, message: cronCheck.reason });

    const safe = await validateUrlSafety(dto.url);
    const mode = dto.mode === AuditModeDto.SITE ? AuditMode.SITE : AuditMode.SINGLE;

    const row = await this.prisma.scheduledAudit.create({
      data: {
        userId,
        url: safe.href,
        cron: dto.cron,
        mode,
        maxUrls: dto.maxUrls ?? null,
        targetKeyword: dto.targetKeyword ?? null,
      },
    });

    await this.scheduler.upsert({
      scheduleId: row.id,
      userId,
      url: row.url,
      cron: row.cron,
      mode: row.mode as AuditMode,
      maxUrls: row.maxUrls ?? undefined,
      targetKeyword: row.targetKeyword ?? undefined,
    });

    return this.toDto(row);
  }

  async list(userId: string) {
    const rows = await this.prisma.scheduledAudit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async get(userId: string, id: string) {
    const row = await this.prisma.scheduledAudit.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Scheduled audit khong ton tai');
    if (row.userId !== userId) throw new ForbiddenException('Khong co quyen xem lich nay');
    return this.toDto(row);
  }

  async toggle(userId: string, id: string, isActive: boolean) {
    const row = await this.prisma.scheduledAudit.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Scheduled audit khong ton tai');
    if (row.userId !== userId) throw new ForbiddenException('Khong co quyen sua lich nay');

    const updated = await this.prisma.scheduledAudit.update({
      where: { id },
      data: { isActive },
    });

    if (isActive) {
      await this.scheduler.upsert({
        scheduleId: updated.id,
        userId: updated.userId,
        url: updated.url,
        cron: updated.cron,
        mode: updated.mode as AuditMode,
        maxUrls: updated.maxUrls ?? undefined,
        targetKeyword: updated.targetKeyword ?? undefined,
      });
    } else {
      await this.scheduler.remove(userId, id);
    }
    return this.toDto(updated);
  }

  async delete(userId: string, id: string) {
    const row = await this.prisma.scheduledAudit.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Scheduled audit khong ton tai');
    if (row.userId !== userId) throw new ForbiddenException('Khong co quyen xoa lich nay');

    await this.prisma.scheduledAudit.delete({ where: { id } });
    try {
      await this.scheduler.remove(userId, id);
    } catch (err) {
      this.logger.warn(`scheduler remove failed for ${id}: ${(err as Error).message}`);
    }
  }

  private toDto(row: {
    id: string;
    userId: string;
    url: string;
    cron: string;
    mode: string;
    maxUrls: number | null;
    targetKeyword: string | null;
    lastRunAt: Date | null;
    lastScore: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      userId: row.userId,
      url: row.url,
      cron: row.cron,
      mode: row.mode,
      maxUrls: row.maxUrls,
      targetKeyword: row.targetKeyword,
      lastRunAt: row.lastRunAt,
      lastScore: row.lastScore,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
