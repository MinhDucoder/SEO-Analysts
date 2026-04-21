import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";

describe("<DashboardEmpty />", () => {
  it("renders heading + body + CTA link", () => {
    render(<DashboardEmpty />);
    expect(
      screen.getByRole("heading", { name: /Chưa có audit nào/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tạo audit đầu tiên để bắt đầu phân tích SEO/),
    ).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Tạo audit đầu tiên/ });
    expect(cta).toHaveAttribute("href", "/audits/new");
  });
});
