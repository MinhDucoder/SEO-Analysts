import { Module } from '@nestjs/common';
import { LighthouseService } from './lighthouse.service';

@Module({
  providers: [LighthouseService],
  exports: [LighthouseService],
})
export class PerformanceModule {}
