// ─── Enums (mirror proto enums for use in TypeScript code) ───

export enum AuditStatus {
  PENDING = 'pending',
  CRAWLING = 'crawling',
  ANALYZING = 'analyzing',
  REPORTING = 'reporting',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CheckStatus {
  PASS = 'pass',
  WARN = 'warn',
  FAIL = 'fail',
}

export enum IssueCategory {
  META = 'meta',
  HEADINGS = 'headings',
  IMAGES = 'images',
  LINKS = 'links',
  PERFORMANCE = 'performance',
  TECHNICAL = 'technical',
  CONTENT = 'content',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum Classification {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum FormFactor {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
}

export enum AuditMode {
  SINGLE = 'single',
  SITE = 'site',
}

export enum AlertType {
  SCORE_DROP = 'score_drop',
  NEW_ISSUES = 'new_issues',
  SITE_DOWN = 'site_down',
}

// ─── Shared Interfaces ───

export interface CoreWebVitals {
  lcpMs: number;
  inpMs: number;
  cls: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
}

export interface ImageInfo {
  src: string;
  alt: string | null;
  sizeBytes: number;
  format: string;
}

export interface LinkInfo {
  href: string;
  anchorText: string;
  isInternal: boolean;
  rel: string | null;
  statusCode: number;
}

export interface RuleCheckOutput {
  status: CheckStatus;
  score: number;
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditProgressEvent {
  auditId: string;
  status: AuditStatus;
  progress: number;
  stage: string;
  message?: string;
}

// F4 — Broken link audit result (one entry per <a href> checked)
export type LinkCheckReason =
  | 'HTTP_4XX'
  | 'HTTP_5XX'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'TOO_MANY_REDIRECTS';

export interface LinkCheckResult {
  href: string;
  status: number;
  redirectChain: string[];
  isBroken: boolean;
  reason?: LinkCheckReason;
}

// ─── Constants ───

export const RATE_LIMIT = {
  AUDIT_PER_HOUR: 10,
  API_PER_MINUTE: 60,
  REGISTER_PER_HOUR: 5,
  LOGIN_ATTEMPTS_PER_15MIN: 10,
} as const;

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES_DAYS: 7,
} as const;

export const CACHE_TTL = {
  LIGHTHOUSE_SECONDS: 3600,
  CRAWL_SECONDS: 1800,
  AUDIT_RESULT_SECONDS: 3600,
} as const;

export const BULLMQ_QUEUES = {
  CRAWL_START: 'crawl.start',
  ANALYZE_START: 'analyze.start',
  KEYWORD_START: 'keyword.start',
  REPORT_START: 'report.start',
  AI_SUGGEST_START: 'ai-suggest.start',
  SITE_CRAWL_START: 'site-crawl.start',
  SITE_CRAWL_URL_AUDIT: 'site-crawl.url-audit',
  SITE_CRAWL_AGGREGATE: 'site-crawl.aggregate',
  SCHEDULED_AUDIT_TICK: 'scheduled-audit.tick',
  ALERT_SEND: 'alert.send',
} as const;

// F2 — Scheduled audit thresholds (consumed by the regression detector
// in the gateway). Anything worse than these triggers an AuditAlert.
export const SCHEDULED_AUDIT_LIMITS = {
  SCORE_DROP_THRESHOLD: 10,
  MIN_CRON_INTERVAL_MINUTES: 15,
} as const;

// Site-wide crawl limits — enforced by sitemap-discovery + site-crawl
// orchestrator. Values match sitemaps.org protocol (50k URLs, 50MB per
// sitemap file) plus a self-imposed cap to protect our own infra.
export const SITE_CRAWL_LIMITS = {
  MAX_URLS_PER_SITEMAP: 50_000,
  MAX_SITEMAP_BYTES: 50 * 1024 * 1024,
  MAX_SITEMAP_INDEX_DEPTH: 2,
  DEFAULT_MAX_URLS_PER_AUDIT: 500,
  HARD_CAP_MAX_URLS_PER_AUDIT: 5000,
} as const;

export const REDIS_KEYS = {
  lighthouseCache: (urlHash: string, formFactor: FormFactor | string = FormFactor.MOBILE) =>
    `lighthouse:${formFactor}:${urlHash}`,
  crawlCache: (urlHash: string) => `crawl:${urlHash}`,
  auditCompletedSteps: (auditId: string) => `audit:${auditId}:completed_steps`,
  auditAnalyzeResult: (auditId: string) => `audit:${auditId}:analyze_result`,
  auditKeywordResult: (auditId: string) => `audit:${auditId}:keyword_result`,
  auditCrawlResult:   (auditId: string) => `audit:${auditId}:crawl_result`,
  rateLimit: (userId: string) => `rate_limit:${userId}`,
} as const;

// ─── Utility Functions ───

export function classify(score: number): Classification {
  if (score >= 80) return Classification.EXCELLENT;
  if (score >= 60) return Classification.GOOD;
  if (score >= 40) return Classification.FAIR;
  return Classification.POOR;
}

// ─── Public API (gateway /api/v1/public/*) ───

export * from './public-api';
