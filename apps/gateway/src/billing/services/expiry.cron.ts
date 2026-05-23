import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class ExpiryCron {
  private readonly logger = new Logger(ExpiryCron.name);

  constructor(private readonly subs: SubscriptionService) {}

  @Cron('5 0 * * *', { name: 'subscription-expiry', timeZone: 'Asia/Ho_Chi_Minh' })
  async handleDaily(): Promise<void> {
    const downgraded = await this.subs.downgradeExpiredToFree();
    if (downgraded > 0) {
      this.logger.log(`Downgraded ${downgraded} expired subscriptions to free`);
    }
  }
}
