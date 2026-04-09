import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BULLMQ_QUEUES } from '@repo/shared';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';
import { ReportRepository } from './report.repository';
import { ReportAggregator } from './report.aggregator';
import { ReportComparator } from './report.comparator';
import { ShareLinkService } from './share-link.service';
import { WaitForBothService } from './wait-for-both.service';
import { ReportService } from './report.service';
import { ReportGrpcController } from './report.grpc.controller';
import { ReportHttpController } from './report.http.controller';
import { AnalyzeDoneListener } from './analyze-done.listener';
import { KeywordDoneListener } from './keyword-done.listener';
import { ReportWorker } from './report.worker';

@Module({
  imports: [
    PrismaModule,
    PdfModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const parsed = new URL(url);
        return {
          connection: {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            password: parsed.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.REPORT_START }),
  ],
  controllers: [ReportGrpcController, ReportHttpController],
  providers: [
    ReportRepository,
    ReportAggregator,
    ReportComparator,
    ShareLinkService,
    WaitForBothService,
    ReportService,
    AnalyzeDoneListener,
    KeywordDoneListener,
    ReportWorker,
  ],
})
export class ReportModule {}
