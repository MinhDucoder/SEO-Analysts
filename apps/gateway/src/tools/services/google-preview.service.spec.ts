import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GooglePreviewService } from './google-preview.service';
import type { LiteFetcherService } from './lite-fetcher.service';

const fixture = `<!doctype html>
<html><head>
<title>Example Page Title</title>
<meta name="description" content="A short example description well within Google's recommended length range.">
<link rel="icon" href="/favicon.ico">
</head><body></body></html>`;

describe('GooglePreviewService', () => {
  let fetcher: { get: ReturnType<typeof vi.fn> };
  let svc: GooglePreviewService;

  beforeEach(() => {
    fetcher = { get: vi.fn() };
    svc = new GooglePreviewService(fetcher as unknown as LiteFetcherService);
  });

  describe('manual mode', () => {
    it('echoes fields and computes displayUrl', () => {
      const r = svc.executeManual({
        mode: 'manual',
        url: 'https://example.com/page',
        title: 'A title that is just right',
        description:
          'A description in the recommended range of seventy to one hundred and sixty characters here.',
      });
      expect(r.data.title).toBe('A title that is just right');
      expect(r.data.displayUrl).toContain('example.com');
    });

    it('warns when title too short', () => {
      const r = svc.executeManual({ mode: 'manual', title: 'Short', description: 'd'.repeat(80) });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'title', severity: 'warn' }),
      );
    });

    it('warns when title too long', () => {
      const r = svc.executeManual({
        mode: 'manual',
        title: 't'.repeat(70),
        description: 'd'.repeat(80),
      });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'title', severity: 'warn' }),
      );
    });

    it('errors when description empty', () => {
      const r = svc.executeManual({
        mode: 'manual',
        title: 'Reasonable title here',
        description: '',
      });
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ field: 'description', severity: 'error' }),
      );
    });

    it('warns when description out of 70..160 range', () => {
      const tooShort = svc.executeManual({
        mode: 'manual',
        title: 'Reasonable title here',
        description: 'short',
      });
      expect(tooShort.warnings).toContainEqual(
        expect.objectContaining({ field: 'description', severity: 'warn' }),
      );
      const tooLong = svc.executeManual({
        mode: 'manual',
        title: 'Reasonable title here',
        description: 'x'.repeat(200),
      });
      expect(tooLong.warnings).toContainEqual(
        expect.objectContaining({ field: 'description', severity: 'warn' }),
      );
    });
  });

  describe('url mode', () => {
    it('parses title + description + favicon from fetched HTML', async () => {
      fetcher.get.mockResolvedValue({
        url: 'https://example.com/',
        body: fixture,
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.data.title).toBe('Example Page Title');
      expect(r.data.description).toBe(
        "A short example description well within Google's recommended length range.",
      );
      expect(r.data.faviconUrl).toBe('https://example.com/favicon.ico');
    });

    it('falls back to og:description when meta description missing', async () => {
      const html = `<title>T</title><meta property="og:description" content="OG fallback description text">`;
      fetcher.get.mockResolvedValue({
        url: 'https://example.com/',
        body: html,
        status: 200,
        headers: {},
      });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/' });
      expect(r.data.description).toBe('OG fallback description text');
    });

    it('falls back to /favicon.ico when no <link rel="icon">', async () => {
      const html = `<title>T</title><meta name="description" content="${'x'.repeat(80)}">`;
      fetcher.get.mockResolvedValue({
        url: 'https://example.com/sub/',
        body: html,
        status: 200,
        headers: {},
      });
      const r = await svc.executeFromUrl({ mode: 'url', fetchUrl: 'https://example.com/sub/' });
      expect(r.data.faviconUrl).toBe('https://example.com/favicon.ico');
    });
  });
});
