import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PoliteFetcher, FetchFn } from '../../src/crawler/infra/fetchers/polite-fetcher';

const textResponse = (status: number, body = '', headers: Record<string, string> = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/plain', ...headers },
  });

describe('PoliteFetcher', () => {
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFn = vi.fn();
  });

  it('fetches a URL and returns status + body + contentType', async () => {
    fetchFn.mockResolvedValue(textResponse(200, 'hello', { 'content-type': 'text/html' }));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn);
    const res = await pf.fetch('https://example.com/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('hello');
    expect(res.contentType).toBe('text/html');
    expect(res.attempts).toBe(1);
  });

  it('sends a custom User-Agent header', async () => {
    fetchFn.mockResolvedValue(textResponse(200));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { userAgent: 'SeoAnalyst/1.0' });
    await pf.fetch('https://example.com/');
    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['user-agent']).toBe('SeoAnalyst/1.0');
  });

  it('retries on 429 and returns 200 on second attempt', async () => {
    fetchFn
      .mockResolvedValueOnce(textResponse(429))
      .mockResolvedValueOnce(textResponse(200, 'ok'));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { backoffBaseMs: 1 });
    const res = await pf.fetch('https://example.com/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
    expect(res.attempts).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 up to maxRetries then returns the failing response', async () => {
    // mockImplementation (not mockResolvedValue) so each call yields a fresh
    // Response — Response bodies are streams that can only be read once.
    fetchFn.mockImplementation(async () => textResponse(503));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { maxRetries: 2, backoffBaseMs: 1 });
    const res = await pf.fetch('https://example.com/');
    expect(res.status).toBe(503);
    expect(res.attempts).toBe(3); // initial + 2 retries
  });

  it('does NOT retry on plain 4xx (e.g. 404) — only 429 + 5xx are retryable', async () => {
    fetchFn.mockImplementation(async () => textResponse(404));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { maxRetries: 3 });
    const res = await pf.fetch('https://example.com/');
    expect(res.status).toBe(404);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries on network error then succeeds', async () => {
    fetchFn
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(textResponse(200, 'recovered'));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { backoffBaseMs: 1 });
    const res = await pf.fetch('https://example.com/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('recovered');
    expect(res.attempts).toBe(2);
  });

  it('surfaces final network error when retries exhausted (returns status 0)', async () => {
    fetchFn.mockRejectedValue(new Error('dns timeout'));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { maxRetries: 1, backoffBaseMs: 1 });
    const res = await pf.fetch('https://example.com/');
    expect(res.status).toBe(0);
    expect(res.error).toMatch(/dns timeout/);
  });

  it('passes AbortSignal with timeout to fetch', async () => {
    fetchFn.mockResolvedValue(textResponse(200));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { timeoutMs: 1000 });
    await pf.fetch('https://example.com/');
    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('caps global concurrency: at most N fetches are in-flight simultaneously', async () => {
    let active = 0, maxActive = 0;
    fetchFn.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return textResponse(200);
    });
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { concurrency: 2 });
    await Promise.all([
      pf.fetch('https://a.example/'),
      pf.fetch('https://b.example/'),
      pf.fetch('https://c.example/'),
      pf.fetch('https://d.example/'),
    ]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('caps per-host concurrency independently of global', async () => {
    const activePerHost: Record<string, number> = {};
    let maxA = 0;
    fetchFn.mockImplementation(async (url: string) => {
      const host = new URL(url).host;
      activePerHost[host] = (activePerHost[host] ?? 0) + 1;
      if (host === 'a.example') maxA = Math.max(maxA, activePerHost[host]);
      await new Promise((r) => setTimeout(r, 5));
      activePerHost[host]--;
      return textResponse(200);
    });
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn, { concurrency: 10, perHostConcurrency: 1 });
    await Promise.all([
      pf.fetch('https://a.example/1'),
      pf.fetch('https://a.example/2'),
      pf.fetch('https://a.example/3'),
      pf.fetch('https://b.example/1'),
    ]);
    expect(maxA).toBe(1);
  });

  it('extracts contentType correctly even with charset suffix', async () => {
    fetchFn.mockResolvedValue(textResponse(200, '', { 'content-type': 'application/xml; charset=utf-8' }));
    const pf = new PoliteFetcher(fetchFn as unknown as FetchFn);
    const res = await pf.fetch('https://example.com/');
    expect(res.contentType).toBe('application/xml');
  });
});
