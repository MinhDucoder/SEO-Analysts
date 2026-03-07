import { Injectable } from '@nestjs/common';
import { CrawlResult } from '../../../crawler/crawler.service';
import {
  IssueCategory,
  IssueSeverity,
  SeoAnalyzer,
  SeoIssue,
} from '../../analyzer.interface';

@Injectable()
export class TitlePresenceAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-title-presence';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.title || page.title.trim().length === 0) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Missing title tag',
          description: 'The page has no <title> tag or it is empty.',
          severity: IssueSeverity.CRITICAL,
          category: this.category,
          recommendation:
            'Add a unique, descriptive title tag between 30-60 characters.',
          fixDifficulty: 1,
          impactWeight: 10,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class TitleLengthAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-title-length';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.title) return [];
    const len = page.title.trim().length;
    if (len < 30 || len > 60) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Title tag length not optimal',
          description: `Title tag is ${len} characters. Optimal length is 30-60 characters.`,
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            len < 30
              ? 'Make your title longer and more descriptive (at least 30 characters).'
              : 'Shorten your title to 60 characters or fewer to prevent truncation in search results.',
          fixDifficulty: 1,
          impactWeight: 5,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class MetaDescriptionPresenceAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-meta-desc-presence';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.metaDescription || page.metaDescription.trim().length === 0) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Missing meta description',
          description: 'No meta description tag found or it is empty.',
          severity: IssueSeverity.HIGH,
          category: this.category,
          recommendation:
            'Add a compelling meta description between 120-160 characters to improve click-through rates.',
          fixDifficulty: 1,
          impactWeight: 8,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class MetaDescriptionLengthAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-meta-desc-length';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (!page.metaDescription) return [];
    const len = page.metaDescription.trim().length;
    if (len < 120 || len > 160) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Meta description length not optimal',
          description: `Meta description is ${len} characters. Optimal length is 120-160 characters.`,
          severity: IssueSeverity.LOW,
          category: this.category,
          recommendation:
            len < 120
              ? 'Expand your meta description to at least 120 characters for better search result snippets.'
              : 'Shorten your meta description to 160 characters to prevent truncation.',
          fixDifficulty: 1,
          impactWeight: 4,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class H1PresenceAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-h1-presence';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.h1Tags.length === 0) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Missing H1 heading',
          description: 'No H1 heading tag found on the page.',
          severity: IssueSeverity.HIGH,
          category: this.category,
          recommendation:
            'Add exactly one H1 heading that describes the main topic of the page.',
          fixDifficulty: 1,
          impactWeight: 8,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class H1UniquenessAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-h1-uniqueness';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.h1Tags.length > 1) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Multiple H1 headings found',
          description: `Found ${page.h1Tags.length} H1 headings. Only one H1 is recommended per page.`,
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Keep only one H1 heading per page. Use H2-H6 for subheadings.',
          fixDifficulty: 2,
          impactWeight: 5,
          affectedElements: page.h1Tags,
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class ImageAltAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-img-alt';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    const missingAlt = page.images.filter(
      (img) => img.alt === null || img.alt.trim() === '',
    );
    if (missingAlt.length > 0) {
      return [
        {
          ruleId: this.ruleId,
          title: 'Images missing alt text',
          description: `${missingAlt.length} image(s) are missing alt attributes.`,
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Add descriptive alt text to all images for accessibility and SEO.',
          fixDifficulty: 2,
          impactWeight: 5,
          affectedElements: missingAlt.map((img) => img.src),
        },
      ];
    }
    return [];
  }
}

@Injectable()
export class InternalLinksAnalyzer implements SeoAnalyzer {
  readonly ruleId = 'onpage-internal-links';
  readonly category = IssueCategory.ON_PAGE;

  analyze(page: CrawlResult): SeoIssue[] {
    if (page.internalLinks.length === 0) {
      return [
        {
          ruleId: this.ruleId,
          title: 'No internal links found',
          description:
            'The page contains no internal links to other pages on the same domain.',
          severity: IssueSeverity.MEDIUM,
          category: this.category,
          recommendation:
            'Add internal links to related content to improve site navigation and SEO.',
          fixDifficulty: 2,
          impactWeight: 6,
        },
      ];
    }
    return [];
  }
}

export const ON_PAGE_ANALYZERS = [
  TitlePresenceAnalyzer,
  TitleLengthAnalyzer,
  MetaDescriptionPresenceAnalyzer,
  MetaDescriptionLengthAnalyzer,
  H1PresenceAnalyzer,
  H1UniquenessAnalyzer,
  ImageAltAnalyzer,
  InternalLinksAnalyzer,
];
