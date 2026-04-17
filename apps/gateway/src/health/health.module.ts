import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { PrismaModule } from '../infra/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
