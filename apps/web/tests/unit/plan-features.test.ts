import { describe, it, expect } from "vitest";
import { PLAN_FEATURE_ROWS, formatRetention } from "@/lib/billing/plan-features";
import type { PlanDefinition } from "@repo/shared";

const free: PlanDefinition = {
  audits_monthly: 10,
  site_audit_max_pages: 0,
  scheduled_audits_max: 0,
  scheduled_audit_min_interval_min: 0,
  api_keys_max: 0,
  api_calls_daily: 0,
  ai_calls_monthly: 0,
  tools_fetches_daily: 10,
  history_retention_days: 7,
  features: [],
};

describe("plan-features", () => {
  it("formats unlimited retention as ∞", () => {
    expect(formatRetention(-1)).toBe("∞");
    expect(formatRetention(90)).toBe("90 ngày");
  });

  it("renders site-mode 0 as — and exposes all 7 rows", () => {
    expect(PLAN_FEATURE_ROWS).toHaveLength(7);
    const siteRow = PLAN_FEATURE_ROWS.find((r) => r.key === "siteMode")!;
    expect(siteRow.value(free)).toBe("—");
    const auditsRow = PLAN_FEATURE_ROWS.find((r) => r.key === "auditsMonthly")!;
    expect(auditsRow.value(free)).toBe("10");
  });
});
