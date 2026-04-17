/**
 * @file Rate-limited HTTP client for F1 site-wide crawl. Enforces
 *   - global concurrency (default 10)
 *   - per-host concurrency (default 2) — stops us DDoS-ing one domain
 *   - AbortSignal timeout (default 5s)
 *   - exponential backoff on 429 / 5xx with bounded retries
 *   - never retries 4xx except 429 (client error is permanent)
 * The `fetch` implementation is injected so tests can stub responses.
 */

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface PoliteFetcherOptions {
  concurrency?: number;
  perHostConcurrency?: number;
  timeoutMs?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  userAgent?: string;
}

export interface PoliteFetchResult {
  status: number;
  body: string;
  contentType: string;
  attempts: number;
  durationMs: number;
  error?: string;
}

const DEFAULTS = {
  concurrency: 10,
  perHostConcurrency: 2,
  timeoutMs: 5000,
  maxRetries: 2,
  backoffBaseMs: 2000,
  userAgent: 'SeoAnalyst/1.0 (+https://github.com/MinhDucoder/SEO-Analysts)',
};

export class PoliteFetcher {
  private readonly opts: Required<PoliteFetcherOptions>;
  private active = 0;
  private readonly queue: Array<() => void> = [];
  private readonly perHost = new Map<string, { active: number; queue: Array<() => void> }>();

  constructor(private readonly fetchFn: FetchFn, opts: PoliteFetcherOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  async fetch(url: string): Promise<PoliteFetchResult> {
    const host = safeHost(url);
    await this.acquireGlobal();
    if (host) await this.acquireHost(host);
    try {
      return await this.doWithRetry(url);
    } finally {
      if (host) this.releaseHost(host);
      this.releaseGlobal();
    }
  }

  private async doWithRetry(url: string): Promise<PoliteFetchResult> {
    const started = Date.now();
    let attempt = 0;
    let lastError: Error | undefined;
    let lastResponse: PoliteFetchResult | undefined;

    while (attempt <= this.opts.maxRetries) {
      attempt += 1;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);
        let res: Response;
        try {
          res = await this.fetchFn(url, {
            headers: { 'user-agent': this.opts.userAgent },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        const body = await res.text();
        const contentType = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
        lastResponse = {
          status: res.status,
          body,
          contentType,
          attempts: attempt,
          durationMs: Date.now() - started,
        };

        if (!isRetryableStatus(res.status) || attempt > this.opts.maxRetries) {
          return lastResponse;
        }
      } catch (err) {
        lastError = err as Error;
        if (attempt > this.opts.maxRetries) break;
      }
      await sleep(this.backoffFor(attempt));
    }

    if (lastResponse) return lastResponse;
    return {
      status: 0,
      body: '',
      contentType: '',
      attempts: attempt,
      durationMs: Date.now() - started,
      error: lastError?.message ?? 'network error',
    };
  }

  private backoffFor(attempt: number): number {
    return this.opts.backoffBaseMs * Math.pow(2, attempt - 1);
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

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
