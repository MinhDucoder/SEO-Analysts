import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentIntentService } from './payment-intent.service';
import { CassoReconcilerService } from './casso-reconciler.service';

/**
 * DEV/DEMO ONLY. Every minute, auto-confirms pending payment intents by
 * synthesizing a Casso webhook for each — so local demos complete without a
 * real bank transfer. Double-guarded: requires BILLING_DEV_AUTOCONFIRM=true
 * AND NODE_ENV !== 'production'. Reuses the real reconciler path (markPaid +
 * upgrade + redis publish) so behavior is identical to a genuine webhook.
 */
@Injectable()
export class DevAutoConfirmCron {
  private readonly logger = new Logger(DevAutoConfirmCron.name);

  constructor(
    private readonly config: ConfigService,
    private readonly intents: PaymentIntentService,
    private readonly reconciler: CassoReconcilerService,
  ) {
    if (this.isEnabled()) {
      this.logger.warn(
        '⚠️ BILLING_DEV_AUTOCONFIRM is ON — pending transfers auto-confirm WITHOUT real payment. Never enable in production.',
      );
    }
  }

  private isEnabled(): boolean {
    return (
      this.config.get<string>('BILLING_DEV_AUTOCONFIRM') === 'true' &&
      this.config.get<string>('NODE_ENV') !== 'production'
    );
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'dev-autoconfirm' })
  async handle(): Promise<void> {
    if (!this.isEnabled()) return;

    const pending = await this.intents.findActivePending();
    if (pending.length === 0) return;

    for (const p of pending) {
      await this.reconciler.handleWebhook({
        tid: `DEVAUTO-${p.refCode}-${Date.now()}`,
        amount: p.amountVnd,
        description: p.refCode,
        when: new Date().toISOString(),
      });
    }
    this.logger.warn(`[DEV] auto-confirmed ${pending.length} pending intent(s)`);
  }
}
