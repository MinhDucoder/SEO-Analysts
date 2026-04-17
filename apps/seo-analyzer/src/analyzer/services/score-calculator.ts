/**
 * @file Weighted-average scoring on top of rule results.
 * Overall score = Σ(ruleScore × ruleWeight) / Σ(ruleWeight).
 * Classification thresholds: ≥80 excellent, ≥60 good, ≥40 fair, else poor.
 */
import { Injectable } from '@nestjs/common';
import { CheckStatus, Classification, IssueCategory } from '@repo/shared';
import type { RunnerResult } from './rule-runner';

export interface CategoryScore {
  category: IssueCategory;
  score: number;
  totalRules: number;
  passed: number;
  warned: number;
  failed: number;
}

@Injectable()
export class ScoreCalculator {
  overall(results: RunnerResult[]): number {
    if (results.length === 0) return 0;
    let totalWeighted = 0;
    let totalWeight = 0;
    for (const r of results) {
      totalWeighted += r.score * r.weight;
      totalWeight += r.weight;
    }
    if (totalWeight === 0) return 0;
    return Math.round((totalWeighted / totalWeight) * 100) / 100;
  }

  classify(score: number): Classification {
    if (score >= 80) return Classification.EXCELLENT;
    if (score >= 60) return Classification.GOOD;
    if (score >= 40) return Classification.FAIR;
    return Classification.POOR;
  }

  perCategory(results: RunnerResult[]): CategoryScore[] {
    const buckets = new Map<IssueCategory, RunnerResult[]>();
    for (const r of results) {
      if (!buckets.has(r.category)) buckets.set(r.category, []);
      buckets.get(r.category)!.push(r);
    }
    const out: CategoryScore[] = [];
    for (const [category, items] of buckets) {
      let weighted = 0;
      let weight = 0;
      let passed = 0;
      let warned = 0;
      let failed = 0;
      for (const it of items) {
        weighted += it.score * it.weight;
        weight += it.weight;
        if (it.status === CheckStatus.PASS) passed++;
        else if (it.status === CheckStatus.WARN) warned++;
        else if (it.status === CheckStatus.FAIL) failed++;
      }
      out.push({
        category,
        score: weight > 0 ? Math.round((weighted / weight) * 100) / 100 : 0,
        totalRules: items.length,
        passed,
        warned,
        failed,
      });
    }
    return out;
  }
}
