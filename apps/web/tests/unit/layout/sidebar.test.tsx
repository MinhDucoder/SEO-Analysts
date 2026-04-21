import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../helpers/render";
import { Sidebar } from "@/components/layout/sidebar";
import { sampleUser, sampleAdmin } from "../../msw/handlers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("<Sidebar />", () => {
  it("renders all non-admin nav items for regular user", () => {
    renderWithProviders(<Sidebar user={sampleUser} />);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Audit$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /So sánh/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cài đặt/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Quản trị/ }),
    ).not.toBeInTheDocument();
  });

  it("reveals admin nav item when user.role === 'admin'", () => {
    renderWithProviders(<Sidebar user={sampleAdmin} />);
    expect(screen.getByRole("link", { name: /Quản trị/ })).toBeInTheDocument();
  });

  it("renders brand wordmark at the top", () => {
    renderWithProviders(<Sidebar user={sampleUser} />);
    expect(screen.getByRole("heading", { name: /SEO Analyst/ })).toBeInTheDocument();
  });
});
