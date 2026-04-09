import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AuditGateway } from './audit.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AuditStatus } from '@repo/shared';

interface ProgressPayload {
  auditId: string;
  progress?: number;
  stage?: string;
  message?: string;
  finalScore?: number;
  error?: string;
}

@Injectable()
export class ProgressSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(ProgressSubscriberService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: AuditGateway,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.redis.subscribe('audit.progress', (data) => this.handleProgress(data as ProgressPayload));
    await this.redis.subscribe('audit.completed', (data) => this.handleCompleted(data as ProgressPayload));
    await this.redis.subscribe('audit.failed', (data) => this.handleFailed(data as ProgressPayload));
    await this.redis.subscribe('report.done', (data) => this.handleReportDone(data as ProgressPayload));
    this.logger.log('Subscribed to audit.progress / audit.completed / audit.failed / report.done channels');
  }

  private async handleReportDone(p: ProgressPayload) {
    if (!p?.auditId) return;
    // Only process if audit is not already completed (idempotent guard)
    const audit = await this.prisma.audit.findUnique({
      where: { id: p.auditId },
      select: { status: true },
    });
    if (audit && audit.status !== AuditStatus.COMPLETED) {
      await this.handleCompleted(p);
    }
  }

  private async handleProgress(p: ProgressPayload) {
    if (!p?.auditId) return;
    if (typeof p.progress === 'number') {
      await this.redis.client.set(`audit:${p.auditId}:progress`, String(p.progress), 'EX', 3600);
    }
    if (p.stage) {
      await this.redis.client.set(`audit:${p.auditId}:stage`, p.stage, 'EX', 3600);
    }
    this.gateway.emitProgress(p.auditId, p);
  }

  private async handleCompleted(p: ProgressPayload) {
    if (!p?.auditId) return;
    await this.prisma.audit.update({
      where: { id: p.auditId },
      data: {
        status: AuditStatus.COMPLETED,
        seoScore: p.finalScore ?? null,
        completedAt: new Date(),
      },
    });
    await this.redis.client.set(`audit:${p.auditId}:progress`, '100', 'EX', 3600);
    this.gateway.emitCompleted(p.auditId, p);
  }

  private async handleFailed(p: ProgressPayload) {
    if (!p?.auditId) return;
    await this.prisma.audit.update({
      where: { id: p.auditId },
      data: {
        status: AuditStatus.FAILED,
        errorMessage: p.error ?? p.message ?? 'Unknown error',
      },
    });
    this.gateway.emitFailed(p.auditId, p);
  }
}
