import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditProcessor } from './audit.processor';
import { AuditGateway } from './audit.gateway';
import { CrawlerModule } from '../crawler/crawler.module';
import { SeoEngineModule } from '../seo-engine/seo-engine.module';
import { PerformanceModule } from '../performance/performance.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url:
            configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'audit-queue' }),
    CrawlerModule,
    SeoEngineModule,
    PerformanceModule,
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditProcessor, AuditGateway],
})
export class AuditModule {}
