/**
 * @file Mirrors of backend DTOs. Source of truth is
 * `apps/gateway/src/public-api/services/public-check.service.ts` and
 * `apps/gateway/src/public-api/dto/api-key.dto.ts`. Keep these aligned
 * on backend change.
 */

export type EnrichMode = 'off' | 'template' | 'llm';
export type Language = 'vi' | 'en';
export type IssueSeverity = 'info' | 'warning' | 'error';
export type IssueAudience = 'writer' | 'dev';
export type SuggestionSource = 'llm' | 'template' | 'mixed' | 'none';
export type ApiKeyEnvironment = 'live' | 'test';

export interface PublicCheckInput {
  type: 'url' | 'markdown' | 'html';
  url?: string;
  markdown?: string;
  html?: string;
}

export interface PublicCheckFilter {
  categories?: string[];
  audiences?: IssueAudience[];
  minSeverity?: IssueSeverity;
}

export interface PublicCheckOptions {
  enrichMode?: EnrichMode;
  language?: Language;
  includeSummary?: boolean;
  filter?: PublicCheckFilter;
}

export interface PublicCheckRequest {
  input: PublicCheckInput;
  targetKeyword: string;
  secondaryKeywords?: string[];
  options?: PublicCheckOptions;
}

export interface Suggestion {
  type: 'rewrite' | 'add' | 'remove' | 'reorder';
  text: string;
  rationale: string;
}

export interface PublicCheckIssue {
  ruleId: string;
  severity: IssueSeverity;
  category: string;
  audience: IssueAudience[];
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggestion: Suggestion | null;
  docRef?: string;
}

export interface PublicCheckMeta {
  inputType: 'url' | 'markdown' | 'html';
  resolvedUrl?: string;
  contentStats: { words: number; characters: number; readingTimeSec: number };
  processingTimeMs: number;
  ruleVersion: string;
  enrichMode: EnrichMode;
  suggestionSource: SuggestionSource;
  degraded: boolean;
  cached: boolean;
  requestId: string;
  usage: {
    remaining: { minute: number; day: number };
    resetAt: { minute: string; day: string };
  };
}

export interface PublicCheckResponse {
  score: number;
  scoreBreakdown: Record<string, number>;
  issues: PublicCheckIssue[];
  summary?: { writer: string; dev: string };
  meta: PublicCheckMeta;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  environment: ApiKeyEnvironment;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
  revokedAt: string | Date | null;
}

export interface CreateApiKeyInput {
  name: string;
  environment: ApiKeyEnvironment;
}

export interface CreateApiKeyResponse extends ApiKeyDto {
  plaintext: string;
}
