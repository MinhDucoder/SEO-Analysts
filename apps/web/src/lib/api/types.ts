/**
 * Client-side API type surface. Re-exports enums/interfaces from @repo/shared
 * and declares client-only shapes (AuthenticatedUser, AuditListItem) that the
 * gateway returns but are not yet in the shared package. Slug 2 (auth-flow)
 * and slug 4 (audits-list) may move these into @repo/shared once stable.
 */

export {
  AuditStatus,
  CheckStatus,
  IssueCategory,
  UserRole,
  Classification,
  FormFactor,
  AuditMode,
  AlertType,
  JWT_CONFIG,
  RATE_LIMIT,
  classify,
} from "@repo/shared";

export type {
  AuditProgressEvent,
  CoreWebVitals,
  ImageInfo,
  LinkInfo,
} from "@repo/shared";

/**
 * Authenticated user shape returned by gateway `POST /auth/login`,
 * `POST /auth/register`, `GET /auth/me`. Mirrors
 * apps/gateway/src/auth/interfaces/authenticated-user.interface.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Session envelope used on login/register/refresh responses.
 */
export interface AuthSession {
  user: AuthenticatedUser;
  accessToken: string;
}

/**
 * Generic paginated response shape.
 */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Minimal error envelope used when `ky` interceptor parses non-2xx responses.
 */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/**
 * Audit list item returned by `GET /audits`. Gateway field name is
 * `seoScore` (not `score`) — verified against
 * apps/gateway/src/audits/controllers/audits.controller.ts:48.
 *
 * Dates arrive as ISO strings (JSON). Consumers use `formatRelativeDate`
 * or dayjs() to render. Nullable fields reflect partial-audit states:
 * - `seoScore` null while status is pre-REPORTING.
 * - `completedAt` null while status !== COMPLETED/FAILED.
 */
export interface AuditListItem {
  id: string;
  url: string;
  domain: string;
  status: import("@repo/shared").AuditStatus;
  seoScore: number | null;
  targetKeyword: string | null;
  crawlerType: string | null;
  crawlDurationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Detail-shape from `GET /audits/:id` — Summary plus errorMessage which
 * is only populated when status === 'failed'.
 */
export interface AuditDetail extends AuditListItem {
  errorMessage: string | null;
}

/**
 * Proto-style enums forwarded verbatim by the gateway from the report
 * service. UI maps them to short tokens — see lib/audits/proto-map.ts.
 */
export type ProtoCheckStatus =
  | "CHECK_STATUS_PASS"
  | "CHECK_STATUS_WARN"
  | "CHECK_STATUS_FAIL"
  | "CHECK_STATUS_UNSPECIFIED";

export type ProtoIssueCategory =
  | "ISSUE_CATEGORY_META"
  | "ISSUE_CATEGORY_HEADINGS"
  | "ISSUE_CATEGORY_IMAGES"
  | "ISSUE_CATEGORY_LINKS"
  | "ISSUE_CATEGORY_PERFORMANCE"
  | "ISSUE_CATEGORY_TECHNICAL"
  | "ISSUE_CATEGORY_UNSPECIFIED";

export interface ReportRuleResult {
  ruleId: string;
  ruleName: string;
  status: ProtoCheckStatus;
  score: number;
  weight: number;
  category: ProtoIssueCategory;
  message: string;
  suggestion?: string;
  metadata: Record<string, string>;
}

export interface ReportCategoryScore {
  category: ProtoIssueCategory;
  score: number;
  totalRules: number;
  passed: number;
  warned: number;
  failed: number;
}

export interface ReportKeyword {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  rank: number;
}

export interface ReportCwvMetrics {
  lcpMs: number;
  inpMs: number;
  cls: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
}

export interface ReportTargetKeyword {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  isStuffing: boolean;
  verdict: string;
}

export interface ReportDetail {
  reportId: string;
  auditId: string;
  url: string;
  domain: string;
  finalScore: number;
  classification: "excellent" | "good" | "fair" | "poor";
  ruleResults: ReportRuleResult[];
  categoryScores: ReportCategoryScore[];
  keywords: ReportKeyword[];
  cwvMetrics: ReportCwvMetrics;
  targetKeyword?: ReportTargetKeyword;
  createdAt: string;
}

export interface AuditDetailResponse {
  audit: AuditDetail;
  report: ReportDetail | null;
}

export interface AuditStatusResponse {
  auditId: string;
  status: import("@repo/shared").AuditStatus;
  progress: number;
  stage: string;
  seoScore?: number | null;
}

export interface ShareLinkResponse {
  shareToken: string;
  shareUrl: string;
}
