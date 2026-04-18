import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import type { DashboardStats } from "@/lib/dashboard/aggregates";

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    auditsThisMonth: { value: 3, delta: 1 },
    avgScore: { value: 78, delta: 5 },
    criticalIssues: { value: null, delta: null },
    pdfsExported: { value: null, delta: null },
    ...overrides,
  };
}

describe("<StatsGrid />", () => {
  it("renders all 4 stat labels", () => {
    render(<StatsGrid stats={makeStats()} />);
    expect(screen.getByText(/Audit tháng này/)).toBeInTheDocument();
    expect(screen.getByText(/Điểm SEO TB/)).toBeInTheDocument();
    expect(screen.getByText(/Issue quan trọng/)).toBeInTheDocument();
    expect(screen.getByText(/PDF đã xuất/)).toBeInTheDocument();
  });

  it("shows value + delta when present", () => {
    render(<StatsGrid stats={makeStats()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("renders '—' + placeholder for null-value stats", () => {
    render(<StatsGrid stats={makeStats()} />);
    // criticalIssues + pdfsExported both null → 2 dashes + 2 placeholders
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getAllByText(/Có trong slug tiếp/)).toHaveLength(2);
  });

  it("renders '±0' delta when delta is exactly 0", () => {
    render(
      <StatsGrid
        stats={makeStats({
          auditsThisMonth: { value: 5, delta: 0 },
        })}
      />,
    );
    expect(screen.getByText("±0")).toBeInTheDocument();
  });
});
