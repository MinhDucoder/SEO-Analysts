/**
 * @file Contract for the "fetch raw HTML" step — implemented by both
 * `CheerioFetcher` (static HTTP) and `PlaywrightFetcher` (SPA fallback).
 */

export interface FetchResult {
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  htmlSizeBytes: number;
  html: string;
  redirectChain: string[];
  contentEncoding: string;
  cacheControl: string;
  isSpa: boolean;
  fetcherType: 'cheerio' | 'playwright';
}

export interface IFetcher {
  fetch(url: string, options?: { userAgent?: string; timeoutMs?: number }): Promise<FetchResult>;
}
