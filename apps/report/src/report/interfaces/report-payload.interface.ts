import { CoreWebVitals } from '@repo/shared';
import { AnalyzeResult } from './analyze-result.interface';
import { KeywordResult } from './keyword-result.interface';

export interface ReportInputs {
  auditId: string;
  url: string;
  domain: string;
  analyze: AnalyzeResult;
  keywords: KeywordResult;
  cwv: CoreWebVitals;
}

export interface AggregatedReport {
  url: string;
  domain: string;
  finalScore: number;
  classification: string; // Classification enum value
  totalIssues: number;
  criticalIssues: number;
  warnIssues: number;
  passCount: number;
  analysisSnapshot: AnalyzeResult;
  cwvSnapshot: CoreWebVitals;
}
