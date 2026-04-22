import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { LiteFetchService } from '../../src/crawler/services/lite-fetch.service';

const makeRedis = () => ({
  get: vi.fn().mockResolvedValue(null),
  setex: vi.fn().mockResolvedValue('OK'),
}) as any;

describe('LiteFetchService', () => {
  let svc: LiteFetchService;
  let redis: any;
  let fetchSpy: any;

  beforeEach(() => {
    redis = makeRedis();
    svc = new LiteFetchService(redis);
    fetchSpy = vi.spyOn(globalThis, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it('fetches HTML successfully and caches', async () => {
    fetchSpy.mockResolvedValue(
      new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    );
    const r = await svc.fetch({ url: 'https://example.com/a' });
    expect(r.statusCode).toBe(200);
    expect(r.html).toContain('<html>');
    expect(r.fromCache).toBe(false);
    expect(redis.setex).toHaveBeenCalled();
  });

  it('returns cached result without calling fetch', async () => {
    redis.get.mockResolvedValueOnce(
      JSON.stringify({
        finalUrl: 'https://example.com/a',
        statusCode: 200,
        html: '<html>cached</html>',
        sizeBytes: 20,
        fetchTimeMs: 1,
        redirectChain: [],
        fromCache: false,
      }),
    );
    const r = await svc.fetch({ url: 'https://example.com/a' });
    expect(r.fromCache).toBe(true);
    expect(r.html).toContain('cached');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws on 404', async () => {
    fetchSpy.mockResolvedValue(new Response('not found', { status: 404 }));
    await expect(svc.fetch({ url: 'https://example.com/a' })).rejects.toThrow(/404/);
  });

  it('throws on non-HTML content-type', async () => {
    fetchSpy.mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(svc.fetch({ url: 'https://example.com/a' })).rejects.toThrow(/not HTML/);
  });

  it('rejects localhost hostname (SSRF)', async () => {
    await expect(svc.fetch({ url: 'http://localhost/x' })).rejects.toThrow(/local/i);
  });

  it('rejects private IP 127.0.0.1', async () => {
    await expect(svc.fetch({ url: 'http://127.0.0.1/x' })).rejects.toThrow(/private/i);
  });

  it('rejects AWS metadata IP 169.254.169.254', async () => {
    await expect(svc.fetch({ url: 'http://169.254.169.254/latest/meta-data/' })).rejects.toThrow(/private/i);
  });

  it('rejects non-http/https protocol', async () => {
    await expect(svc.fetch({ url: 'ftp://example.com/a' })).rejects.toThrow(/protocol/i);
  });
});
