import { Injectable } from '@nestjs/common';
import { CheckStatus, classify } from '@repo/shared';
import { AggregatedReport, ReportInputs } from '../domain/report-payload.interface';

const CRITICAL_WEIGHT_THRESHOLD = 7;
const ANALYZER_WEIGHT = 0.7;
const CWV_WEIGHT = 0.3;

@Injectable()
export class ReportAggregator {
  aggregate(inputs: ReportInputs): AggregatedReport {
    const { analyze, cwv } = inputs;

    const blended =
      analyze.overallScore * ANALYZER_WEIGHT + cwv.performanceScore * CWV_WEIGHT;
    const finalScore = Math.round(blended);

    let passCount = 0;
    let warnIssues = 0;
    let failCount = 0;
    let criticalIssues = 0;

    for (const r of analyze.ruleResults) {
      if (r.status === CheckStatus.PASS) {
        passCount += 1;
      } else if (r.status === CheckStatus.WARN) {
        warnIssues += 1;
      } else if (r.status === CheckStatus.FAIL) {
        failCount += 1;
        if (r.weight >= CRITICAL_WEIGHT_THRESHOLD) {
          criticalIssues += 1;
        }
      }
    }

    const totalIssues = warnIssues + failCount;

    return {
      url: inputs.url,
      domain: inputs.domain,
      finalScore,
      classification: classify(finalScore),
      totalIssues,
      criticalIssues,
      warnIssues,
      passCount,
      analysisSnapshot: analyze,
      cwvSnapshot: cwv,
    };
  }
}
