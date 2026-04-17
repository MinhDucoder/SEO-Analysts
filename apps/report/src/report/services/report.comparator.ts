/**
 * @file Diff two reports of the same URL — used by the Gateway's
 * "compare audits" endpoint. Reports issuesFixed/issuesNew so the UI
 * can highlight regressions and wins between two crawls.
 */
import { Injectable } from '@nestjs/common';
import { CheckStatus } from '@repo/shared';
import { AnalyzeRuleResult } from '../domain/analyze-result.interface';

export interface RuleDeltaItem {
  ruleId: string;
  ruleName: string;
  statusBefore: CheckStatus | null;
  statusAfter: CheckStatus | null;
  scoreDelta: number;
}

export interface CompareResult {
  scoreDelta: number;
  ruleDeltas: RuleDeltaItem[];
  issuesFixed: string[];
  issuesNew: string[];
}

interface ReportLike {
  finalScore: number | { toNumber(): number };
  analysisSnapshot: { ruleResults: AnalyzeRuleResult[] };
}

@Injectable()
export class ReportComparator {
  compare(before: ReportLike, after: ReportLike): CompareResult {
    const beforeMap = new Map(before.analysisSnapshot.ruleResults.map((r) => [r.ruleId, r]));
    const afterMap = new Map(after.analysisSnapshot.ruleResults.map((r) => [r.ruleId, r]));

    const allIds = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);

    const ruleDeltas: RuleDeltaItem[] = [];
    const issuesFixed: string[] = [];
    const issuesNew: string[] = [];

    for (const id of allIds) {
      const b = beforeMap.get(id);
      const a = afterMap.get(id);
      const beforeStatus = b ? b.status : null;
      const afterStatus = a ? a.status : null;
      const beforeScore = b ? b.score : 0;
      const afterScore = a ? a.score : 0;

      ruleDeltas.push({
        ruleId: id,
        ruleName: (a ?? b)!.ruleName,
        statusBefore: beforeStatus,
        statusAfter: afterStatus,
        scoreDelta: afterScore - beforeScore,
      });

      if (beforeStatus === CheckStatus.FAIL && afterStatus === CheckStatus.PASS) {
        issuesFixed.push(id);
      }
      if (beforeStatus === CheckStatus.PASS && afterStatus === CheckStatus.FAIL) {
        issuesNew.push(id);
      }
    }

    const beforeFinal = typeof before.finalScore === 'number' ? before.finalScore : before.finalScore.toNumber();
    const afterFinal = typeof after.finalScore === 'number' ? after.finalScore : after.finalScore.toNumber();

    return {
      scoreDelta: Number((afterFinal - beforeFinal).toFixed(2)),
      ruleDeltas,
      issuesFixed,
      issuesNew,
    };
  }
}
