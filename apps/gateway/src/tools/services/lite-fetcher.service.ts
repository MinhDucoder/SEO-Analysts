import { Injectable, Logger } from '@nestjs/common';
import dns from 'node:dns/promises';
import { Agent, type Dispatcher } from 'undici';
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

export interface LiteFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

@Injectable()
export class LiteFetcherService {
  private readonly logger = new Logger(LiteFetcherService.name);

  private readonly DEFAULTS = {
    timeoutMs: 10_000,
    maxBytes: 5 * 1024 * 1024,
    maxRedirects: 3,
    userAgent: 'SEOAnalystsBot/1.0 (+https://seoanalysts.io/tools/bot)',
  };

  constructor(private readonly opts: { dispatcherFactory?: () => Dispatcher } = {}) {}

  async get(rawUrl: string, opts: LiteFetchOptions = {}): Promise<LiteFetchResult> {
    const timeoutMs = opts.timeoutMs ?? this.DEFAULTS.timeoutMs;
    const maxBytes = opts.maxBytes ?? this.DEFAULTS.maxBytes;
    const maxRedirects = opts.maxRedirects ?? this.DEFAULTS.maxRedirects;
    const startedAt = Date.now();

    let currentUrl = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const { url, ip } = await this.validateAndResolve(currentUrl);

      // Bind the socket to the verified IP (DNS-rebinding guard): the IP we
      // security-checked is exactly the one we connect to.
      const dispatcher = this.opts.dispatcherFactory?.() ?? this.buildAgent(ip);
      const ownsDispatcher = !this.opts.dispatcherFactory;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        let res: Dispatcher.ResponseData;
        try {
          res = await dispatcher.request({
            origin: url.origin,
            path: `${url.pathname}${url.search}`,
            method: 'GET',
            headers: {
              'user-agent': this.DEFAULTS.userAgent,
              accept: 'text/html,application/xml,application/json;q=0.9,*/*;q=0.8',
            },
            signal: controller.signal,
            // NB: undici Agent does not auto-follow redirects, so we receive the
            // 3xx and follow manually (re-checking the IP on each hop).
          });
        } catch (e: any) {
          if (e?.name === 'AbortError') {
            throw new FetchError('TIMEOUT', `Timeout after ${timeoutMs}ms`);
          }
          throw new FetchError('BAD_STATUS', e?.message ?? 'Fetch failed');
        }

        const status = res.statusCode;
        const location = this.headerValue(res.headers, 'location');

        if (status >= 300 && status < 400 && location) {
          await this.drain(res.body);
          currentUrl = new URL(location, url).toString();
          continue;
        }

        if (status < 200 || status >= 300) {
          await this.drain(res.body);
          throw new FetchError('BAD_STATUS', `Upstream returned ${status}`);
        }

        const bodyBuffer = await this.readCapped(res.body, maxBytes);
        const headers = this.flattenHeaders(res.headers);
        return {
          url: url.toString(),
          status,
          headers,
          body: bodyBuffer.toString('utf-8'),
          bodyBuffer,
          contentType: headers['content-type'] ?? '',
          durationMs: Date.now() - startedAt,
        };
      } finally {
        clearTimeout(timer);
        if (ownsDispatcher && typeof (dispatcher as any).close === 'function') {
          await (dispatcher as any).close().catch(() => undefined);
        }
      }
    }

    throw new FetchError('TOO_MANY_REDIRECTS', `Exceeded ${maxRedirects} redirects`);
  }

  private async validateAndResolve(rawUrl: string): Promise<{ url: URL; ip: string }> {
    const url = this.parseUrl(rawUrl);
    if (!isAllowedProtocol(url.protocol)) {
      throw new FetchError('INVALID_PROTOCOL', `Disallowed protocol: ${url.protocol}`);
    }
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (!isAllowedPort(port)) {
      throw new FetchError('INVALID_PORT', `Disallowed port: ${port}`);
    }
    let resolved: { address: string; family: number }[];
    try {
      resolved = (await dns.lookup(url.hostname, { all: true })) as {
        address: string;
        family: number;
      }[];
    } catch {
      throw new FetchError('DNS_FAIL', `DNS lookup failed for ${url.hostname}`);
    }
    const first = resolved[0];
    if (!first) {
      throw new FetchError('DNS_FAIL', `No addresses for ${url.hostname}`);
    }
    for (const { address } of resolved) {
      if (isBlockedIp(address)) {
        throw new FetchError('SSRF_BLOCKED', `Hostname resolves to blocked IP: ${address}`);
      }
    }
    return { url, ip: first.address };
  }

  private buildAgent(boundIp: string): Agent {
    const family = boundIp.includes(':') ? 6 : 4;
    return new Agent({
      connect: {
        // Pin DNS to the already-verified IP. undici passes { all: true }, so
        // the callback must return an array of { address, family }.
        lookup: (_hostname: string, options: any, cb: any) => {
          if (options && options.all) {
            cb(null, [{ address: boundIp, family }]);
          } else {
            cb(null, boundIp, family);
          }
        },
      },
    });
  }

  private async readCapped(body: AsyncIterable<Buffer>, maxBytes: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let received = 0;
    try {
      for await (const chunk of body) {
        received += chunk.length;
        if (received > maxBytes) {
          throw new FetchError('TOO_LARGE', `Response exceeds ${maxBytes} bytes`);
        }
        chunks.push(Buffer.from(chunk));
      }
    } catch (e) {
      if (e instanceof FetchError) throw e;
      throw new FetchError('BAD_STATUS', (e as Error).message);
    }
    return Buffer.concat(chunks);
  }

  private async drain(body: AsyncIterable<Buffer>): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of body) {
        /* discard */
      }
    } catch {
      /* ignore drain errors */
    }
  }

  private headerValue(headers: any, name: string): string | undefined {
    const v = headers?.[name];
    if (v == null) return undefined;
    return Array.isArray(v) ? v[0] : String(v);
  }

  private flattenHeaders(h: any): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(h ?? {})) {
      out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
    }
    return out;
  }

  private parseUrl(raw: string): URL {
    try {
      return new URL(raw);
    } catch {
      throw new FetchError('INVALID_PROTOCOL', 'Malformed URL');
    }
  }
}
