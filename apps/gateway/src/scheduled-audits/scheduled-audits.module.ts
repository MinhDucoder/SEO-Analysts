import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BULLMQ_QUEUES } from '@repo/shared';
import { ScheduledAuditsController } from './controllers/scheduled-audits.controller';
import { ScheduledAuditsService } from './services/scheduled-audits.service';
import { ScheduledAuditScheduler } from './services/scheduled-audit-scheduler.service';
import { ScheduledAuditTickWorker } from './controllers/scheduled-audit-tick.worker';
import { RegressionDetectorService } from './services/regression-detector.service';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditsModule } from '../audits/audits.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditsModule,
    BillingModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: BULLMQ_QUEUES.SCHEDULED_AUDIT_TICK },
      { name: BULLMQ_QUEUES.CRAWL_START },
      { name: BULLMQ_QUEUES.SITE_CRAWL_START },
    ),
  ],
  controllers: [ScheduledAuditsController],
  providers: [
    ScheduledAuditsService,
    ScheduledAuditScheduler,
    ScheduledAuditTickWorker,
    RegressionDetectorService,
  ],
  exports: [ScheduledAuditsService],
})
export class ScheduledAuditsModule {}
