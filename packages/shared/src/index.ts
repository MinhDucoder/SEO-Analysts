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
} as const;

export const REDIS_KEYS = {
  lighthouseCache: (urlHash: string) => `lighthouse:${urlHash}`,
  crawlCache: (urlHash: string) => `crawl:${urlHash}`,
  auditCompletedSteps: (auditId: string) => `audit:${auditId}:completed_steps`,
  auditAnalyzeResult: (auditId: string) => `audit:${auditId}:analyze_result`,
  auditKeywordResult: (auditId: string) => `audit:${auditId}:keyword_result`,
  rateLimit: (userId: string) => `rate_limit:${userId}`,
} as const;

// ─── Utility Functions ───

export function classify(score: number): Classification {
  if (score >= 80) return Classification.EXCELLENT;
  if (score >= 60) return Classification.GOOD;
  if (score >= 40) return Classification.FAIR;
  return Classification.POOR;
}
