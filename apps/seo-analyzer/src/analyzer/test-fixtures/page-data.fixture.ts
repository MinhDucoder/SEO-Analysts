import { PageData } from '../interfaces/page-data.interface';

export function makePageData(overrides: Partial<PageData> = {}): PageData {
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    statusCode: 200,
    responseTimeMs: 250,
    htmlSizeBytes: 50_000,
    title: 'Example Domain — Testing Page Title Here',
    metaDescription:
      'This is a perfectly sized meta description used for testing purposes. It is between 120 and 160 characters long to satisfy the SEO rule check.',
    metaRobots: 'index,follow',
    canonicalUrl: 'https://example.com/',
    language: 'en',
    faviconUrl: 'https://example.com/favicon.ico',
    h1Tags: ['Main Heading'],
    h2Tags: ['Section A', 'Section B'],
    h3Tags: ['Sub A1'],
    h4Tags: [],
    h5Tags: [],
    h6Tags: [],
    images: [
      { src: '/a.webp', alt: 'A image', sizeBytes: 50_000, format: 'webp' },
    ],
    internalLinks: [
      { href: '/a', anchorText: 'A', isInternal: true, rel: null, statusCode: 200 },
      { href: '/b', anchorText: 'B', isInternal: true, rel: null, statusCode: 200 },
      { href: '/c', anchorText: 'C', isInternal: true, rel: null, statusCode: 200 },
    ],
    externalLinks: [],
    schemaJsonLd: ['{"@context":"https://schema.org","@type":"WebPage"}'],
    openGraph: {
      'og:title': 'Example',
      'og:description': 'Desc',
      'og:image': 'https://example.com/og.png',
    },
    twitterCard: { 'twitter:card': 'summary' },
    isHttps: true,
    redirectChain: [],
    contentEncoding: 'gzip',
    cacheControl: 'public, max-age=3600',
    viewportContent: 'width=device-width, initial-scale=1',
    textContent: 'Example text content body of the page.',
    rawHtml: '<html lang="en"><head><title>Example</title></head><body></body></html>',
    ...overrides,
  };
}
