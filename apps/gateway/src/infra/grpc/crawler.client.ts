import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';

export interface LiteFetchResponse {
  final_url: string;
  status_code: number;
  html: string;
  size_bytes: number;
  fetch_time_ms: number;
  redirect_chain: string[];
  from_cache: boolean;
}

interface CrawlerService {
  CrawlUrl(req: { url: string; auditId: string }, cb: (err: Error | null, res?: unknown) => void): void;
  LiteFetch(
    req: {
      request_id: string;
      url: string;
      timeout_ms: number;
      user_agent: string;
      follow_redirects: boolean;
    },
    cb: (err: Error | null, res?: LiteFetchResponse) => void,
  ): void;
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
    const url = this.config.get<string>('CRAWLER_GRPC_URL') ?? 'localhost:50052';
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

  async liteFetch(input: {
    requestId: string;
    url: string;
    timeoutMs?: number;
    userAgent?: string;
    followRedirects?: boolean;
  }): Promise<{
    finalUrl: string;
    statusCode: number;
    html: string;
    sizeBytes: number;
    fetchTimeMs: number;
    redirectChain: string[];
    fromCache: boolean;
  }> {
    return new Promise((resolve, reject) => {
      this.client.LiteFetch(
        {
          request_id: input.requestId,
          url: input.url,
          timeout_ms: input.timeoutMs ?? 10_000,
          user_agent: input.userAgent ?? '',
          follow_redirects: input.followRedirects ?? true,
        },
        (err, res) => {
          if (err) return reject(err);
          if (!res) return reject(new Error('Empty LiteFetch response'));
          resolve({
            finalUrl: res.final_url,
            statusCode: res.status_code,
            html: res.html,
            sizeBytes: res.size_bytes,
            fetchTimeMs: res.fetch_time_ms,
            redirectChain: res.redirect_chain ?? [],
            fromCache: res.from_cache,
          });
        },
      );
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
