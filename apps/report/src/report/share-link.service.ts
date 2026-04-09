import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShareLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async create(auditId: string) {
    const report = await this.prisma.report.findUnique({ where: { auditId } });
    if (!report) {
      throw new NotFoundException(`Report not found for audit ${auditId}`);
    }
    const token = randomBytes(32).toString('hex'); // 64 chars
    return this.prisma.shareLink.create({
      data: {
        reportId: report.id,
        auditId,
        token,
        isActive: true,
      },
    });
  }

  async findActiveByToken(token: string) {
    const link = await this.prisma.shareLink.findFirst({
      where: { token, isActive: true },
    });
    if (!link) return null;
    await this.prisma.shareLink.update({
      where: { id: link.id },
      data: {
        accessedCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
    return link;
  }

  async revoke(auditId: string): Promise<boolean> {
    const report = await this.prisma.report.findUnique({ where: { auditId } });
    if (!report) return false;
    await this.prisma.shareLink.update({
      where: { reportId: report.id },
      data: { isActive: false },
    });
    return true;
  }
}
