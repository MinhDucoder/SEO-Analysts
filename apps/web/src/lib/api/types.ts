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

export interface ReportAiSuggestion {
  ruleId: string;
  explanation: string;
  actionableFix: string;
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
  cwvMetrics: ReportCwvMetrics | null;
  targetKeyword?: ReportTargetKeyword | null;
  createdAt: string;
  // Per-rule AI suggestions (optional — populated async after audit done).
  // undefined/empty = not yet generated or feature disabled.
  aiSuggestions?: ReportAiSuggestion[];
  aiSuggestionsGeneratedAt?: string | null;
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

export interface CompareRuleDelta {
  ruleId: string;
  ruleName: string;
  statusBefore: ProtoCheckStatus | "UNSPECIFIED";
  statusAfter: ProtoCheckStatus | "UNSPECIFIED";
  scoreDelta: number;
}

export interface CompareResult {
  scoreDelta: number;
  ruleDeltas: CompareRuleDelta[];
  issuesFixed: string[];
  issuesNew: string[];
}

/**
 * Pagination meta envelope used by admin endpoints. Distinct from
 * `Paginated<T>` (which uses `data + total + page + limit`); admin endpoints
 * also surface `totalPages` precomputed.
 */
export interface AdminPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminPaginated<T> {
  data: T[];
  meta: AdminPaginationMeta;
}

/**
 * `GET /admin/users` row shape — extends UserPublic with `auditCount`.
 */
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  isVerified: boolean;
  isLocked: boolean;
  oauthProvider: string | null;
  avatarUrl: string | null;
  createdAt: string;
  auditCount: number;
}

/**
 * `GET /admin/stats?period=30d` aggregate shape.
 */
export interface AdminStats {
  overview: {
    totalUsers: number;
    totalAudits: number;
    successRate: number;
    avgCrawlTimeMs: number;
    avgSeoScore: number;
  };
  newUsersToday: number;
  auditsToday: number;
  topDomains: Array<{ domain: string; count: number }>;
}

/**
 * `GET /admin/rules` row + `PUT /admin/rules` patch shape.
 */
export interface SeoRule {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: ProtoIssueCategory;
  weight: number;
  isEnabled: boolean;
}

export interface UpdateRulesDto {
  rules: Array<{ name: string; weight?: number; isEnabled?: boolean }>;
}

export interface ListAdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: "user" | "admin";
  isLocked?: "true" | "false";
}
