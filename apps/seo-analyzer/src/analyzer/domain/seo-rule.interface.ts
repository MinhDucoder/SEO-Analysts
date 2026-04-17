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
