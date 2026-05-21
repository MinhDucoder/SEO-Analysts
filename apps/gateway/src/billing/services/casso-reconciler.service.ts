import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PaymentIntentService } from './payment-intent.service';
import { SubscriptionService } from './subscription.service';
import { RedisService } from '../../infra/redis/redis.service';

export interface CassoWebhookPayload {
  tid: string;
  amount: number;
  description: string;
  when: string;
  [k: string]: unknown;
}

const REF_REGEX = /SEO[A-Z2-7]{5}/i;

@Injectable()
export class CassoReconcilerService {
  private readonly logger = new Logger(CassoReconcilerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intents: PaymentIntentService,
    private readonly subscriptions: SubscriptionService,
    private readonly redis: RedisService,
  ) {}

  async handleWebhook(payload: CassoWebhookPayload): Promise<void> {
    // Step 1: idempotent insert (UNIQUE on casso_txn_id catches duplicates)
    let event;
    try {
      event = await this.prisma.cassoEvent.create({
        data: {
          cassoTxnId: payload.tid,
          payload: payload as unknown as object,
          matched: false,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        this.logger.warn(`Duplicate Casso webhook tid=${payload.tid} — skipped`);
        return;
      }
      throw e;
    }

    // Step 2: extract ref code
    const refCode = this.extractRefCode(payload.description);
    if (!refCode) {
      this.logger.warn(`No ref code in Casso webhook tid=${payload.tid} desc="${payload.description}"`);
      return;
    }

    // Step 3: find pending intent matching ref + amount
    const intent = await this.intents.findByRefCode(refCode);
    if (!intent || intent.status !== 'pending') {
      this.logger.warn(`Intent for refCode=${refCode} not pending (status=${intent?.status}) tid=${payload.tid}`);
      return;
    }
    if (intent.amountVnd !== payload.amount) {
      this.logger.warn(`Amount mismatch refCode=${refCode}: expected=${intent.amountVnd} got=${payload.amount}`);
      return;
    }

    // Step 4: activate subscription + mark intent paid
    await this.subscriptions.activate({
      userId: intent.userId,
      planCode: intent.planCode,
      paymentIntentId: intent.id,
    });
    const sub = await this.subscriptions.getCurrent(intent.userId);
    if (sub) {
      await this.intents.markPaid(intent.id, payload.tid, sub.id);
    }

    // Step 5: mark event matched + publish redis event
    await this.prisma.cassoEvent.update({
      where: { id: event.id },
      data: { matched: true, matchedIntentId: intent.id },
    });
    await this.redis.client.publish(
      'billing.confirmed',
      JSON.stringify({
        userId: intent.userId,
        intentId: intent.id,
        planCode: intent.planCode,
      }),
    );
    this.logger.log(`Activated ${intent.planCode} for user=${intent.userId} via tid=${payload.tid}`);
  }

  private extractRefCode(description: string): string | null {
    const m = description.match(REF_REGEX);
    return m ? m[0].toUpperCase() : null;
  }
}
