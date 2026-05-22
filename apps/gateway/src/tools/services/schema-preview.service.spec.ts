import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaPreviewService } from './schema-preview.service';
import type { LiteFetcherService } from './lite-fetcher.service';

describe('SchemaPreviewService', () => {
  let fetcher: { get: ReturnType<typeof vi.fn> };
  let svc: SchemaPreviewService;

  beforeEach(() => {
    fetcher = { get: vi.fn() };
    svc = new SchemaPreviewService(fetcher as unknown as LiteFetcherService);
  });

  describe('paste mode', () => {
    it('parses a single JSON-LD object and validates by type', () => {
      const raw = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Hello',
        image: 'x',
        datePublished: 'd',
        author: 'a',
      });
      const r = svc.executePaste(raw);
      expect(r.data.blocks).toHaveLength(1);
      expect(r.data.blocks[0]!.type).toBe('Article');
      expect(r.data.blocks[0]!.validation.errors).toHaveLength(0);
      expect(r.data.summary).toEqual({ totalBlocks: 1, validBlocks: 1, invalidBlocks: 0 });
    });

    it('flattens an array of objects', () => {
      const raw = JSON.stringify([
        { '@type': 'Organization', name: 'Org', url: 'u', logo: 'l' },
        { '@type': 'Product' }, // invalid — missing name
      ]);
      const r = svc.executePaste(raw);
      expect(r.data.blocks).toHaveLength(2);
      expect(r.data.summary.totalBlocks).toBe(2);
      expect(r.data.summary.invalidBlocks).toBe(1);
    });

    it('expands @graph', () => {
      const raw = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', name: 'Org' },
          { '@type': 'BreadcrumbList', itemListElement: [{ position: 1, name: 'Home' }] },
        ],
      });
      const r = svc.executePaste(raw);
      expect(r.data.blocks).toHaveLength(2);
    });

    it('handles @type as an array (routes to a known validator)', () => {
      const raw = JSON.stringify({ '@type': ['Thing', 'Product'], name: 'P', image: 'i', offers: { price: '9', priceCurrency: 'USD' } });
      const r = svc.executePaste(raw);
      expect(r.data.blocks[0]!.validation.errors).toHaveLength(0);
    });

    it('returns an error warning for invalid JSON', () => {
      const r = svc.executePaste('{ not json');
      expect(r.data.blocks).toHaveLength(0);
      expect(r.warnings).toContainEqual(
        expect.objectContaining({ severity: 'error' }),
      );
    });

    it('marks unsupported types as valid (not validated)', () => {
      const raw = JSON.stringify({ '@type': 'WebSite', name: 'Site' });
      const r = svc.executePaste(raw);
      expect(r.data.blocks[0]!.type).toBe('WebSite');
      expect(r.data.summary.validBlocks).toBe(1);
    });
  });

  describe('url mode', () => {
    it('extracts all ld+json scripts from HTML', async () => {
      const html = `<html><head>
        <script type="application/ld+json">${JSON.stringify({ '@type': 'Organization', name: 'Org', url: 'u', logo: 'l' })}</script>
        <script type="application/ld+json">${JSON.stringify({ '@type': 'FAQPage', mainEntity: [{ name: 'Q', acceptedAnswer: { text: 'A' } }] })}</script>
      </head></html>`;
      fetcher.get.mockResolvedValue({ url: 'https://example.com/', body: html, status: 200, headers: {} });
      const r = await svc.executeFromUrl('https://example.com/');
      expect(r.data.blocks).toHaveLength(2);
      expect(r.data.summary.totalBlocks).toBe(2);
    });

    it('skips malformed ld+json blocks without crashing', async () => {
      const html = `<html><head>
        <script type="application/ld+json">{ broken</script>
        <script type="application/ld+json">${JSON.stringify({ '@type': 'Organization', name: 'Org' })}</script>
      </head></html>`;
      fetcher.get.mockResolvedValue({ url: 'https://example.com/', body: html, status: 200, headers: {} });
      const r = await svc.executeFromUrl('https://example.com/');
      expect(r.data.blocks).toHaveLength(1);
    });
  });
});
