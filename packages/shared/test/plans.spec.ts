import { describe, it, expect } from 'vitest';
import {
  PLAN_FEATURES,
  PLAN_PRICES_VND,
  PLAN_DISPLAY_NAMES_VI,
  FeatureFlag,
  type QuotaDimension,
} from '../src/plans';

describe('PLAN_FEATURES', () => {
  const numericDims = [
    'audits_monthly',
    'site_audit_max_pages',
    'scheduled_audits_max',
    'api_keys_max',
    'api_calls_daily',
    'ai_calls_monthly',
    'geo_audits_monthly',
  ] as const;

  it('Free < Pro < Business for every numeric quota', () => {
    for (const dim of numericDims) {
      expect(PLAN_FEATURES.free[dim]).toBeLessThan(PLAN_FEATURES.pro[dim]);
      expect(PLAN_FEATURES.pro[dim]).toBeLessThan(PLAN_FEATURES.business[dim]);
    }
  });

  it('history_retention_days: Free=7, Pro=90, Business=-1 (unlimited)', () => {
    expect(PLAN_FEATURES.free.history_retention_days).toBe(7);
    expect(PLAN_FEATURES.pro.history_retention_days).toBe(90);
    expect(PLAN_FEATURES.business.history_retention_days).toBe(-1);
  });

  it('scheduled_audit_min_interval: Business (15) tighter than Pro (1440)', () => {
    expect(PLAN_FEATURES.business.scheduled_audit_min_interval_min).toBeLessThan(
      PLAN_FEATURES.pro.scheduled_audit_min_interval_min,
    );
  });

  it('Free has no features, Pro has 8 (incl GEO_AUDIT), Business has 9 (incl PRIORITY_QUEUE)', () => {
    expect(PLAN_FEATURES.free.features).toHaveLength(0);
    expect(PLAN_FEATURES.pro.features).toHaveLength(8);
    expect(PLAN_FEATURES.business.features).toContain(FeatureFlag.PRIORITY_QUEUE);
    expect(PLAN_FEATURES.pro.features).not.toContain(FeatureFlag.PRIORITY_QUEUE);
  });

  it('prices match spec', () => {
    expect(PLAN_PRICES_VND).toEqual({ free: 0, pro: 99_000, business: 299_000 });
  });

  it('Vietnamese display names', () => {
    expect(PLAN_DISPLAY_NAMES_VI).toEqual({
      free: 'Cá nhân',
      pro: 'Chuyên nghiệp',
      business: 'Doanh nghiệp',
    });
  });
});

describe('tools_fetches_daily', () => {
  it('free plan grants 10 daily tool fetches', () => {
    expect(PLAN_FEATURES.free.tools_fetches_daily).toBe(10);
  });

  it('pro plan grants unlimited (-1) daily tool fetches', () => {
    expect(PLAN_FEATURES.pro.tools_fetches_daily).toBe(-1);
  });

  it('business plan grants unlimited (-1) daily tool fetches', () => {
    expect(PLAN_FEATURES.business.tools_fetches_daily).toBe(-1);
  });

  it('tools_fetches_daily is a valid QuotaDimension', () => {
    const dimension: QuotaDimension = 'tools_fetches_daily';
    expect(dimension).toBe('tools_fetches_daily');
  });
});

describe('GEO_AUDIT feature flag', () => {
  it('is absent on free plan', () => {
    expect(PLAN_FEATURES.free.features).not.toContain(FeatureFlag.GEO_AUDIT);
  });

  it('is included on pro plan', () => {
    expect(PLAN_FEATURES.pro.features).toContain(FeatureFlag.GEO_AUDIT);
  });

  it('is included on business plan', () => {
    expect(PLAN_FEATURES.business.features).toContain(FeatureFlag.GEO_AUDIT);
  });
});

describe('geo_audits_monthly quota', () => {
  it('free plan grants 0', () => {
    expect(PLAN_FEATURES.free.geo_audits_monthly).toBe(0);
  });

  it('pro plan grants 50', () => {
    expect(PLAN_FEATURES.pro.geo_audits_monthly).toBe(50);
  });

  it('business plan grants 300', () => {
    expect(PLAN_FEATURES.business.geo_audits_monthly).toBe(300);
  });

  it('geo_audits_monthly is a valid QuotaDimension', () => {
    const dimension: QuotaDimension = 'geo_audits_monthly';
    expect(dimension).toBe('geo_audits_monthly');
  });
});
