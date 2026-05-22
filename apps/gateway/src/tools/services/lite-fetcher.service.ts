import { Injectable, Logger } from '@nestjs/common';
import dns from 'node:dns/promises';
import { isAllowedPort, isAllowedProtocol, isBlockedIp } from '../domain/ssrf-policy';
import { FetchError } from '../domain/fetch-error';

export interface LiteFetchResult {
  url: string; // final URL after redirects
  status: number;
  headers: Record<string, string>;
  body: string; // utf-8 decoded; binary tools use bodyBuffer
  bodyBuffer: Buffer;
  contentType: string;
  durationMs: number;
  cached?: boolean;
}

@Injectable()
export class LiteFetcherService {
  private readonly logger = new Logger(LiteFetcherService.name);

  async get(
    rawUrl: string,
    _opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {},
  ): Promise<LiteFetchResult> {
    const url = this.parseUrl(rawUrl);
    if (!isAllowedProtocol(url.protocol)) {
      throw new FetchError('INVALID_PROTOCOL', `Disallowed protocol: ${url.protocol}`);
    }

    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (!isAllowedPort(port)) {
      throw new FetchError('INVALID_PORT', `Disallowed port: ${port}`);
    }

    try {
      const lookup = await dns.lookup(url.hostname, { all: true });
      // Block if ANY resolved address is blocked.
      for (const { address } of lookup) {
        if (isBlockedIp(address)) {
          throw new FetchError('SSRF_BLOCKED', `Hostname resolves to blocked IP: ${address}`);
        }
      }
    } catch (e) {
      if (e instanceof FetchError) throw e;
      throw new FetchError('DNS_FAIL', `DNS lookup failed for ${url.hostname}`);
    }

    // Actual fetch (redirects, size/timeout caps, caching) wired in Task 7/8.
    throw new Error('NOT_YET_IMPLEMENTED — wired in Task 7');
  }

  private parseUrl(raw: string): URL {
    try {
      return new URL(raw);
    } catch {
      throw new FetchError('INVALID_PROTOCOL', 'Malformed URL');
    }
  }
}
