import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarLink, isActive } from "@/components/layout/sidebar-link";
import type { SidebarNavItem } from "@/lib/constants";

const mockPathname = vi.fn((): string => "/dashboard");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const dashboardItem: SidebarNavItem = {
  label: "Dashboard",
  href: "/dashboard",
  iconName: "LayoutDashboard",
};

const auditsItem: SidebarNavItem = {
  label: "Audit",
  href: "/audits",
  iconName: "Search",
};

describe("isActive", () => {
  it("matches exact pathname", () => {
    expect(isActive("/dashboard", "/dashboard")).toBe(true);
  });

  it("matches sub-route under prefix", () => {
    expect(isActive("/audits/abc", "/audits")).toBe(true);
  });

  it("does not match unrelated prefix", () => {
    expect(isActive("/auditss", "/audits")).toBe(false);
  });

  it("strips query string from href before comparing", () => {
    expect(isActive("/audits", "/audits?compare=1")).toBe(true);
  });

  it("home route matches exactly only", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/dashboard", "/")).toBe(false);
  });
});

describe("<SidebarLink />", () => {
  it("applies active styling when pathname matches", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<SidebarLink item={dashboardItem} />);
    const link = screen.getByRole("link", { name: /Dashboard/ });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.className).toContain("bg-sidebar-bg-active");
  });

  it("renders inactive styling for non-matching route", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<SidebarLink item={auditsItem} />);
    const link = screen.getByRole("link", { name: /Audit/ });
    expect(link).not.toHaveAttribute("aria-current", "page");
    expect(link.className).not.toContain("bg-sidebar-bg-active");
  });

  it("invokes onNavigate on click", async () => {
    mockPathname.mockReturnValue("/dashboard");
    const onNavigate = vi.fn();
    render(<SidebarLink item={auditsItem} onNavigate={onNavigate} />);
    const link = screen.getByRole("link", { name: /Audit/ });
    link.click();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
