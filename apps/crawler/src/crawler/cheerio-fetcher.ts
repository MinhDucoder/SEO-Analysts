import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { FetchResult, IFetcher } from './interfaces/fetcher.interface';

const DEFAULT_USER_AGENT = 'SEOAnalystBot/1.0 (+https://seo-analyst.local)';
const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class CheerioFetcher implements IFetcher {
  private readonly logger = new Logger(CheerioFetcher.name);

  async fetch(
    url: string,
    options: { userAgent?: string; timeoutMs?: number } = {},
  ): Promise<FetchResult> {
    const start = Date.now();
    const response: AxiosResponse<string> = await axios.get(url, {
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true, // we report any status, never throw
      responseType: 'text',
      transformResponse: (v) => v,
      headers: {
        'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    const responseTimeMs = Date.now() - start;

    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    const finalUrl =
      (response.request && response.request.res && response.request.res.responseUrl) || url;
    const isSpa = this.detectSpa(html);

    return {
      finalUrl,
      statusCode: response.status,
      responseTimeMs,
      htmlSizeBytes: Buffer.byteLength(html, 'utf8'),
      html,
      redirectChain: finalUrl !== url ? [url, finalUrl] : [],
      contentEncoding: String(response.headers['content-encoding'] ?? ''),
      cacheControl: String(response.headers['cache-control'] ?? ''),
      isSpa,
      fetcherType: 'cheerio',
    };
  }

  detectSpa(html: string): boolean {
    if (!html || html.length === 0) return false;
    const $ = cheerio.load(html);
    const body = $('body');
    const bodyText = body.text().trim();
    const bodyHtml = body.html() ?? '';

    // Heuristic 1: tiny body containing common SPA mount nodes
    const hasSpaMount =
      $('#root').length > 0 ||
      $('#app').length > 0 ||
      $('#__next').length > 0;
    if (hasSpaMount && bodyText.length < 500) return true;

    // Heuristic 2: noscript JS-required warning
    const noscriptText = $('noscript').text().toLowerCase();
    if (
      noscriptText.includes('enable javascript') ||
      noscriptText.includes('javascript is required')
    ) {
      if (bodyText.length < 1500) return true;
    }

    // Heuristic 3: __NEXT_DATA__ marker with minimal visible content
    if (bodyHtml.includes('__NEXT_DATA__') && bodyText.length < 500) return true;

    return false;
  }
}
