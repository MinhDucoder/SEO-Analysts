export enum FeatureFlag {
  SITE_AUDIT = 'site_audit',
  SCHEDULED_AUDIT = 'scheduled_audit',
  API_KEY = 'api_key',
  AI_SUGGESTIONS = 'ai_suggestions',
  PDF_EXPORT = 'pdf_export',
  SHARE_LINK = 'share_link',
  EMAIL_ALERT = 'email_alert',
  PRIORITY_QUEUE = 'priority_queue',
}

export type PlanCode = 'free' | 'pro' | 'business';

export type QuotaDimension =
  | 'audits_monthly'
  | 'site_audit_max_pages'
  | 'scheduled_audits_max'
  | 'scheduled_audit_min_interval_min'
  | 'api_keys_max'
  | 'api_calls_daily'
  | 'ai_calls_monthly'
  | 'tools_fetches_daily'
  | 'history_retention_days';

export interface PlanDefinition {
  audits_monthly: number;
  site_audit_max_pages: number;
  scheduled_audits_max: number;
  scheduled_audit_min_interval_min: number;
  api_keys_max: number;
  api_calls_daily: number;
  ai_calls_monthly: number;
  tools_fetches_daily: number; // -1 = unlimited (soft cap 1000)
  history_retention_days: number; // -1 = unlimited
  features: FeatureFlag[];
}

const PRO_FEATURES = [
  FeatureFlag.SITE_AUDIT,
  FeatureFlag.SCHEDULED_AUDIT,
  FeatureFlag.API_KEY,
  FeatureFlag.AI_SUGGESTIONS,
  FeatureFlag.PDF_EXPORT,
  FeatureFlag.SHARE_LINK,
  FeatureFlag.EMAIL_ALERT,
];

export const PLAN_FEATURES: Record<PlanCode, PlanDefinition> = {
  free: {
    audits_monthly: 10,
    site_audit_max_pages: 0,
    scheduled_audits_max: 0,
    scheduled_audit_min_interval_min: 1440,
    api_keys_max: 0,
    api_calls_daily: 0,
    ai_calls_monthly: 0,
    tools_fetches_daily: 10,
    history_retention_days: 7,
    features: [],
  },
  pro: {
    audits_monthly: 200,
    site_audit_max_pages: 200,
    scheduled_audits_max: 5,
    scheduled_audit_min_interval_min: 1440,
    api_keys_max: 1,
    api_calls_daily: 1000,
    ai_calls_monthly: 100,
    tools_fetches_daily: -1,
    history_retention_days: 90,
    features: PRO_FEATURES,
  },
  business: {
    audits_monthly: 1000,
    site_audit_max_pages: 2000,
    scheduled_audits_max: 30,
    scheduled_audit_min_interval_min: 15,
    api_keys_max: 5,
    api_calls_daily: 20_000,
    ai_calls_monthly: 1000,
    tools_fetches_daily: -1,
    history_retention_days: -1,
    features: [...PRO_FEATURES, FeatureFlag.PRIORITY_QUEUE],
  },
};

export const PLAN_PRICES_VND: Record<PlanCode, number> = {
  free: 0,
  pro: 99_000,
  business: 299_000,
};

export const PLAN_DISPLAY_NAMES_VI: Record<PlanCode, string> = {
  free: 'Cá nhân',
  pro: 'Chuyên nghiệp',
  business: 'Doanh nghiệp',
};

export const BILLING_DEFAULTS = {
  SUBSCRIPTION_DAYS: 30,
  INTENT_TTL_MINUTES: 30,
} as const;
