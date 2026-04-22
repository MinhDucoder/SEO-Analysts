/**
 * @file gRPC controller for the public-API lightweight URL fetch flow.
 * Thin wrapper around `LiteFetchService` that translates between the
 * camelCase service output and the snake_case proto wire format.
 *
 * Proto: `packages/proto/crawler/v1/crawler.proto` (LiteFetch RPC).
 */
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LiteFetchService } from '../services/lite-fetch.service';

interface LiteFetchRequest {
  request_id: string;
  url: string;
  timeout_ms: number;
  user_agent: string;
  follow_redirects: boolean;
}

interface LiteFetchResult {
  final_url: string;
  status_code: number;
  html: string;
  size_bytes: number;
  fetch_time_ms: number;
  redirect_chain: string[];
  from_cache: boolean;
}

@Controller()
export class LiteFetchController {
  private readonly logger = new Logger(LiteFetchController.name);

  constructor(private readonly svc: LiteFetchService) {}

  @GrpcMethod('CrawlerService', 'LiteFetch')
  async liteFetch(req: LiteFetchRequest): Promise<LiteFetchResult> {
    const r = await this.svc.fetch({
      url: req.url,
      timeoutMs: req.timeout_ms || undefined,
      userAgent: req.user_agent || undefined,
      followRedirects: req.follow_redirects,
    });
    this.logger.log(
      `LiteFetch req=${req.request_id} url=${req.url} status=${r.statusCode} cached=${r.fromCache} ms=${r.fetchTimeMs}`,
    );
    return {
      final_url: r.finalUrl,
      status_code: r.statusCode,
      html: r.html,
      size_bytes: r.sizeBytes,
      fetch_time_ms: r.fetchTimeMs,
      redirect_chain: r.redirectChain,
      from_cache: r.fromCache,
    };
  }
}
