import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { PlanCard } from "@/components/billing/PlanCard";
import type { PlanResponse } from "@/lib/api/billing";

type Code = PlanResponse["code"];

function mkPlan(code: Code, over: Partial<PlanResponse> = {}): PlanResponse {
  const price = code === "free" ? 0 : code === "pro" ? 99_000 : 299_000;
  const name = code === "free" ? "Cá nhân" : code === "pro" ? "Chuyên nghiệp" : "Doanh nghiệp";
  return {
    code,
    displayName: name,
    priceVnd: price,
    sortOrder: 0,
    features: {
      audits_monthly: 200,
      site_audit_max_pages: 200,
      scheduled_audits_max: 5,
      scheduled_audit_min_interval_min: 1440,
      api_keys_max: 1,
      api_calls_daily: 1000,
      ai_calls_monthly: 100,
      tools_fetches_daily: -1,
      history_retention_days: 90,
      features: [],
    },
    ...over,
  };
}

describe("PlanCard", () => {
  it("renders display name, formatted price and the per-month suffix for a paid plan", () => {
    renderWithIntl(<PlanCard plan={mkPlan("pro")} onSelect={vi.fn()} />);
    expect(screen.getByText("Chuyên nghiệp")).toBeInTheDocument();
    // The price cell carries both the amount and the "/ tháng" suffix; assert
    // on that single element so the feature-row labels (also "… / tháng") don't
    // collide with the match.
    const priceCell = screen.getByText(/99[.,]000đ/);
    expect(priceCell).toHaveTextContent(/\/ tháng/);
  });

  it("shows the 'Miễn phí' label and no upgrade button for the free plan", () => {
    renderWithIntl(<PlanCard plan={mkPlan("free")} onSelect={vi.fn()} />);
    const priceCell = screen.getByText("Miễn phí");
    expect(priceCell).toBeInTheDocument();
    // Free plans omit the per-month suffix from the price cell.
    expect(priceCell).not.toHaveTextContent(/\/ tháng/);
    expect(screen.queryByRole("button", { name: /nâng cấp/i })).not.toBeInTheDocument();
  });

  it("calls onSelect with the plan code when a paid, non-current plan is chosen", () => {
    const onSelect = vi.fn();
    renderWithIntl(<PlanCard plan={mkPlan("pro")} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /nâng cấp/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("pro");
  });

  it("renders the 'Phổ biến' badge when highlighted", () => {
    renderWithIntl(<PlanCard plan={mkPlan("pro")} highlighted onSelect={vi.fn()} />);
    expect(screen.getByText("Phổ biến")).toBeInTheDocument();
  });

  it("marks the current plan with a 'Đang dùng' badge and hides the upgrade button", () => {
    renderWithIntl(<PlanCard plan={mkPlan("pro")} current onSelect={vi.fn()} />);
    expect(screen.getByText("Đang dùng")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nâng cấp/i })).not.toBeInTheDocument();
  });

  it("disables the button and shows the processing label while busy", () => {
    renderWithIntl(<PlanCard plan={mkPlan("pro")} busy onSelect={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /đang xử lý/i });
    expect(btn).toBeDisabled();
  });
});
