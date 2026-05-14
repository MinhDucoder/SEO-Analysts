/**
 * Mirror of the gateway's `PublicCheckResponse` contract — kept in sync
 * by hand until `@repo/shared` exports it. The shape is documented in
 * `docs/public-api/output-schema.md` and produced by
 * `apps/gateway/src/public-api/services/public-check.service.ts`.
 *
 * IF the gateway ships a non-additive change to this contract, this
 * file MUST be updated and a v0.2 of the extension cut — the client
 * relies on these field names for rendering.
 */

import type { ApiKeyEnvironment, PublicApiLanguage } from './types';

export type IssueAudience = 'writer' | 'dev';
export type IssueSeverity = 'info' | 'warning' | 'error';
export type EnrichMode = 'off' | 'template' | 'llm';
export type SuggestionType = 'rewrite' | 'add' | 'remove' | 'reorder';

export interface PublicCheckInputUrl {
  type: 'url';
  url: string;
}
export interface PublicCheckInputHtml {
  type: 'html';
  html: string;
}
export interface PublicCheckInputMarkdown {
  type: 'markdown';
  markdown: string;
}
export type PublicCheckInput =
  | PublicCheckInputUrl
  | PublicCheckInputHtml
  | PublicCheckInputMarkdown;

export interface PublicCheckRequest {
  input: PublicCheckInput;
  targetKeyword: string;
  secondaryKeywords?: string[];
  options?: {
    enrichMode?: EnrichMode;
    language?: PublicApiLanguage;
    includeSummary?: boolean;
    filter?: {
      audiences?: IssueAudience[];
      categories?: string[];
      minSeverity?: IssueSeverity;
    };
  };
}

export interface PublicCheckSuggestion {
  type: SuggestionType;
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
  suggestion: PublicCheckSuggestion | null;
  docRef?: string;
}

export interface PublicCheckResponse {
  score: number;
  scoreBreakdown: Record<string, number>;
  issues: PublicCheckIssue[];
  summary?: { writer: string; dev: string };
  meta: {
    inputType: 'url' | 'markdown' | 'html';
    resolvedUrl?: string;
    contentStats: { words: number; characters: number; readingTimeSec: number };
    processingTimeMs: number;
    ruleVersion: string;
    enrichMode: EnrichMode;
    suggestionSource: 'llm' | 'template' | 'mixed' | 'none';
    degraded: boolean;
    cached: boolean;
    requestId: string;
    usage: {
      remaining: { minute: number; day: number };
      resetAt: { minute: string; day: string };
    };
  };
}

export interface PublicApiErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

export type { ApiKeyEnvironment, PublicApiLanguage };
