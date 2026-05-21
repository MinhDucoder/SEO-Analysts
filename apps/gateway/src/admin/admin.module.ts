import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminService } from './services/admin.service';
import { AdminApiKeyService } from './services/admin-api-key.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, AuthModule, BillingModule],
  controllers: [AdminController, AdminSubscriptionsController],
  providers: [AdminService, AdminApiKeyService, AdminSubscriptionsService],
})
export class AdminModule {}
