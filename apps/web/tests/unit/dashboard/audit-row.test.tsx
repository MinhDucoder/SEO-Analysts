import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditStatus } from "@repo/shared";
import { AuditRow } from "@/components/dashboard/audit-row";
import type { AuditListItem } from "@/lib/api/types";

const sample: AuditListItem = {
  id: "aud-123",
  url: "https://example.com/landing",
  domain: "example.com",
  status: AuditStatus.COMPLETED,
  seoScore: 82,
  targetKeyword: null,
  crawlerType: null,
  crawlDurationMs: null,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  completedAt: new Date().toISOString(),
};

describe("<AuditRow />", () => {
  it("renders URL + domain + score badge + status badge", () => {
    render(<AuditRow audit={sample} />);
    expect(screen.getByText(sample.url)).toBeInTheDocument();
    // Domain + relative time share a "·" separator — match that specific line.
    expect(screen.getByText(/example\.com · /)).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText(/Hoàn tất/)).toBeInTheDocument();
  });

  it("links to ROUTES.auditDetail(id)", () => {
    render(<AuditRow audit={sample} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/audits/aud-123");
  });

  it("renders — for null seoScore (pending audits)", () => {
    render(
      <AuditRow
        audit={{ ...sample, status: AuditStatus.CRAWLING, seoScore: null }}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/Đang crawl/)).toBeInTheDocument();
  });
});
