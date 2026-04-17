import { Module } from '@nestjs/common';
import { KeywordController } from './controllers/keyword.controller';
import { KeywordAnalyzerService } from './services/keyword-analyzer.service';
import { KeywordWorker } from './controllers/keyword.worker';
import { EventPublisher } from './services/event.publisher';

@Module({
  controllers: [KeywordController],
  providers: [KeywordAnalyzerService, KeywordWorker, EventPublisher],
  exports: [KeywordAnalyzerService],
})
export class KeywordModule {}
