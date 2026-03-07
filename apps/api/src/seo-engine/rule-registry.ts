import { Inject, Injectable } from '@nestjs/common';
import { CrawlResult } from '../crawler/crawler.service';
import {
  IssueCategory,
  SEO_ANALYZER,
  SeoAnalyzer,
  SeoIssue,
} from './analyzer.interface';

export interface PrioritizedIssue extends SeoIssue {
  priority: number;
}

export interface CategoryScore {
  category: IssueCategory;
  score: number;
  weight: number;
  issueCount: number;
}

@Injectable()
export class RuleRegistry {
  constructor(
    @Inject(SEO_ANALYZER)
    private readonly analyzers: SeoAnalyzer[],
  ) {}

  analyzeAll(pageData: CrawlResult): PrioritizedIssue[] {
    const issues: PrioritizedIssue[] = [];

    for (const analyzer of this.analyzers) {
      const result = analyzer.analyze(pageData);
      for (const issue of result) {
        issues.push({
          ...issue,
          priority: issue.impactWeight * (10 - issue.fixDifficulty),
        });
      }
    }

    return issues.sort((a, b) => b.priority - a.priority);
  }

  calculateScores(issues: PrioritizedIssue[]): {
    overallScore: number;
    categoryScores: CategoryScore[];
  } {
    const weights: Record<IssueCategory, number> = {
      [IssueCategory.TECHNICAL]: 0.3,
      [IssueCategory.ON_PAGE]: 0.35,
      [IssueCategory.PERFORMANCE]: 0.2,
      [IssueCategory.CONTENT]: 0.15,
    };

    const maxRulesPerCategory: Record<IssueCategory, number> = {
      [IssueCategory.TECHNICAL]: 7,
      [IssueCategory.ON_PAGE]: 8,
      [IssueCategory.PERFORMANCE]: 5,
      [IssueCategory.CONTENT]: 0,
    };

    const categoryScores: CategoryScore[] = Object.entries(weights).map(
      ([cat, weight]) => {
        const category = cat as IssueCategory;
        const categoryIssues = issues.filter((i) => i.category === category);
        const maxRules = maxRulesPerCategory[category] || 1;
        const passedRules = Math.max(0, maxRules - categoryIssues.length);
        const score =
          maxRules > 0 ? Math.round((passedRules / maxRules) * 100) : 100;

        return {
          category,
          score,
          weight,
          issueCount: categoryIssues.length,
        };
      },
    );

    const overallScore = Math.round(
      categoryScores.reduce((sum, cs) => sum + cs.score * cs.weight, 0),
    );

    return { overallScore, categoryScores };
  }

  getAnalyzersByCategory(category: IssueCategory): SeoAnalyzer[] {
    return this.analyzers.filter((a) => a.category === category);
  }
}
