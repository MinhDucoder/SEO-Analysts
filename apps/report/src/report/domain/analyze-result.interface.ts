/**
 * @file Report-local view of the analyzer service's output payload —
 * duplicated here so the Report service is not coupled to analyzer internals.
 */
import { CheckStatus, IssueCategory } from '@repo/shared';

export interface AnalyzeRuleResult {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  status: CheckStatus;
  score: number;
  weight: number;
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}

export interface AnalyzeCategoryScore {
  category: IssueCategory;
  score: number;
  passCount: number;
  warnCount: number;
  failCount: number;
}

export interface AnalyzeResult {
  auditId: string;
  url: string;
  domain: string;
  overallScore: number;
  ruleResults: AnalyzeRuleResult[];
  categoryScores: AnalyzeCategoryScore[];
}
