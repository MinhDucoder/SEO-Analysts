/**
 * @file Normalizes heterogeneous public-check input (URL / markdown /
 * HTML) into raw HTML + optional resolved URL. URL inputs are validated
 * for SSRF and fetched via the crawler's LiteFetch RPC; markdown is
 * parsed with `marked` and wrapped in <article>; HTML passes through.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { marked } from 'marked';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { CrawlerGrpcClient } from '../../infra/grpc/crawler.client';

export type PublicCheckInput =
  | { type: 'url'; url: string }
  | { type: 'markdown'; markdown: string }
  | { type: 'html'; html: string };

export interface ExtractResult {
  html: string;
  resolvedUrl?: string;
  fromCache: boolean;
}

@Injectable()
export class ContentExtractorService {
  constructor(private readonly crawler: CrawlerGrpcClient) {}

  async extract(input: PublicCheckInput): Promise<ExtractResult> {
    switch (input.type) {
      case 'html':
        return { html: input.html, fromCache: false };
      case 'markdown': {
        const body = await marked.parse(input.markdown);
        return { html: `<article>${body}</article>`, fromCache: false };
      }
      case 'url': {
        await this.validateUrlSafety(input.url);
        const r = await this.crawler.liteFetch({
          requestId: `pc-${Date.now()}`,
          url: input.url,
          timeoutMs: 10_000,
        });
        return { html: r.html, resolvedUrl: r.finalUrl, fromCache: r.fromCache };
      }
    }
  }

  private async validateUrlSafety(url: string): Promise<void> {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new BadRequestException({ code: 'INVALID_URL', message: 'Invalid URL' });
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new BadRequestException({
        code: 'INVALID_URL',
        message: 'Only http/https protocols are allowed',
      });
    }
    const host = u.hostname;
    if (host === 'localhost' || host.endsWith('.local')) {
      throw new BadRequestException({
        code: 'INVALID_URL',
        message: 'URL points to a local hostname',
      });
    }
    let ip: string;
    if (isIP(host)) {
      ip = host;
    } else {
      try {
        ip = (await lookup(host)).address;
      } catch {
        throw new BadRequestException({
          code: 'INVALID_URL',
          message: `DNS resolution failed for ${host}`,
        });
      }
    }
    if (this.isPrivateOrReservedIp(ip)) {
      throw new BadRequestException({
        code: 'INVALID_URL',
        message: `URL resolves to a private/reserved IP: ${ip}`,
      });
    }
  }

  private isPrivateOrReservedIp(ip: string): boolean {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
    const [a, b] = parts;
    return (
      a === 10 ||
      (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 127 ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }
}
