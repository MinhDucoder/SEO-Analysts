import { Injectable } from '@nestjs/common';
import { SubscriptionService } from '../../billing/services/subscription.service';
import { GrantSubscriptionDto } from '../dto/grant-subscription.dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly subs: SubscriptionService) {}

  async grant(dto: GrantSubscriptionDto, adminId: string): Promise<void> {
    await this.subs.activate({
      userId: dto.userId,
      planCode: dto.planCode,
      durationDays: dto.days,
      grantedBy: adminId,
    });
  }
}
