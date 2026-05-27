import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminRevenueController } from './controllers/admin-revenue.controller';
import { AdminService } from './services/admin.service';
import { AdminApiKeyService } from './services/admin-api-key.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminRevenueService } from './services/admin-revenue.service';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, AuthModule, BillingModule],
  controllers: [AdminController, AdminSubscriptionsController, AdminRevenueController],
  providers: [AdminService, AdminApiKeyService, AdminSubscriptionsService, AdminRevenueService],
})
export class AdminModule {}
