import { Module } from '@nestjs/common';
import { KeywordController } from './keyword.controller';
import { KeywordAnalyzerService } from './keyword-analyzer.service';
import { KeywordWorker } from './keyword.worker';
import { EventPublisher } from './event.publisher';

@Module({
  controllers: [KeywordController],
  providers: [KeywordAnalyzerService, KeywordWorker, EventPublisher],
  exports: [KeywordAnalyzerService],
})
export class KeywordModule {}
