import { deriveReportCwvId, deriveReportId } from './ids';
import { seededRandom } from './helpers';
import { generateRuleResultsForAudit } from './rule-results.fixture';

export type Classification = 'excellent' | 'good' | 'fair' | 'poor';

export function classify(score: number): Classification {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

export type DemoReportSeed = {
  id: string;
  auditId: string;
  url: string;
  domain: string;
  finalScore: number;
  classification: Classification;
  totalIssues: number;
  criticalIssues: number;
  warnIssues: number;
  passCount: number;
  analysisSnapshot: Record<string, unknown>;
  cwvSnapshot: Record<string, unknown>;
  createdAt: Date;
};

export type DemoReportCwvSeed = {
  id: string;
  reportId: string;
  lcpMs: number;
  inpMs: number;
  cls: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  lighthouseSeoScore: number;
  desktopLcpMs: number | null;
  desktopInpMs: number | null;
  desktopCls: number | null;
  desktopPerformanceScore: number | null;
  desktopAccessibilityScore: number | null;
  desktopBestPracticesScore: number | null;
  desktopLighthouseSeoScore: number | null;
};

export type DemoReportKeywordSeed = {
  reportId: string;
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  rank: number;
  isTarget: boolean;
};

// ── CWV tier — derived from audit's seoScore ─────────────────────────────
type CwvTier = 'good' | 'needs-improvement' | 'poor';

function tierForScore(score: number): CwvTier {
  if (score >= 80) return 'good';
  if (score >= 60) return 'needs-improvement';
  return 'poor';
}

function buildCwv(reportId: string, seed: string, score: number): DemoReportCwvSeed {
  const rng = seededRandom(`${seed}-cwv`);
  const tier = tierForScore(score);

  let lcp: number, inp: number, cls: number, perf: number, a11y: number, bp: number, lhSeo: number;

  if (tier === 'good') {
    lcp = 1400 + Math.floor(rng() * 800);   // 1.4-2.2s
    inp = 80 + Math.floor(rng() * 80);      // 80-160ms
    cls = 0.02 + rng() * 0.05;
    perf = 88 + Math.floor(rng() * 10);
    a11y = 92 + Math.floor(rng() * 7);
    bp = 90 + Math.floor(rng() * 8);
    lhSeo = 94 + Math.floor(rng() * 5);
  } else if (tier === 'needs-improvement') {
    lcp = 2600 + Math.floor(rng() * 1200);  // 2.6-3.8s
    inp = 200 + Math.floor(rng() * 200);    // 200-400ms
    cls = 0.12 + rng() * 0.12;
    perf = 65 + Math.floor(rng() * 18);
    a11y = 78 + Math.floor(rng() * 12);
    bp = 75 + Math.floor(rng() * 14);
    lhSeo = 82 + Math.floor(rng() * 10);
  } else {
    lcp = 4200 + Math.floor(rng() * 1800);  // 4.2-6.0s
    inp = 450 + Math.floor(rng() * 300);    // 450-750ms
    cls = 0.28 + rng() * 0.15;
    perf = 30 + Math.floor(rng() * 25);
    a11y = 55 + Math.floor(rng() * 18);
    bp = 50 + Math.floor(rng() * 22);
    lhSeo = 60 + Math.floor(rng() * 18);
  }

  // Desktop is consistently better than mobile (typical CWV pattern)
  const desktopLcp = Math.max(700, Math.round(lcp * 0.55));
  const desktopInp = Math.max(40, Math.round(inp * 0.6));
  const desktopCls = Math.max(0.01, +(cls * 0.7).toFixed(4));
  const desktopPerf = Math.min(99, perf + 8);
  const desktopA11y = Math.min(99, a11y + 3);
  const desktopBp = Math.min(99, bp + 4);
  const desktopLhSeo = Math.min(99, lhSeo + 2);

  return {
    id: deriveReportCwvId(reportId),
    reportId,
    lcpMs: lcp,
    inpMs: inp,
    cls: +cls.toFixed(4),
    performanceScore: perf,
    accessibilityScore: a11y,
    bestPracticesScore: bp,
    lighthouseSeoScore: lhSeo,
    desktopLcpMs: desktopLcp,
    desktopInpMs: desktopInp,
    desktopCls: desktopCls,
    desktopPerformanceScore: desktopPerf,
    desktopAccessibilityScore: desktopA11y,
    desktopBestPracticesScore: desktopBp,
    desktopLighthouseSeoScore: desktopLhSeo,
  };
}

// ── Keywords per report (6-8 rows incl. 1 target) ────────────────────────
const KEYWORD_POOL = [
  'seo', 'tối ưu', 'website', 'tốc độ', 'mobile',
  'content', 'backlink', 'từ khoá', 'thứ hạng',
  'ranking', 'on-page', 'technical seo', 'meta',
  'cấu trúc', 'sitemap', 'crawl',
];

function buildKeywords(reportId: string, seed: string, targetKeyword: string | null): DemoReportKeywordSeed[] {
  const rng = seededRandom(`${seed}-kw`);
  const picked = new Set<string>();
  const result: DemoReportKeywordSeed[] = [];

  if (targetKeyword) {
    result.push({
      reportId,
      keyword: targetKeyword,
      frequency: 12 + Math.floor(rng() * 18),
      densityPercent: +(1.5 + rng() * 2.5).toFixed(2),
      inTitle: rng() > 0.2,
      inH1: rng() > 0.25,
      inFirstParagraph: rng() > 0.35,
      inMetaDescription: rng() > 0.4,
      rank: 1,
      isTarget: true,
    });
    picked.add(targetKeyword.toLowerCase());
  }

  const tailCount = 6 + Math.floor(rng() * 3);
  let rank = 2;
  for (const word of KEYWORD_POOL) {
    if (result.length >= (targetKeyword ? tailCount + 1 : tailCount)) break;
    if (picked.has(word.toLowerCase())) continue;
    result.push({
      reportId,
      keyword: word,
      frequency: 3 + Math.floor(rng() * 14),
      densityPercent: +(0.3 + rng() * 1.6).toFixed(2),
      inTitle: rng() > 0.6,
      inH1: rng() > 0.7,
      inFirstParagraph: rng() > 0.5,
      inMetaDescription: rng() > 0.65,
      rank: rank++,
      isTarget: false,
    });
    picked.add(word.toLowerCase());
  }

  return result;
}

// ── Public generators ────────────────────────────────────────────────────
export function buildReportForAudit(
  auditId: string,
  url: string,
  domain: string,
  seoScore: number,
  createdAt: Date,
): { report: DemoReportSeed; cwv: DemoReportCwvSeed } {
  const reportId = deriveReportId(auditId);
  const rules = generateRuleResultsForAudit(auditId, seoScore);
  const failCount = rules.filter((r) => r.status === 'fail').length;
  const warnCount = rules.filter((r) => r.status === 'warn').length;
  const passCount = rules.filter((r) => r.status === 'pass').length;
  const criticalCount = rules.filter((r) => r.status === 'fail' && r.weight >= 7).length;

  const cwv = buildCwv(reportId, auditId, seoScore);

  const report: DemoReportSeed = {
    id: reportId,
    auditId,
    url,
    domain,
    finalScore: seoScore,
    classification: classify(seoScore),
    totalIssues: failCount + warnCount,
    criticalIssues: criticalCount,
    warnIssues: warnCount,
    passCount,
    analysisSnapshot: {
      overallScore: seoScore,
      categoryScores: aggregateByCategory(rules),
      ruleCount: rules.length,
    },
    cwvSnapshot: {
      mobile: {
        lcpMs: cwv.lcpMs,
        inpMs: cwv.inpMs,
        cls: cwv.cls,
        performanceScore: cwv.performanceScore,
      },
      desktop: {
        lcpMs: cwv.desktopLcpMs,
        inpMs: cwv.desktopInpMs,
        cls: cwv.desktopCls,
        performanceScore: cwv.desktopPerformanceScore,
      },
    },
    createdAt,
  };

  return { report, cwv };
}

export function buildKeywordsForReport(
  auditId: string,
  targetKeyword: string | null,
): DemoReportKeywordSeed[] {
  return buildKeywords(deriveReportId(auditId), auditId, targetKeyword);
}

function aggregateByCategory(rules: ReturnType<typeof generateRuleResultsForAudit>): Record<string, number> {
  const buckets: Record<string, { totalWeight: number; weighted: number }> = {};
  for (const r of rules) {
    if (!buckets[r.category]) buckets[r.category] = { totalWeight: 0, weighted: 0 };
    buckets[r.category].totalWeight += r.weight;
    buckets[r.category].weighted += r.weight * r.score;
  }
  const out: Record<string, number> = {};
  for (const [cat, { totalWeight, weighted }] of Object.entries(buckets)) {
    out[cat] = Math.round(weighted / Math.max(1, totalWeight));
  }
  return out;
}
