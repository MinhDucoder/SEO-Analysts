import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditStatus } from "@repo/shared";
import { ScoreTrendChart } from "@/components/dashboard/score-trend-chart";
import type { AuditListItem } from "@/lib/api/types";

function audit(i: number): AuditListItem {
  return {
    id: `aud-${i}`,
    url: `https://example.com/page-${i}`,
    domain: "example.com",
    status: AuditStatus.COMPLETED,
    seoScore: 50 + i * 5,
    targetKeyword: null,
    crawlerType: null,
    crawlDurationMs: null,
    createdAt: new Date(`2026-04-${String(i + 10).padStart(2, "0")}T08:00:00+07:00`).toISOString(),
    completedAt: null,
  };
}

describe("<ScoreTrendChart />", () => {
  it("renders chart title + subtitle", () => {
    render(<ScoreTrendChart audits={[audit(1), audit(2), audit(3)]} />);
    expect(screen.getByText(/Xu hướng điểm SEO/)).toBeInTheDocument();
    expect(screen.getByText(/30 ngày gần nhất/)).toBeInTheDocument();
  });

  it("renders chart wrapper when >= 2 completed audits exist", () => {
    render(<ScoreTrendChart audits={[audit(1), audit(2)]} />);
    expect(
      screen.getByTestId("score-trend-chart-wrapper"),
    ).toBeInTheDocument();
  });

  it("renders empty state when fewer than 2 completed audits", () => {
    render(<ScoreTrendChart audits={[audit(1)]} />);
    expect(
      screen.queryByTestId("score-trend-chart-wrapper"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa đủ dữ liệu/)).toBeInTheDocument();
    expect(
      screen.getByText(/Cần ít nhất 2 audit hoàn tất/),
    ).toBeInTheDocument();
  });
});
