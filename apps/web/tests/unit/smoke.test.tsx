import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("smoke: HomePage", () => {
  it("renders the SEO Analyst wordmark heading", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1, name: /SEO Analyst/i });
    expect(heading).toBeInTheDocument();
  });

  it("renders the web-bootstrap badge", () => {
    render(<HomePage />);
    expect(screen.getByText("web-bootstrap")).toBeInTheDocument();
  });

  it("renders the Vietnamese status paragraph", () => {
    render(<HomePage />);
    expect(screen.getByText(/Đang xây dựng giao diện người dùng/i)).toBeInTheDocument();
  });

  it("renders a primary button with Vietnamese label", () => {
    render(<HomePage />);
    const button = screen.getByRole("button", { name: /Hệ thống đang chuẩn bị/i });
    expect(button).toBeInTheDocument();
  });
});
