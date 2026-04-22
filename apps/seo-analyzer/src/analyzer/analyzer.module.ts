import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { AnalyzerService } from './services/analyzer.service';
import { AnalyzerController } from './controllers/analyzer.controller';
import { AnalyzerWorker } from './controllers/analyzer.worker';
import { RuleRegistry } from './services/rule-registry';
import { RuleRunner } from './services/rule-runner';
import { ScoreCalculator } from './services/score-calculator';
import { PageDataBuilderService } from './services/page-data-builder.service';
import { BULLMQ_QUEUES } from '@repo/shared';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: Number(config.get('REDIS_PORT', 6379)),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.ANALYZE_START }),
  ],
  controllers: [AnalyzerController],
  providers: [
    RuleRegistry,
    RuleRunner,
    ScoreCalculator,
    PageDataBuilderService,
    AnalyzerService,
    AnalyzerWorker,
  ],
  exports: [AnalyzerService, PageDataBuilderService, RuleRunner, RuleRegistry],
})
export class AnalyzerModule {}
