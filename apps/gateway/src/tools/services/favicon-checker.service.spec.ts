import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaviconCheckerService } from './favicon-checker.service';
import type { LiteFetcherService } from './lite-fetcher.service';

function png(w: number, h: number): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    Buffer.from([(w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255]),
    Buffer.from([(h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255]),
    Buffer.from([8, 2, 0, 0, 0, 0, 0, 0, 0]),
  ]);
}

const completeHtml = `<html><head>
  <link rel="icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="mask-icon" href="/safari.svg" color="#000000">
  <link rel="manifest" href="/site.webmanifest">
</head></html>`;

const manifestJson = JSON.stringify({
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
});

describe('FaviconCheckerService', () => {
  let fetcher: { get: ReturnType<typeof vi.fn>; head: ReturnType<typeof vi.fn> };
  let svc: FaviconCheckerService;

  beforeEach(() => {
    fetcher = { get: vi.fn(), head: vi.fn() };
    svc = new FaviconCheckerService(fetcher as unknown as LiteFetcherService);
  });

  it('discovers link icons, manifest icons, and fallback (complete site)', async () => {
    fetcher.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/') {
        return { url, body: completeHtml, status: 200, headers: {} };
      }
      if (url.endsWith('/site.webmanifest')) {
        return { url, body: manifestJson, status: 200, headers: {} };
      }
      return { url, bodyBuffer: png(64, 64), status: 200, headers: {} };
    });
    fetcher.head.mockImplementation(async (url: string) => ({
      url,
      status: 200,
      headers: {},
      contentType: 'image/png',
      contentLength: 2048,
    }));

    const r = await svc.execute('https://example.com/');
    const hrefs = r.data.icons.map((i) => i.href);
    expect(hrefs).toContain('https://example.com/favicon.ico');
    expect(hrefs).toContain('https://example.com/apple-touch-icon.png');
    expect(hrefs).toContain('https://example.com/icons/icon-192.png');
    expect(r.data.icons.some((i) => i.source === 'manifest')).toBe(true);
    expect(r.data.coverage).toMatchObject({
      hasBasic: true,
      hasAppleTouch: true,
      hasManifest: true,
      hasPwaSizes: true,
      hasMaskIcon: true,
    });
  });

  it('falls back to /favicon.ico when page declares no icons', async () => {
    fetcher.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/') {
        return { url, body: '<html><head></head></html>', status: 200, headers: {} };
      }
      return { url, bodyBuffer: png(32, 32), status: 200, headers: {} };
    });
    fetcher.head.mockResolvedValue({
      url: 'https://example.com/favicon.ico',
      status: 200,
      headers: {},
      contentType: 'image/x-icon',
      contentLength: 1000,
    });

    const r = await svc.execute('https://example.com/');
    const fallback = r.data.icons.find((i) => i.source === 'fallback');
    expect(fallback?.href).toBe('https://example.com/favicon.ico');
    expect(r.data.coverage.hasBasic).toBe(true);
    expect(r.data.coverage.hasAppleTouch).toBe(false);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ field: 'apple-touch-icon', severity: 'info' }),
    );
  });

  it('marks a broken icon as not existing and warns', async () => {
    fetcher.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/') {
        return {
          url,
          body: '<html><head><link rel="icon" href="/missing.png"></head></html>',
          status: 200,
          headers: {},
        };
      }
      return { url, bodyBuffer: png(16, 16), status: 200, headers: {} };
    });
    fetcher.head.mockImplementation(async (url: string) => {
      if (url.endsWith('/missing.png')) {
        return { url, status: 404, headers: {}, contentType: '', contentLength: 0 };
      }
      return { url, status: 200, headers: {}, contentType: 'image/x-icon', contentLength: 1000 };
    });

    const r = await svc.execute('https://example.com/');
    const missing = r.data.icons.find((i) => i.href.endsWith('/missing.png'));
    expect(missing?.exists).toBe(false);
    expect(r.warnings.some((w) => w.severity === 'warn')).toBe(true);
  });

  it('tolerates head() throwing for a candidate (exists=false)', async () => {
    fetcher.get.mockResolvedValue({
      url: 'https://example.com/',
      body: '<html><head><link rel="icon" href="/favicon.ico"></head></html>',
      status: 200,
      headers: {},
    });
    fetcher.head.mockRejectedValue(new Error('DNS_FAIL'));

    const r = await svc.execute('https://example.com/');
    expect(r.data.icons.every((i) => i.exists === false)).toBe(true);
  });

  it('computes dimensions for small icons via image-size', async () => {
    fetcher.get.mockImplementation(async (url: string) => {
      if (url === 'https://example.com/') {
        return {
          url,
          body: '<html><head><link rel="icon" href="/favicon.png"></head></html>',
          status: 200,
          headers: {},
        };
      }
      return { url, bodyBuffer: png(48, 48), status: 200, headers: {} };
    });
    fetcher.head.mockResolvedValue({
      url: 'https://example.com/favicon.png',
      status: 200,
      headers: {},
      contentType: 'image/png',
      contentLength: 1500,
    });

    const r = await svc.execute('https://example.com/');
    const icon = r.data.icons.find((i) => i.href.endsWith('/favicon.png'));
    expect(icon?.size).toEqual({ width: 48, height: 48 });
    expect(icon?.format).toBe('png');
  });
});
