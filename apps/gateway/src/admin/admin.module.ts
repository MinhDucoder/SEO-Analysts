import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { AdminApiKeyService } from './services/admin-api-key.service';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminApiKeyService],
})
export class AdminModule {}
