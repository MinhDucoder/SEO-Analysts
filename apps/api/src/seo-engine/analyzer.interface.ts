import { CrawlResult } from '../crawler/crawler.service';

export enum IssueSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum IssueCategory {
  TECHNICAL = 'technical',
  ON_PAGE = 'on_page',
  PERFORMANCE = 'performance',
  CONTENT = 'content',
}

export interface SeoIssue {
  ruleId: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  category: IssueCategory;
  recommendation: string;
  fixDifficulty: number;
  impactWeight: number;
  affectedElements?: string[];
}

export const SEO_ANALYZER = 'SEO_ANALYZER';

export interface SeoAnalyzer {
  readonly ruleId: string;
  readonly category: IssueCategory;
  analyze(pageData: CrawlResult): SeoIssue[];
}
