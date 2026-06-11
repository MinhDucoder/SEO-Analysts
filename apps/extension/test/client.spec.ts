import { describe, it, expect, vi } from 'vitest';
import { check } from '../lib/client';
import { PublicApiError } from '../lib/errors';

const apiKey = 'sk_test_abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE';
const installId = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';
const baseUrl = 'http://localhost:3000';
const body = {
  input: { type: 'url' as const, url: 'https://example.com' },
  targetKeyword: 'seo',
};

function fakeResponse(opts: {
  ok: boolean;
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}): Response {
  const headers = new Headers(opts.headers ?? {});
  return new Response(opts.body == null ? null : JSON.stringify(opts.body), {
    status: opts.status,
    headers,
  });
}

describe('client.check', () => {
  it('sends Bearer + X-Install-Id headers and returns parsed JSON on 200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ ok: true, status: 200, body: { score: 91 } }),
    );
    const res = await check({ apiKey, installId, baseUrl, body, fetchImpl });
    expect(res).toEqual({ score: 91 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const firstCall = fetchImpl.mock.calls[0]!;
    const [calledUrl, init] = firstCall as [string, RequestInit];
    expect(calledUrl).toBe('http://localhost:3000/api/v1/public/check');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      authorization: `Bearer ${apiKey}`,
      'x-install-id': installId,
      'content-type': 'application/json',
    });
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('trims trailing slash from baseUrl so the path is well-formed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ ok: true, status: 200, body: { score: 100 } }),
    );
    await check({ apiKey, installId, baseUrl: 'http://localhost:3000/', body, fetchImpl });
    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'http://localhost:3000/api/v1/public/check',
    );
  });

  it('throws PublicApiError carrying the stable code from the envelope', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 401,
        body: {
          statusCode: 401,
          error: 'Unauthorized',
          code: 'INVALID_API_KEY',
          message: 'bad key',
          requestId: 'req_001',
        },
      }),
    );
    await expect(check({ apiKey, installId, baseUrl, body, fetchImpl })).rejects.toMatchObject({
      constructor: PublicApiError,
      code: 'INVALID_API_KEY',
      status: 401,
      requestId: 'req_001',
    });
  });

  it('parses Retry-After header into retryAfterSeconds on 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 429,
        headers: { 'retry-after': '12' },
        body: {
          statusCode: 429,
          error: 'RateLimitExceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'slow down',
        },
      }),
    );
    let captured: unknown;
    try {
      await check({ apiKey, installId, baseUrl, body, fetchImpl });
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeInstanceOf(PublicApiError);
    expect((captured as PublicApiError).retryAfterSeconds).toBe(12);
  });

  it('falls back to CLIENT_UNKNOWN when error body is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('<html>503</html>', { status: 503 }),
    );
    await expect(check({ apiKey, installId, baseUrl, body, fetchImpl })).rejects.toMatchObject({
      code: 'CLIENT_UNKNOWN',
      status: 503,
    });
  });

  it('synthesises CLIENT_NETWORK_ERROR when fetch itself rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(check({ apiKey, installId, baseUrl, body, fetchImpl })).rejects.toMatchObject({
      code: 'CLIENT_NETWORK_ERROR',
      status: 0,
      message: 'fetch failed',
    });
  });

  it('forwards AbortSignal so caller can cancel mid-flight', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_url: RequestInfo, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    });
    const promise = check({
      apiKey,
      installId,
      baseUrl,
      body,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toMatchObject({
      code: 'CLIENT_NETWORK_ERROR',
    });
  });
});
