import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditJobData } from './audit.processor';

@Injectable()
export class AuditService {
  constructor(
    @InjectQueue('audit-queue')
    private readonly auditQueue: Queue<AuditJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async createAudit(url: string, userId: string | null) {
    // Check for duplicate audit within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await this.prisma.auditJob.findFirst({
      where: {
        url,
        createdAt: { gte: fiveMinutesAgo },
        status: 'completed',
      },
      include: { result: true },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      return {
        jobId: recent.id,
        status: recent.status,
        cached: true,
        result: recent.result,
      };
    }

    // Create DB record first, then use its ID for the Bull job
    const auditJob = await this.prisma.auditJob.create({
      data: {
        url,
        userId,
        status: 'pending',
        progress: 0,
      },
    });

    // Add to queue with same ID
    await this.auditQueue.add(
      'audit',
      { url, userId: userId || undefined, isGuest: !userId },
      {
        jobId: auditJob.id,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    return { jobId: auditJob.id, status: 'pending', cached: false };
  }

  async getAudit(id: string) {
    const job = await this.prisma.auditJob.findUnique({
      where: { id },
      include: { result: true },
    });

    if (!job) {
      throw new NotFoundException('Audit not found');
    }

    return job;
  }

  async getAuditHistory(url: string) {
    return this.prisma.auditJob.findMany({
      where: { url, status: 'completed' },
      include: { result: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
