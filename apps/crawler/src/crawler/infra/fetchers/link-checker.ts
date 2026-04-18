/**
 * @file F4 broken-link auditor. Checks <a href> URLs with a HEAD
 * request first, falls back to GET when the origin refuses HEAD
 * (405/501) — Cloudflare and some CDNs do that — follows redirects
 * manually up to `maxRedirects` hops, and normalizes the outcome
 * into a `LinkCheckResult` the seo-analyzer can rank as PASS/WARN/FAIL.
 *
 * Concurrency bounds match industry norms (Screaming Frog, Ahrefs):
 * 10 parallel globally, 2 per host, 5s timeout. The fetch impl is
 * injected so tests can stub responses without touching the network.
 */
import { LinkCheckResult, LinkCheckReason } from '@repo/shared';

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface LinkCheckerOptions {
  concurrency?: number;
  perHostConcurrency?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  userAgent?: string;
}

interface NormalizedOptions {
  concurrency: number;
  perHostConcurrency: number;
  timeoutMs: number;
  maxRedirects: number;
  userAgent: string;
}

const DEFAULTS: NormalizedOptions = {
  concurrency: 10,
  perHostConcurrency: 2,
  timeoutMs: 5000,
  maxRedirects: 5,
  userAgent: 'SeoAnalyst/1.0 (+https://github.com/MinhDucoder/SEO-Analysts)',
};

export class LinkChecker {
  private readonly opts: NormalizedOptions;
  private active = 0;
  private readonly queue: Array<() => void> = [];
  private readonly perHost = new Map<string, { active: number; queue: Array<() => void> }>();

  constructor(private readonly fetchFn: FetchFn, opts: LinkCheckerOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  async checkOne(href: string): Promise<LinkCheckResult> {
    const chain: string[] = [];
    let current = href;
    let method: 'HEAD' | 'GET' = 'HEAD';

    for (let hop = 0; hop <= this.opts.maxRedirects; hop++) {
      if (hop === this.opts.maxRedirects) {
        return {
          href,
          status: 0,
          redirectChain: chain.length > 0 ? chain : [href],
          isBroken: true,
          reason: 'TOO_MANY_REDIRECTS',
        };
      }

      let res: Response;
      try {
        res = await this.fetchWithTimeout(current, method);
      } catch (err) {
        return mapNetworkError(href, chain, err as Error);
      }

      if ((res.status === 405 || res.status === 501) && method === 'HEAD') {
        method = 'GET';
        continue;
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          return classify(href, res.status, chain);
        }
        chain.push(current);
        current = resolveLocation(current, location);
        method = 'HEAD';
        continue;
      }

      return classify(href, res.status, chain);
    }

    return {
      href,
      status: 0,
      redirectChain: chain,
      isBroken: true,
      reason: 'TOO_MANY_REDIRECTS',
    };
  }

  async checkAll(hrefs: string[]): Promise<LinkCheckResult[]> {
    return Promise.all(hrefs.map((href) => this.scheduled(href)));
  }

  private async scheduled(href: string): Promise<LinkCheckResult> {
    const host = safeHost(href);
    await this.acquireGlobal();
    if (host) await this.acquireHost(host);
    try {
      return await this.checkOne(href);
    } finally {
      if (host) this.releaseHost(host);
      this.releaseGlobal();
    }
  }

  private async fetchWithTimeout(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);
    try {
      return await this.fetchFn(url, {
        method,
        redirect: 'manual',
        headers: { 'user-agent': this.opts.userAgent },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async acquireGlobal(): Promise<void> {
    if (this.active < this.opts.concurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  private releaseGlobal(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }

  private async acquireHost(host: string): Promise<void> {
    const bucket = this.perHost.get(host) ?? { active: 0, queue: [] };
    this.perHost.set(host, bucket);
    if (bucket.active < this.opts.perHostConcurrency) {
      bucket.active += 1;
      return;
    }
    await new Promise<void>((resolve) => bucket.queue.push(resolve));
    bucket.active += 1;
  }

  private releaseHost(host: string): void {
    const bucket = this.perHost.get(host);
    if (!bucket) return;
    bucket.active -= 1;
    const next = bucket.queue.shift();
    if (next) next();
  }
}

function classify(href: string, status: number, chain: string[]): LinkCheckResult {
  const reason: LinkCheckReason | undefined =
    status >= 400 && status < 500 ? 'HTTP_4XX' : status >= 500 ? 'HTTP_5XX' : undefined;
  return {
    href,
    status,
    redirectChain: chain,
    isBroken: status >= 400,
    ...(reason ? { reason } : {}),
  };
}

function mapNetworkError(href: string, chain: string[], err: Error): LinkCheckResult {
  const isAbort = err.name === 'AbortError';
  return {
    href,
    status: 0,
    redirectChain: chain,
    isBroken: true,
    reason: isAbort ? 'TIMEOUT' : 'NETWORK',
  };
}

function resolveLocation(base: string, location: string): string {
  try {
    return new URL(location, base).href;
  } catch {
    return location;
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}
