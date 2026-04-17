/**
 * @file Core contract every SEO rule must implement. The `RuleRunner`
 * invokes `check()` on each rule and persists the `RuleCheckOutput`.
 * Score convention: 0 = fail, 50 = warn, 100 = pass.
 */
import { CheckStatus, IssueCategory } from '@repo/shared';
import { PageData } from './page-data.interface';

export interface RuleCheckOutput {
  status: CheckStatus;
  score: number; // 0 | 50 | 100
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}

export interface ISeoRule {
  readonly id: string; // unique rule name, e.g. "title_tag"
  readonly category: IssueCategory;
  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput;
}
