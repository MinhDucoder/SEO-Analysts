import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BULLMQ_QUEUES } from '@repo/shared';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { PdfModule } from '../infra/pdf/pdf.module';
import { ReportRepository } from './persistence/report.repository';
import { ReportAggregator } from './services/report.aggregator';
import { ReportComparator } from './services/report.comparator';
import { ShareLinkService } from './services/share-link.service';
import { WaitForBothService } from './services/wait-for-both.service';
import { ReportService } from './services/report.service';
import { ReportGrpcController } from './controllers/report.grpc.controller';
import { ReportHttpController } from './controllers/report.http.controller';
import { AnalyzeDoneListener } from './controllers/analyze-done.listener';
import { KeywordDoneListener } from './controllers/keyword-done.listener';
import { CrawlDoneListener } from './controllers/crawl-done.listener';
import { ReportWorker } from './controllers/report.worker';
import { AiSuggestModule } from './ai-suggest/ai-suggest.module';

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
    AiSuggestModule,
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
    CrawlDoneListener,
    ReportWorker,
  ],
})
export class ReportModule {}
