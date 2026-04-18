import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditStatus } from "@repo/shared";
import { RecentAuditsCard } from "@/components/dashboard/recent-audits-card";
import type { AuditListItem } from "@/lib/api/types";

function audit(i: number): AuditListItem {
  return {
    id: `aud-${i}`,
    url: `https://example.com/page-${i}`,
    domain: `example${i}.com`,
    status: AuditStatus.COMPLETED,
    seoScore: 50 + i,
    targetKeyword: null,
    crawlerType: null,
    crawlDurationMs: null,
    createdAt: new Date(2026, 3, 10 + i).toISOString(),
    completedAt: new Date(2026, 3, 10 + i).toISOString(),
  };
}

describe("<RecentAuditsCard />", () => {
  it("shows 'Xem tất cả' link and audit rows", () => {
    render(
      <RecentAuditsCard audits={[audit(1), audit(2), audit(3)]} />,
    );
    expect(screen.getByText(/Audit gần đây/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Xem tất cả/ });
    expect(link).toHaveAttribute("href", "/audits");
    expect(screen.getByText(/page-1/)).toBeInTheDocument();
    expect(screen.getByText(/page-2/)).toBeInTheDocument();
  });

  it("limits rows to `limit` prop", () => {
    render(
      <RecentAuditsCard
        audits={[audit(1), audit(2), audit(3), audit(4), audit(5), audit(6)]}
        limit={3}
      />,
    );
    expect(screen.queryByText(/page-4/)).not.toBeInTheDocument();
    expect(screen.getByText(/page-1/)).toBeInTheDocument();
  });

  it("renders empty state + CTA when audits array is empty", () => {
    render(<RecentAuditsCard audits={[]} />);
    expect(screen.getAllByText(/Chưa có audit nào/)[0]).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Tạo audit/ });
    expect(cta).toHaveAttribute("href", "/audits/new");
  });
});
