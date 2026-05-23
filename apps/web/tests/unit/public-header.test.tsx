import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../helpers/render";
import { useAuthStore } from "@/lib/auth/store";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  usePathname: () => "/pricing",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { PublicHeader } from "@/components/layout/public-header";

afterEach(() => useAuthStore.getState().clearAuth());

describe("PublicHeader", () => {
  it("shows login CTA for guests", () => {
    renderWithIntl(<PublicHeader />);
    expect(screen.getByRole("link", { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it("shows 'enter app' CTA when authenticated", () => {
    useAuthStore.setState({ accessToken: "tok" });
    renderWithIntl(<PublicHeader />);
    const cta = screen.getByRole("link", { name: /vào ứng dụng/i });
    expect(cta).toHaveAttribute("href", "/dashboard");
  });
});
