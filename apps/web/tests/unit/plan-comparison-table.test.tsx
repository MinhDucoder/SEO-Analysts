import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { PlanComparisonTable } from "@/components/billing/PlanComparisonTable";
import type { PlanResponse } from "@/lib/api/billing";

const mk = (code: "free" | "pro" | "business", over: Partial<PlanResponse["features"]> = {}): PlanResponse => ({
  code, displayName: code, priceVnd: 0, sortOrder: 0,
  features: {
    audits_monthly: 10, site_audit_max_pages: 0, scheduled_audits_max: 0,
    scheduled_audit_min_interval_min: 0, api_keys_max: 0, api_calls_daily: 0,
    ai_calls_monthly: 0, tools_fetches_daily: 10, history_retention_days: 7, features: [], ...over,
  },
});

const plans = [mk("free"), mk("pro", { audits_monthly: 200 }), mk("business", { audits_monthly: 1000 })];

describe("PlanComparisonTable", () => {
  it("renders a column per plan and a row per feature", () => {
    renderWithIntl(<PlanComparisonTable plans={plans} currentPlanCode={null} />);
    expect(screen.getByRole("columnheader", { name: /free/i })).toBeInTheDocument();
    expect(screen.getByText("Audits / tháng")).toBeInTheDocument();
    // pro audits value present
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("marks the current plan column", () => {
    renderWithIntl(<PlanComparisonTable plans={plans} currentPlanCode="pro" />);
    const proHeader = screen.getByRole("columnheader", { name: /pro/i });
    expect(within(proHeader).getByText("Đang dùng")).toBeInTheDocument();
  });
});
