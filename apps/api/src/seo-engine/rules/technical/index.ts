import { Injectable } from '@nestjs/common';
import { CrawlResult } from '../../../crawler/crawler.service';
import {
  IssueCategory,
  IssueSeverity,
  SeoAnalyzer,
  SeoIssue,
} from '../../analyzer.interface';

@Injectable()
export class RobotsTxtAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'tech-robots-txt';
  readonly category = IssueCategory.TECHNICAL;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.hasRobotsTxt) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Missing robots.txt',
          description: 'No robots.txt file found at the root of the domain.',
          severity: IssueSeverity.HIGH,
          category: this.category,
          recommendation:
            'Create a robots.txt file at the root of your domain to control how search engines crawl your site.',
          fixDifficulty: 2,
          impactWeight: 7,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class SitemapAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'tech-sitemap';
  readonly category = IssueCategory.TECHNICAL;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.hasSitemap) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Missing XML sitemap',
          description:
            'No XML sitemap found referenced in robots.txt or at /sitemap.xml.',
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Create an XML sitemap and reference it in your robots.txt file.',
          fixDifficulty: 3,
          impactWeight: 6,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class CanonicalAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'tech-canonical';
  readonly category = IssueCategory.TECHNICAL;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.canonicalUrl) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Missing canonical URL',
          description: 'No <link rel="canonical"> tag found on the page.',
          severity: IssueSeverity.HIGH,
          category: this.category,
          recommendation:
            'Add a canonical URL tag to prevent duplicate content issues.',
          fixDifficulty: 2,
          impactWeight: 8,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class HttpsAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'tech-https';
  readonly category = IssueCategory.TECHNICAL;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.isHttps) {
      return [
        {
          ruleId: this.ruleId,
          title: 'HTTPS not enforced',
          description: 'The page is served over HTTP without HTTPS.',
          severity: IssueSeverity.CRITICAL,
          category: this.category,
          recommendation:
            "Enable HTTPS and set up HTTP to HTTPS redirect. Get a free SSL certificate from Let's Encrypt.",
          fixDifficulty: 4,
          impactWeight: 10,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class RedirectChainAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'tech-redirect-chain';
  readonly category = IssueCategory.TECHNICAL;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.redirectChain.length > 2) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Excessive redirect chain',
          description: `The page has ${page.redirectChain.length} redirects before reaching the final URL.`,
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Reduce redirect chains to at most 1 redirect. Update links to point directly to the final URL.',
          fixDifficulty: 3,
          impactWeight: 5,
          affectedElements: page.redirectChain,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class SchemaMarkupAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'tech-schema-markup';
  readonly category = IssueCategory.TECHNICAL;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.schemaMarkup.length === 0) {
      return [
        {
          ruleId: this.ruleId,
          title: 'No structured data found',
          description:
            'No JSON-LD, Microdata, or RDFa structured data found on the page.',
          severity: IssueSeverity.LOW,
          category: this.category,
          recommendation:
            'Add JSON-LD structured data to help search engines understand your content and enable rich results.',
          fixDifficulty: 4,
          impactWeight: 4,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class MetaRobotsAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'tech-meta-robots';
  readonly category = IssueCategory.TECHNICAL;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.metaRobots && page.metaRobots.toLowerCase().includes('noindex')) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Page is set to noindex',
          description:
            'The page has a meta robots noindex directive, preventing search engine indexing.',
          severity: IssueSeverity.INFO,
          category: this.category,
          recommendation:
            'If this page should be indexed, remove the noindex directive from the meta robots tag.',
          fixDifficulty: 1,
          impactWeight: 9,
        },
      ];
    }
    return [];
  }
}

export const TECHNICAL_ANALYZERS = [
  RobotsTxtAnalyzer,
  SitemapAnalyzer,
  CanonicalAnalyzer,
  HttpsAnalyzer,
  RedirectChainAnalyzer,
  SchemaMarkupAnalyzer,
  MetaRobotsAnalyzer,
];
