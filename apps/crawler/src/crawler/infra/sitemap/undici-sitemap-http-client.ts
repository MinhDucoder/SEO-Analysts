/**
 * @file Adapter that plugs `PoliteFetcher` into `SitemapDiscovery`'s
 * `SitemapHttpClient` contract. Keeps sitemap-discovery free of any
 * concrete HTTP library — tests can substitute a trivial mock, while
 * production wraps a rate-limited fetcher.
 */
import { Injectable } from '@nestjs/common';
import { PoliteFetcher } from '../fetchers/polite-fetcher';
import { SitemapHttpClient, SitemapHttpResponse } from './sitemap-discovery';

@Injectable()
export class UndiciSitemapHttpClient implements SitemapHttpClient {
  constructor(private readonly fetcher: PoliteFetcher) {}

  async fetch(url: string): Promise<SitemapHttpResponse> {
    const res = await this.fetcher.fetch(url);
    return { status: res.status, body: res.body, contentType: res.contentType };
  }
}
