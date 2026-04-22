/**
 * @file Lightweight HTTP GET for the public-API content-only flow.
 * Fetches a URL with Cheerio-ready HTML, enforces a timeout, rejects
 * non-HTML responses, and caches results in Redis (sha256(url) keyed,
 * TTL 1h). Defense-in-depth SSRF check: reject private/loopback IPs
 * even though the gateway already validates — DNS rebinding would
 * still bypass upstream checks without this.
 *
 * Does NOT use Playwright, does NOT run Lighthouse. See `CheerioCrawler`
 * for the full audit-flow equivalent.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import type { Redis } from 'ioredis';
import { PUBLIC_API_REDIS_KEYS, PUBLIC_API_CACHE_TTL, PUBLIC_API_RATE_LIMITS } from '@repo/shared';
import { REDIS_CLIENT } from '../persistence/cache.service';

export interface LiteFetchInput {
  url: string;
  timeoutMs?: number;
  userAgent?: string;
  followRedirects?: boolean;
}

export interface LiteFetchOutput {
  finalUrl: string;
  statusCode: number;
  html: string;
  sizeBytes: number;
  fetchTimeMs: number;
  redirectChain: string[];
  fromCache: boolean;
}

const DEFAULT_UA = 'SEO-Check-Bot/1.0 (+https://seo-analyst.vn/bot)';

@Injectable()
export class LiteFetchService {
  private readonly logger = new Logger(LiteFetchService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async fetch(input: LiteFetchInput): Promise<LiteFetchOutput> {
    await this.validateUrlSafety(input.url);

    const cacheKey = PUBLIC_API_REDIS_KEYS.liteFetch(this.hash(input.url));
    const cached = await this.safeGet(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    const timeoutMs = input.timeoutMs ?? PUBLIC_API_RATE_LIMITS.URL_FETCH_TIMEOUT_MS;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs);
    const t0 = Date.now();

    try {
      const res = await fetch(input.url, {
        redirect: input.followRedirects === false ? 'manual' : 'follow',
        headers: {
          'user-agent': input.userAgent ?? DEFAULT_UA,
          accept: 'text/html,application/xhtml+xml',
        },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const ctype = res.headers.get('content-type') ?? '';
      if (!ctype.startsWith('text/html') && !ctype.startsWith('application/xhtml+xml')) {
        throw new Error(`response is not HTML (content-type: ${ctype})`);
      }
      const html = await res.text();
      const out: LiteFetchOutput = {
        finalUrl: res.url,
        statusCode: res.status,
        html,
        sizeBytes: Buffer.byteLength(html, 'utf8'),
        fetchTimeMs: Date.now() - t0,
        redirectChain: [],
        fromCache: false,
      };
      await this.safeSet(cacheKey, out);
      return out;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError' || /timeout/i.test(String((e as Error)?.message))) {
        throw new Error('timeout');
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  private async validateUrlSafety(url: string): Promise<void> {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new Error('Invalid URL');
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    const host = u.hostname;
    if (host === 'localhost' || host.endsWith('.local')) {
      throw new Error('URL points to local hostname');
    }
    let ip: string;
    if (isIP(host)) {
      ip = host;
    } else {
      try {
        ip = (await lookup(host)).address;
      } catch {
        throw new Error(`DNS resolution failed for ${host}`);
      }
    }
    if (this.isPrivateOrReservedIp(ip)) {
      throw new Error(`URL resolves to private/reserved IP: ${ip}`);
    }
  }

  private isPrivateOrReservedIp(ip: string): boolean {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      return false;
    }
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

  private hash(s: string): string {
    return createHash('sha256').update(s).digest('hex');
  }

  private async safeGet(key: string): Promise<LiteFetchOutput | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as LiteFetchOutput) : null;
    } catch (e) {
      this.logger.warn({ err: e, key }, 'lite-fetch cache read failed');
      return null;
    }
  }

  private async safeSet(key: string, value: LiteFetchOutput): Promise<void> {
    try {
      await this.redis.setex(key, PUBLIC_API_CACHE_TTL.LITE_FETCH_SECONDS, JSON.stringify(value));
    } catch (e) {
      this.logger.warn({ err: e, key }, 'lite-fetch cache write failed');
    }
  }
}
