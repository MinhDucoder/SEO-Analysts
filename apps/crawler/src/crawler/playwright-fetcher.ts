import { Injectable } from '@nestjs/common';
import { BrowserPool } from './browser-pool';
import { FetchResult, IFetcher } from './interfaces/fetcher.interface';

const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class PlaywrightFetcher implements IFetcher {
  constructor(private readonly pool: BrowserPool) {}

  async fetch(
    url: string,
    options: { userAgent?: string; timeoutMs?: number } = {},
  ): Promise<FetchResult> {
    const start = Date.now();
    const context = await this.pool.acquire();
    try {
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      });
      const html = await page.content();
      const responseTimeMs = Date.now() - start;
      const finalUrl = response?.url() ?? url;
      const headers = response?.headers() ?? {};

      await page.close();

      return {
        finalUrl,
        statusCode: response?.status() ?? 0,
        responseTimeMs,
        htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
        html,
        redirectChain: finalUrl !== url ? [url, finalUrl] : [],
        contentEncoding: String(headers['content-encoding'] ?? ''),
        cacheControl: String(headers['cache-control'] ?? ''),
        isSpa: false, // Playwright always renders fully — never flagged
        fetcherType: 'playwright',
      };
    } finally {
      await this.pool.release(context);
    }
  }
}
