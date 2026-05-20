import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PlanCode, BILLING_DEFAULTS } from '../domain/plan-features';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';

export interface ActivateInput {
  userId: string;
  planCode: PlanCode;
  durationDays?: number;
  grantedBy?: string;
  paymentIntentId?: string;
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(userId: string): Promise<SubscriptionResponseDto | null> {
    const row = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      planCode: row.planCode,
      status: row.status,
      startedAt: row.startedAt,
      expiresAt: row.expiresAt,
      canceledAt: row.canceledAt,
      isAdminGranted: row.grantedBy !== null,
    };
  }

  async activate(input: ActivateInput): Promise<void> {
    const days = input.durationDays ?? BILLING_DEFAULTS.SUBSCRIPTION_DAYS;
    const expiresAt =
      input.planCode === 'free' ? null : new Date(Date.now() + days * 86_400_000);

    await this.prisma.subscription.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        planCode: input.planCode,
        status: 'active',
        startedAt: new Date(),
        expiresAt,
        grantedBy: input.grantedBy ?? null,
      },
      update: {
        planCode: input.planCode,
        status: 'active',
        startedAt: new Date(),
        expiresAt,
        canceledAt: null,
        grantedBy: input.grantedBy ?? null,
      },
    });
  }

  async cancel(userId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled', canceledAt: new Date() },
    });
  }

  async downgradeExpiredToFree(now: Date = new Date()): Promise<number> {
    const expired = await this.prisma.subscription.findMany({
      where: { status: 'active', expiresAt: { not: null, lt: now } },
      select: { userId: true, id: true },
    });
    if (expired.length === 0) return 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { id: { in: expired.map((e) => e.id) } },
        data: { status: 'expired' },
      });
      for (const e of expired) {
        await tx.subscription.upsert({
          where: { userId: e.userId },
          create: {
            userId: e.userId,
            planCode: 'free',
            status: 'active',
            startedAt: now,
            expiresAt: null,
          },
          update: {
            planCode: 'free',
            status: 'active',
            startedAt: now,
            expiresAt: null,
            canceledAt: null,
            grantedBy: null,
          },
        });
      }
    });
    return expired.length;
  }
}
