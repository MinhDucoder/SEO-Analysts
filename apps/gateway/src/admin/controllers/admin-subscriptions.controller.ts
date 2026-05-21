import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@repo/shared';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminSubscriptionsService } from '../services/admin-subscriptions.service';
import { GrantSubscriptionDto } from '../dto/grant-subscription.dto';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSubscriptionsController {
  constructor(private readonly svc: AdminSubscriptionsService) {}

  @Post('grant')
  async grant(@CurrentUser('id') adminId: string, @Body() dto: GrantSubscriptionDto) {
    await this.svc.grant(dto, adminId);
    return { ok: true };
  }
}
