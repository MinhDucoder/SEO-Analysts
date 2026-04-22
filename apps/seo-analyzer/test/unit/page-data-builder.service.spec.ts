import { describe, expect, it } from 'vitest';
import { PageDataBuilderService } from '../../src/analyzer/services/page-data-builder.service';

describe('PageDataBuilderService', () => {
  const svc = new PageDataBuilderService();

  it('extracts title + meta description', () => {
    const pd = svc.build(
      '<html><head><title>Hello</title><meta name="description" content="d"/></head><body></body></html>',
    );
    expect(pd.title).toBe('Hello');
    expect(pd.metaDescription).toBe('d');
  });

  it('extracts headings by level', () => {
    const pd = svc.build('<html><body><h1>A</h1><h2>B</h2><h2>C</h2></body></html>');
    expect(pd.h1Tags).toEqual(['A']);
    expect(pd.h2Tags).toEqual(['B', 'C']);
  });

  it('extracts images with src + alt (null when missing)', () => {
    const pd = svc.build('<html><body><img src="/a.png" alt="A"/><img src="/b.jpg"/></body></html>');
    expect(pd.images).toHaveLength(2);
    expect(pd.images[0]).toMatchObject({ src: '/a.png', alt: 'A', format: 'png' });
    expect(pd.images[1].alt).toBeNull();
    expect(pd.images[1].format).toBe('jpg');
  });

  it('partitions links into internal/external when resolvedUrl given', () => {
    const pd = svc.build(
      '<a href="/x">int</a><a href="https://other.com/y">ext</a>',
      'https://site.com/post',
    );
    expect(pd.internalLinks).toHaveLength(1);
    expect(pd.externalLinks).toHaveLength(1);
    expect(pd.externalLinks[0].href).toBe('https://other.com/y');
  });

  it('extracts JSON-LD schema blocks', () => {
    const pd = svc.build('<script type="application/ld+json">{"@type":"Article"}</script>');
    expect(pd.schemaJsonLd).toEqual(['{"@type":"Article"}']);
  });

  it('extracts OG + Twitter meta into flat maps', () => {
    const pd = svc.build(`
      <meta property="og:title" content="OG Title" />
      <meta property="og:image" content="/og.png" />
      <meta name="twitter:card" content="summary" />
    `);
    expect(pd.openGraph).toEqual({ title: 'OG Title', image: '/og.png' });
    expect(pd.twitterCard).toEqual({ card: 'summary' });
  });

  it('collapses whitespace in textContent', () => {
    const pd = svc.build('<p>one\n\n\ttwo  three</p>');
    expect(pd.textContent).toBe('one two three');
  });

  it('sets url fields to placeholders when resolvedUrl missing', () => {
    const pd = svc.build('<html></html>');
    expect(pd.url).toBe('about:blank');
    expect(pd.finalUrl).toBe('about:blank');
    expect(pd.isHttps).toBe(false);
    expect(pd.statusCode).toBe(0);
  });

  it('flags HTTPS when resolvedUrl is https', () => {
    const pd = svc.build('<html></html>', 'https://x.com/');
    expect(pd.isHttps).toBe(true);
    expect(pd.statusCode).toBe(200);
  });

  it('extracts canonical + robots + lang + favicon', () => {
    const pd = svc.build(
      '<html lang="vi"><head>' +
        '<link rel="canonical" href="/canon"/>' +
        '<meta name="robots" content="noindex"/>' +
        '<link rel="icon" href="/fav.ico"/>' +
        '</head></html>',
    );
    expect(pd.canonicalUrl).toBe('/canon');
    expect(pd.metaRobots).toBe('noindex');
    expect(pd.language).toBe('vi');
    expect(pd.faviconUrl).toBe('/fav.ico');
  });
});
