import { Global, Module } from '@nestjs/common';
import { GrpcClientFactory } from './grpc-client.factory';
import { CrawlerGrpcClient } from './crawler.client';
import { AnalyzerGrpcClient } from './analyzer.client';
import { ReportGrpcClient } from './report.client';

@Global()
@Module({
  providers: [GrpcClientFactory, CrawlerGrpcClient, AnalyzerGrpcClient, ReportGrpcClient],
  exports: [CrawlerGrpcClient, AnalyzerGrpcClient, ReportGrpcClient],
})
export class GrpcModule {}
