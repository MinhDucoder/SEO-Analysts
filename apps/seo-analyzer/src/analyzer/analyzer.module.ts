import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
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
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.ANALYZE_START }),
  ],
  controllers: [AnalyzerController],
  providers: [RuleRegistry, RuleRunner, ScoreCalculator, AnalyzerService, AnalyzerWorker],
  exports: [AnalyzerService],
})
export class AnalyzerModule {}
