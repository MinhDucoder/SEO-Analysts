import { describe, expect, it, beforeEach } from 'vitest';
import { PageDataExtractor } from '../../src/crawler/services/page-data-extractor';
import { FetchResult } from '../../src/crawler/domain/fetcher.interface';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Sample Page Title</title>
    <meta name="description" content="A sample meta description used for testing.">
    <meta name="robots" content="index,follow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="https://example.com/sample">
    <link rel="icon" href="/favicon.ico">
    <meta property="og:title" content="OG Sample">
    <meta property="og:image" content="https://example.com/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Sample"}</script>
  </head>
  <body>
    <header>Site header</header>
    <nav>Nav links</nav>
    <main>
      <h1>Main Heading</h1>
      <h2>Section A</h2>
      <h2>Section B</h2>
      <h3>Sub heading</h3>
      <p>Some paragraph text describing the page.</p>
      <img src="/a.webp" alt="Image A">
      <img src="https://cdn.example.com/b.png" alt="">
      <a href="/internal">Internal link</a>
      <a href="https://other.com/x">External link</a>
      <a href="https://example.com/page2">Same-host link</a>
    </main>
    <footer>Footer text</footer>
    <script>console.log('should not appear in textContent')</script>
    <style>.x{color:red}</style>
  </body>
</html>
`;

const baseFetch: FetchResult = {
  finalUrl: 'https://example.com/sample',
  statusCode: 200,
  responseTimeMs: 250,
  htmlSizeBytes: Buffer.byteLength(SAMPLE_HTML, 'utf8'),
  html: SAMPLE_HTML,
  redirectChain: [],
  contentEncoding: 'gzip',
  cacheControl: 'public, max-age=3600',
  isSpa: false,
  fetcherType: 'cheerio',
};

describe('PageDataExtractor', () => {
  let extractor: PageDataExtractor;

  beforeEach(() => {
    extractor = new PageDataExtractor();
  });

  it('extracts title and meta tags', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.title).toBe('Sample Page Title');
    expect(data.metaDescription).toBe('A sample meta description used for testing.');
    expect(data.metaRobots).toBe('index,follow');
    expect(data.viewportContent).toBe('width=device-width, initial-scale=1');
    expect(data.canonicalUrl).toBe('https://example.com/sample');
    expect(data.language).toBe('en');
    expect(data.faviconUrl).toBe('/favicon.ico');
  });

  it('extracts headings h1-h6', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.h1Tags).toEqual(['Main Heading']);
    expect(data.h2Tags).toEqual(['Section A', 'Section B']);
    expect(data.h3Tags).toEqual(['Sub heading']);
    expect(data.h4Tags).toEqual([]);
  });

  it('extracts images with alt text', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.images).toHaveLength(2);
    expect(data.images[0].src).toBe('/a.webp');
    expect(data.images[0].alt).toBe('Image A');
    expect(data.images[0].format).toBe('webp');
    expect(data.images[1].alt).toBe('');
    expect(data.images[1].format).toBe('png');
  });

  it('classifies links as internal vs external', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.internalLinks.length).toBe(2);
    expect(data.externalLinks.length).toBe(1);
    expect(data.internalLinks.find((l) => l.href === '/internal')).toBeDefined();
    expect(data.externalLinks[0].href).toBe('https://other.com/x');
  });

  it('extracts JSON-LD schemas', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.schemaJsonLd).toHaveLength(1);
    expect(JSON.parse(data.schemaJsonLd[0]).name).toBe('Sample');
  });

  it('extracts open graph and twitter card maps', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.openGraph['og:title']).toBe('OG Sample');
    expect(data.openGraph['og:image']).toBe('https://example.com/og.png');
    expect(data.twitterCard['twitter:card']).toBe('summary_large_image');
  });

  it('strips script/style/nav/header/footer from textContent', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.textContent).toContain('Some paragraph text');
    expect(data.textContent).not.toContain('console.log');
    expect(data.textContent).not.toContain('color:red');
    expect(data.textContent).not.toContain('Site header');
    expect(data.textContent).not.toContain('Footer text');
  });

  it('marks isHttps based on final URL', () => {
    const data = extractor.extract('https://example.com/sample', baseFetch);
    expect(data.isHttps).toBe(true);

    const httpData = extractor.extract('http://example.com/sample', {
      ...baseFetch,
      finalUrl: 'http://example.com/sample',
    });
    expect(httpData.isHttps).toBe(false);
  });

  it('returns empty arrays for missing elements gracefully', () => {
    const minimal: FetchResult = { ...baseFetch, html: '<html><body></body></html>' };
    const data = extractor.extract('https://example.com/', minimal);
    expect(data.h1Tags).toEqual([]);
    expect(data.images).toEqual([]);
    expect(data.internalLinks).toEqual([]);
    expect(data.title).toBeUndefined();
  });
});
