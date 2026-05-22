import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialPreviewService } from './social-preview.service';
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

describe('SocialPreviewService', () => {
  let fetcher: { get: ReturnType<typeof vi.fn> };
  let svc: SocialPreviewService;

  beforeEach(() => {
    fetcher = { get: vi.fn() };
    svc = new SocialPreviewService(fetcher as unknown as LiteFetcherService);
  });

  describe('manual mode', () => {
    it('echoes provided OG/Twitter fields', () => {
      const r = svc.executeManual({
        mode: 'manual',
        ogTitle: 'Hello',
        ogDescription: 'World',
        ogImage: 'https://cdn.example.com/og.png',
        ogSiteName: 'Example',
        twitterCard: 'summary_large_image',
        twitterImage: 'https://cdn.example.com/tw.png',
      });
      expect(r.data.ogTitle).toBe('Hello');
      expect(r.data.twitterCard).toBe('summary_large_image');
    });

    it('errors when og:image missing', () => {
      const r = svc.executeManual({ mode: 'manual', ogTitle: 'Hello' });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'og:image', severity: 'error' }),
      );
    });

    it('warns when og:title longer than 60', () => {
      const r = svc.executeManual({
        mode: 'manual',
        ogTitle: 't'.repeat(61),
        ogImage: 'https://cdn.example.com/og.png',
        twitterCard: 'summary',
      });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'og:title', severity: 'warn' }),
      );
    });

    it('info when twitter:card missing', () => {
      const r = svc.executeManual({
        mode: 'manual',
        ogTitle: 'Hello',
        ogImage: 'https://cdn.example.com/og.png',
      });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'twitter:card', severity: 'info' }),
      );
    });

    it('info when twitter:image missing but og:image present', () => {
      const r = svc.executeManual({
        mode: 'manual',
        ogImage: 'https://cdn.example.com/og.png',
        twitterCard: 'summary',
      });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'twitter:image', severity: 'info' }),
      );
    });
  });

  describe('url mode', () => {
    const html = `<html><head>
      <meta property="og:title" content="OG Title">
      <meta property="og:description" content="OG Desc">
      <meta property="og:image" content="/og.png">
      <meta property="og:site_name" content="Example">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:image" content="/tw.png">
    </head></html>`;

    it('parses OG + Twitter meta and resolves image URLs', async () => {
      fetcher.get
        .mockResolvedValueOnce({ url: 'https://example.com/', body: html, status: 200, headers: {} })
        .mockResolvedValueOnce({ bodyBuffer: png(1910, 1000), url: 'https://example.com/og.png' });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.data.ogTitle).toBe('OG Title');
      expect(r.data.ogImage).toBe('https://example.com/og.png');
      expect(r.data.twitterImage).toBe('https://example.com/tw.png');
    });

    it('computes ogImageMeta dimensions from fetched image', async () => {
      fetcher.get
        .mockResolvedValueOnce({ url: 'https://example.com/', body: html, status: 200, headers: {} })
        .mockResolvedValueOnce({ bodyBuffer: png(1910, 1000), url: 'https://example.com/og.png' });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.data.ogImageMeta).toMatchObject({ width: 1910, height: 1000 });
    });

    it('warns when og:image aspect is not ~1.91:1', async () => {
      fetcher.get
        .mockResolvedValueOnce({ url: 'https://example.com/', body: html, status: 200, headers: {} })
        .mockResolvedValueOnce({ bodyBuffer: png(600, 600), url: 'https://example.com/og.png' });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'og:image', severity: 'warn' }),
      );
    });

    it('does not warn on aspect when og:image is ~1.91:1', async () => {
      fetcher.get
        .mockResolvedValueOnce({ url: 'https://example.com/', body: html, status: 200, headers: {} })
        .mockResolvedValueOnce({ bodyBuffer: png(1910, 1000), url: 'https://example.com/og.png' });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      const aspectWarn = r.warnings.find(
        (w) => w.field === 'og:image' && w.severity === 'warn',
      );
      expect(aspectWarn).toBeUndefined();
    });

    it('tolerates image fetch failure (no dims, no crash)', async () => {
      fetcher.get
        .mockResolvedValueOnce({ url: 'https://example.com/', body: html, status: 200, headers: {} })
        .mockRejectedValueOnce(new Error('TOO_LARGE'));
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.data.ogImageMeta).toBeUndefined();
      expect(r.data.ogTitle).toBe('OG Title');
    });

    it('errors when no OG meta at all', async () => {
      fetcher.get.mockResolvedValueOnce({
        url: 'https://example.com/',
        body: '<html><head></head></html>',
        status: 200,
        headers: {},
      });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'og:image', severity: 'error' }),
      );
    });
  });
});
