import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../helpers/render";
import { Header, resolvePageTitle } from "@/components/layout/header";
import { sampleUser } from "../../msw/handlers";

const mockPathname = vi.fn((): string => "/dashboard");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
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

describe("resolvePageTitle", () => {
  it("returns Dashboard title for /dashboard", () => {
    expect(resolvePageTitle("/dashboard").title).toBe("Tổng quan");
  });

  it("prefers longer prefix for /audits/new over /audits", () => {
    expect(resolvePageTitle("/audits/new").title).toBe("Tạo audit mới");
  });

  it("matches sub-route /audits/abc to 'Audit của tôi'", () => {
    expect(resolvePageTitle("/audits/abc").title).toBe("Audit của tôi");
  });

  it("returns empty string for unknown path", () => {
    expect(resolvePageTitle("/unknown").title).toBe("");
  });
});

describe("<Header />", () => {
  it("renders dashboard title + subtitle + audit-new CTA", () => {
    mockPathname.mockReturnValue("/dashboard");
    renderWithProviders(<Header user={sampleUser} />);
    expect(
      screen.getByRole("heading", { name: /Tổng quan/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sức khỏe SEO/)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Audit mới/ });
    expect(cta).toHaveAttribute("href", "/audits/new");
  });

  it("renders notification bell disabled + search disabled", () => {
    mockPathname.mockReturnValue("/dashboard");
    renderWithProviders(<Header user={sampleUser} />);
    const bell = screen.getByRole("button", { name: /Thông báo/ });
    expect(bell).toBeDisabled();
    const search = screen.getByRole("searchbox");
    expect(search).toBeDisabled();
  });
});
