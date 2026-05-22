import type { PlanDefinition } from "@repo/shared";

/** -1 = unlimited. Vietnamese unit kept inline (VN-primary, matches PlanCard). */
export function formatRetention(days: number): string {
  return days === -1 ? "∞" : `${days} ngày`;
}

export interface PlanFeatureRow {
  /** i18n key under `pricing.features.<key>` */
  key:
    | "auditsMonthly"
    | "siteMode"
    | "scheduled"
    | "aiCalls"
    | "apiCalls"
    | "apiKeys"
    | "history";
  /** Display value for a given plan's feature matrix. */
  value: (f: PlanDefinition) => string;
}

export const PLAN_FEATURE_ROWS: PlanFeatureRow[] = [
  { key: "auditsMonthly", value: (f) => `${f.audits_monthly}` },
  { key: "siteMode", value: (f) => (f.site_audit_max_pages > 0 ? `${f.site_audit_max_pages} trang` : "—") },
  { key: "scheduled", value: (f) => `${f.scheduled_audits_max}` },
  { key: "aiCalls", value: (f) => `${f.ai_calls_monthly}` },
  { key: "apiCalls", value: (f) => `${f.api_calls_daily}` },
  { key: "apiKeys", value: (f) => `${f.api_keys_max}` },
  { key: "history", value: (f) => formatRetention(f.history_retention_days) },
];
