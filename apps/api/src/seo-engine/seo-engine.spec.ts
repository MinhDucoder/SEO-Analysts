import { CrawlResult } from '../crawler/crawler.service';
import {
  RobotsTxtAnalyzer,
  CanonicalAnalyzer,
  HttpsAnalyzer,
  RedirectChainAnalyzer,
  SchemaMarkupAnalyzer,
  MetaRobotsAnalyzer,
  SitemapAnalyzer,
} from './rules/technical';
import {
  TitlePresenceAnalyzer,
  TitleLengthAnalyzer,
  MetaDescriptionPresenceAnalyzer,
  H1PresenceAnalyzer,
  H1UniquenessAnalyzer,
  ImageAltAnalyzer,
  InternalLinksAnalyzer,
} from './rules/on-page';
import {
  SlowResponseAnalyzer,
  LargePageSizeAnalyzer,
  MissingCompressionAnalyzer,
  MissingCacheHeadersAnalyzer,
} from './rules/performance';

const basePage: CrawlResult = {
  url: 'https://example.com',
  statusCode: 200,
  responseTimeMs: 200,
  htmlSize: 5000,
  title: 'Example Page Title Here',
  metaDescription:
    'This is a well-crafted meta description that is exactly the right length for search engine results pages display.',
  metaRobots: null,
  canonicalUrl: 'https://example.com',
  h1Tags: ['Main Heading'],
  h2Tags: ['Sub Heading'],
  h3Tags: [],
  h4Tags: [],
  h5Tags: [],
  h6Tags: [],
  images: [{ src: '/img.jpg', alt: 'An image' }],
  internalLinks: ['https://example.com/about'],
  externalLinks: ['https://other.com'],
  schemaMarkup: [{ '@type': 'WebPage' }],
  openGraphTags: {},
  responseHeaders: {
    'content-encoding': 'gzip',
    'cache-control': 'max-age=3600',
  },
  redirectChain: [],
  hasRobotsTxt: true,
  robotsTxtContent: 'User-agent: *\nAllow: /',
  hasSitemap: true,
  sitemapUrl: 'https://example.com/sitemap.xml',
  isHttps: true,
  contentEncoding: 'gzip',
  cacheControl: 'max-age=3600',
};

function pageWith(overrides: Partial<CrawlResult>): CrawlResult {
  return { ...basePage, ...overrides };
}

describe('Technical SEO Rules', () => {
  it('RobotsTxtAnalyzer: flags missing robots.txt', () => {
    const issues = new RobotsTxtAnalyzer().analyze(
      pageWith({ hasRobotsTxt: false }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('tech-robots-txt');
  });

  it('RobotsTxtAnalyzer: passes when robots.txt exists', () => {
    expect(new RobotsTxtAnalyzer().analyze(basePage)).toHaveLength(0);
  });

  it('SitemapAnalyzer: flags missing sitemap', () => {
    const issues = new SitemapAnalyzer().analyze(
      pageWith({ hasSitemap: false }),
    );
    expect(issues).toHaveLength(1);
  });

  it('CanonicalAnalyzer: flags missing canonical', () => {
    const issues = new CanonicalAnalyzer().analyze(
      pageWith({ canonicalUrl: null }),
    );
    expect(issues).toHaveLength(1);
  });

  it('HttpsAnalyzer: flags HTTP', () => {
    const issues = new HttpsAnalyzer().analyze(pageWith({ isHttps: false }));
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('critical');
  });

  it('RedirectChainAnalyzer: flags >2 redirects', () => {
    const issues = new RedirectChainAnalyzer().analyze(
      pageWith({
        redirectChain: ['http://a.com', 'http://b.com', 'http://c.com'],
      }),
    );
    expect(issues).toHaveLength(1);
  });

  it('SchemaMarkupAnalyzer: flags no structured data', () => {
    const issues = new SchemaMarkupAnalyzer().analyze(
      pageWith({ schemaMarkup: [] }),
    );
    expect(issues).toHaveLength(1);
  });

  it('MetaRobotsAnalyzer: flags noindex', () => {
    const issues = new MetaRobotsAnalyzer().analyze(
      pageWith({ metaRobots: 'noindex, nofollow' }),
    );
    expect(issues).toHaveLength(1);
  });
});

describe('On-Page SEO Rules', () => {
  it('TitlePresenceAnalyzer: flags missing title', () => {
    const issues = new TitlePresenceAnalyzer().analyze(
      pageWith({ title: null }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('critical');
  });

  it('TitleLengthAnalyzer: flags short title', () => {
    const issues = new TitleLengthAnalyzer().analyze(
      pageWith({ title: 'Short' }),
    );
    expect(issues).toHaveLength(1);
  });

  it('TitleLengthAnalyzer: flags long title', () => {
    const issues = new TitleLengthAnalyzer().analyze(
      pageWith({
        title: 'A'.repeat(70),
      }),
    );
    expect(issues).toHaveLength(1);
  });

  it('MetaDescriptionPresenceAnalyzer: flags missing meta desc', () => {
    const issues = new MetaDescriptionPresenceAnalyzer().analyze(
      pageWith({ metaDescription: null }),
    );
    expect(issues).toHaveLength(1);
  });

  it('H1PresenceAnalyzer: flags missing H1', () => {
    const issues = new H1PresenceAnalyzer().analyze(pageWith({ h1Tags: [] }));
    expect(issues).toHaveLength(1);
  });

  it('H1UniquenessAnalyzer: flags multiple H1s', () => {
    const issues = new H1UniquenessAnalyzer().analyze(
      pageWith({ h1Tags: ['H1 A', 'H1 B'] }),
    );
    expect(issues).toHaveLength(1);
  });

  it('ImageAltAnalyzer: flags images without alt', () => {
    const issues = new ImageAltAnalyzer().analyze(
      pageWith({
        images: [
          { src: '/a.jpg', alt: null },
          { src: '/b.jpg', alt: '' },
        ],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].affectedElements).toHaveLength(2);
  });

  it('InternalLinksAnalyzer: flags no internal links', () => {
    const issues = new InternalLinksAnalyzer().analyze(
      pageWith({ internalLinks: [] }),
    );
    expect(issues).toHaveLength(1);
  });
});

describe('Performance Rules', () => {
  it('SlowResponseAnalyzer: flags slow TTFB', () => {
    const issues = new SlowResponseAnalyzer().analyze(
      pageWith({ responseTimeMs: 800 }),
    );
    expect(issues).toHaveLength(1);
  });

  it('SlowResponseAnalyzer: passes fast TTFB', () => {
    expect(new SlowResponseAnalyzer().analyze(basePage)).toHaveLength(0);
  });

  it('LargePageSizeAnalyzer: flags >3MB', () => {
    const issues = new LargePageSizeAnalyzer().analyze(
      pageWith({ htmlSize: 4 * 1024 * 1024 }),
    );
    expect(issues).toHaveLength(1);
  });

  it('MissingCompressionAnalyzer: flags no compression', () => {
    const issues = new MissingCompressionAnalyzer().analyze(
      pageWith({ contentEncoding: null }),
    );
    expect(issues).toHaveLength(1);
  });

  it('MissingCacheHeadersAnalyzer: flags no cache headers', () => {
    const issues = new MissingCacheHeadersAnalyzer().analyze(
      pageWith({
        cacheControl: null,
        responseHeaders: {},
      }),
    );
    expect(issues).toHaveLength(1);
  });
});
