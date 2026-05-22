import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteFetcherService } from './lite-fetcher.service';

// Mock DNS resolver
vi.mock('node:dns/promises', () => ({
  default: {
    lookup: vi.fn(),
  },
  lookup: vi.fn(),
}));

import dns from 'node:dns/promises';

describe('LiteFetcherService — SSRF gates', () => {
  let svc: LiteFetcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new LiteFetcherService();
  });

  it('rejects non-http(s) protocol', async () => {
    await expect(svc.get('file:///etc/passwd')).rejects.toMatchObject({
      code: 'INVALID_PROTOCOL',
    });
    await expect(svc.get('gopher://x')).rejects.toMatchObject({ code: 'INVALID_PROTOCOL' });
    await expect(svc.get('ftp://x')).rejects.toMatchObject({ code: 'INVALID_PROTOCOL' });
  });

  it('rejects non-whitelisted port', async () => {
    await expect(svc.get('http://example.com:22/')).rejects.toMatchObject({
      code: 'INVALID_PORT',
    });
    await expect(svc.get('http://example.com:5432/')).rejects.toMatchObject({
      code: 'INVALID_PORT',
    });
  });

  it('accepts implicit port (80) — reaches fetch successfully', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const svc2 = new LiteFetcherService({
      dispatcherFactory: () =>
        ({
          request: async () => ({
            statusCode: 200,
            headers: { 'content-type': 'text/html' },
            body: {
              async *[Symbol.asyncIterator]() {
                yield Buffer.from('ok');
              },
            },
          }),
        }) as any,
    });
    const res = await svc2.get('http://example.com/');
    expect(res.status).toBe(200);
  });

  it('rejects when DNS resolves to private IPv4', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '10.0.0.5', family: 4 }] as any);
    await expect(svc.get('http://internal.example.com/')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
  });

  it('rejects when DNS resolves to AWS metadata 169.254.169.254', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([
      { address: '169.254.169.254', family: 4 },
    ] as any);
    await expect(svc.get('http://rebound.example.com/')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
  });

  it('rejects when DNS resolves to private IPv6 (fc00::/7)', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: 'fc00::1', family: 6 }] as any);
    await expect(svc.get('http://v6.example.com/')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
  });

  it('rejects on DNS failure', async () => {
    vi.mocked(dns.lookup).mockRejectedValue(new Error('ENOTFOUND'));
    await expect(svc.get('http://does-not-exist.example.com/')).rejects.toMatchObject({
      code: 'DNS_FAIL',
    });
  });
});

describe('LiteFetcherService — fetch behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — fetches public URL and returns body string', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const svc = new LiteFetcherService({
      dispatcherFactory: () =>
        ({
          request: async () => ({
            statusCode: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
            body: {
              async *[Symbol.asyncIterator]() {
                yield Buffer.from('hello');
              },
            },
          }),
        }) as any,
    });

    const res = await svc.get('http://example.com/');
    expect(res.status).toBe(200);
    expect(res.body).toBe('hello');
    expect(res.contentType).toContain('text/html');
  });

  it('aborts when response exceeds maxBytes', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const big = Buffer.alloc(6 * 1024 * 1024, 0x41);
    const svc = new LiteFetcherService({
      dispatcherFactory: () =>
        ({
          request: async () => ({
            statusCode: 200,
            headers: { 'content-type': 'text/html' },
            body: {
              async *[Symbol.asyncIterator]() {
                yield big;
              },
            },
          }),
        }) as any,
    });
    await expect(svc.get('http://example.com/', { maxBytes: 5 * 1024 * 1024 })).rejects.toMatchObject(
      { code: 'TOO_LARGE' },
    );
  });

  it('rejects on non-2xx', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const svc = new LiteFetcherService({
      dispatcherFactory: () =>
        ({
          request: async () => ({
            statusCode: 500,
            headers: {},
            body: {
              async *[Symbol.asyncIterator]() {
                yield Buffer.from('');
              },
            },
          }),
        }) as any,
    });
    await expect(svc.get('http://example.com/')).rejects.toMatchObject({ code: 'BAD_STATUS' });
  });

  it('follows redirect within limit and re-checks IP', async () => {
    vi.mocked(dns.lookup)
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }] as any) // initial
      .mockResolvedValueOnce([{ address: '8.8.4.4', family: 4 }] as any); // after redirect

    let call = 0;
    const svc = new LiteFetcherService({
      dispatcherFactory: () =>
        ({
          request: async () => {
            call++;
            if (call === 1) {
              return {
                statusCode: 302,
                headers: { location: 'http://example.org/' },
                body: {
                  async *[Symbol.asyncIterator]() {
                    yield Buffer.from('');
                  },
                },
              };
            }
            return {
              statusCode: 200,
              headers: { 'content-type': 'text/html' },
              body: {
                async *[Symbol.asyncIterator]() {
                  yield Buffer.from('final');
                },
              },
            };
          },
        }) as any,
    });
    const res = await svc.get('http://example.com/');
    expect(res.body).toBe('final');
    expect(res.url).toBe('http://example.org/');
  });

  it('rejects redirect to private IP', async () => {
    vi.mocked(dns.lookup)
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }] as any) // initial public
      .mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }] as any); // redirect to private

    const svc = new LiteFetcherService({
      dispatcherFactory: () =>
        ({
          request: async () => ({
            statusCode: 302,
            headers: { location: 'http://internal.example.com/' },
            body: {
              async *[Symbol.asyncIterator]() {
                yield Buffer.from('');
              },
            },
          }),
        }) as any,
    });
    await expect(svc.get('http://example.com/')).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
  });

  it('rejects after exceeding maxRedirects', async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as any);
    const svc = new LiteFetcherService({
      dispatcherFactory: () =>
        ({
          request: async () => ({
            statusCode: 302,
            headers: { location: 'http://a.example.com/' },
            body: {
              async *[Symbol.asyncIterator]() {
                yield Buffer.from('');
              },
            },
          }),
        }) as any,
    });
    await expect(svc.get('http://example.com/', { maxRedirects: 2 })).rejects.toMatchObject({
      code: 'TOO_MANY_REDIRECTS',
    });
  });
});
