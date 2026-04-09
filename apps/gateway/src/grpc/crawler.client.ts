import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';

interface CrawlerService {
  CrawlUrl(req: { url: string; auditId: string }, cb: (err: Error | null, res?: unknown) => void): void;
  HealthCheck(req: object, cb: (err: Error | null, res?: { healthy: boolean }) => void): void;
}

@Injectable()
export class CrawlerGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(CrawlerGrpcClient.name);
  private client!: CrawlerService;

  constructor(
    private readonly factory: GrpcClientFactory,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('CRAWLER_GRPC_URL') ?? 'localhost:50051';
    this.client = this.factory.create<CrawlerService>({
      protoPath: 'crawler/v1/crawler.proto',
      packageName: 'crawler.v1',
      serviceName: 'CrawlerService',
      url,
    });
  }

  async crawlUrl(auditId: string, url: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.client.CrawlUrl({ auditId, url }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.HealthCheck({}, (err, res) => {
        if (err) {
          this.logger.warn(`Crawler health check failed: ${err.message}`);
          return resolve(false);
        }
        resolve(res?.healthy ?? false);
      });
    });
  }
}
