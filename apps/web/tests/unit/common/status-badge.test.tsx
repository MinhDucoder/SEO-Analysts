import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditStatus } from "@repo/shared";
import { StatusBadge } from "@/components/common/status-badge";

describe("<StatusBadge />", () => {
  it("shows 'Hoàn tất' for COMPLETED", () => {
    render(<StatusBadge status={AuditStatus.COMPLETED} />);
    expect(screen.getByText(/Hoàn tất/)).toBeInTheDocument();
  });

  it("shows 'Thất bại' for FAILED", () => {
    render(<StatusBadge status={AuditStatus.FAILED} />);
    expect(screen.getByText(/Thất bại/)).toBeInTheDocument();
  });

  it("shows 'Đang crawl' for CRAWLING", () => {
    render(<StatusBadge status={AuditStatus.CRAWLING} />);
    expect(screen.getByText(/Đang crawl/)).toBeInTheDocument();
  });

  it("shows 'Chờ xử lý' for PENDING", () => {
    render(<StatusBadge status={AuditStatus.PENDING} />);
    expect(screen.getByText(/Chờ xử lý/)).toBeInTheDocument();
  });
});
