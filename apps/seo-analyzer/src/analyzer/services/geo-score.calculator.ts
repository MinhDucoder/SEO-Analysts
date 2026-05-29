import { CheckStatus } from '@repo/shared';

export interface GeoRuleResultInput {
  ruleId: string;
  status: CheckStatus;
  score: number;
  weight: number;
  errored?: boolean;
}

export interface GeoScoreOutput {
  score: number | null;
  version: string | null;
}

export function calculateGeoScore(results: GeoRuleResultInput[]): GeoScoreOutput {
  if (results.length === 0) return { score: null, version: null };
  const totalWeight = results.reduce((a, r) => a + r.weight, 0);
  if (totalWeight === 0) return { score: null, version: null };
  const weighted = results.reduce((a, r) => a + r.weight * r.score, 0);
  const score = Math.round(weighted / totalWeight);
  const degraded = results.some((r) => r.errored);
  return { score, version: degraded ? '1.0-degraded' : '1.0' };
}
