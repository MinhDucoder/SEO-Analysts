import { Injectable } from '@nestjs/common';
import { CrawlResult } from '../../../crawler/crawler.service';
import {
  IssueCategory,
  IssueSeverity,
  SeoAnalyzer,
  SeoIssue,
} from '../../analyzer.interface';

@Injectable()
export class SlowResponseAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'perf-slow-response';
  readonly category = IssueCategory.PERFORMANCE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.responseTimeMs > 600) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Slow server response time',
          description: `Server response time (TTFB) is ${page.responseTimeMs}ms. Should be under 600ms.`,
          severity: IssueSeverity.HIGH,
          category: this.category,
          recommendation:
            'Optimize server performance: use caching, CDN, database query optimization, or upgrade hosting.',
          fixDifficulty: 6,
          impactWeight: 8,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class LargePageSizeAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'perf-page-size';
  readonly category = IssueCategory.PERFORMANCE;

  analyze(page: CrawlResult): SeoIssue[] {
    const threeMB = 3 * 1024 * 1024;
    if (page.htmlSize > threeMB) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Page size too large',
          description: `Page HTML size is ${(page.htmlSize / 1024 / 1024).toFixed(1)}MB. Should be under 3MB.`,
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Reduce page size by removing unnecessary HTML, inlining less CSS/JS, and lazy loading content.',
          fixDifficulty: 5,
          impactWeight: 6,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class ExternalRequestsAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'perf-external-requests';
  readonly category = IssueCategory.PERFORMANCE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.externalLinks.length > 50) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Too many external requests',
          description: `Page references ${page.externalLinks.length} external resources. Should be under 50.`,
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Reduce external dependencies: consolidate scripts, defer non-essential resources, use a CDN.',
          fixDifficulty: 5,
          impactWeight: 5,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class MissingCompressionAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'perf-compression';
  readonly category = IssueCategory.PERFORMANCE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (
      !page.contentEncoding ||
      (!page.contentEncoding.includes('gzip') &&
        !page.contentEncoding.includes('br'))
    ) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Response not compressed',
          description:
            'The server response does not use gzip or Brotli compression.',
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Enable gzip or Brotli compression on your web server to reduce transfer size.',
          fixDifficulty: 3,
          impactWeight: 6,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class MissingCacheHeadersAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'perf-cache-headers';
  readonly category = IssueCategory.PERFORMANCE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.cacheControl && !page.responseHeaders['expires']) {
      return [
        {
          ruleId: this.ruleId,
          title: 'No caching headers found',
          description: 'The response has no Cache-Control or Expires header.',
          severity: IssueSeverity.LOW,
          category: this.category,
          recommendation:
            'Add Cache-Control headers to enable browser caching for static resources.',
          fixDifficulty: 2,
          impactWeight: 4,
        },
      ];
    }
    return [];
  }
}

export const PERFORMANCE_ANALYZERS = [
  SlowResponseAnalyzer,
  LargePageSizeAnalyzer,
  ExternalRequestsAnalyzer,
  MissingCompressionAnalyzer,
  MissingCacheHeadersAnalyzer,
];
