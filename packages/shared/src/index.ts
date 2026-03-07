// Shared types between frontend and backend

export enum AuditStatus {
  PENDING = 'pending',
  CRAWLING = 'crawling',
  ANALYZING = 'analyzing',
  SCORING = 'scoring',
  GENERATING_REPORT = 'generating_report',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

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
  fixDifficulty: number; // 1-10
  priority: number; // impact * (10 - fixDifficulty)
  affectedElements?: string[];
}

export interface CategoryScore {
  category: IssueCategory;
  score: number; // 0-100
  weight: number;
  issueCount: number;
}

export interface AuditResult {
  overallScore: number;
  categoryScores: CategoryScore[];
  issues: SeoIssue[];
  url: string;
  auditedAt: string;
  crawlDurationMs: number;
}

export interface AuditProgressEvent {
  jobId: string;
  status: AuditStatus;
  progress: number; // 0-100
  message?: string;
}

export interface PageData {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  htmlSize: number;
  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  canonicalUrl: string | null;
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  h4Tags: string[];
  h5Tags: string[];
  h6Tags: string[];
  images: Array<{ src: string; alt: string | null }>;
  internalLinks: string[];
  externalLinks: string[];
  schemaMarkup: object[];
  openGraphTags: Record<string, string>;
  responseHeaders: Record<string, string>;
  redirectChain: string[];
  hasRobotsTxt: boolean;
  robotsTxtContent: string | null;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  isHttps: boolean;
  contentEncoding: string | null;
  cacheControl: string | null;
}
