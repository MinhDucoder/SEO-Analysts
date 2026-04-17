import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyzerService } from './analyzer.service';
import { AnalyzerController } from './analyzer.controller';
import { AnalyzerWorker } from './analyzer.worker';
import { RuleRegistry } from './rule-registry';
import { RuleRunner } from './rule-runner';
import { ScoreCalculator } from './score-calculator';
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
  providers: [RuleRegistry, RuleRunner, ScoreCalculator, AnalyzerService, AnalyzerWorker],
  exports: [AnalyzerService],
})
export class AnalyzerModule {}
