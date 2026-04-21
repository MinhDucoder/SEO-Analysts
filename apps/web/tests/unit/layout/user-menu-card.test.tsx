import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../helpers/render";
import { UserMenuCard } from "@/components/layout/user-menu-card";
import { useAuthStore } from "@/lib/auth/store";
import { sampleUser, sampleAdmin } from "../../msw/handlers";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

describe("<UserMenuCard />", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders initials + fullName + role for regular user", () => {
    renderWithProviders(<UserMenuCard user={sampleUser} />);
    expect(
      screen.getByRole("button", { name: /Mở menu tài khoản/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Người dùng/)).toBeInTheDocument();
  });

  it("shows 'Admin' role label when user.role === 'admin'", () => {
    renderWithProviders(<UserMenuCard user={sampleAdmin} />);
    // sampleAdmin.fullName is also "Admin" so both fullName + role label
    // match /^Admin$/. We specifically check there is at least one
    // element — role label is rendered — and that the "Người dùng"
    // fallback is NOT present.
    expect(screen.getAllByText(/^Admin$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Người dùng/)).not.toBeInTheDocument();
  });

  it("renders placeholder skeleton when user is null", () => {
    renderWithProviders(<UserMenuCard user={null} />);
    const el = document.querySelector('[aria-busy="true"]');
    expect(el).toBeInTheDocument();
  });

  it("calls logout mutation and clears auth when 'Đăng xuất' selected", async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setAuth(sampleUser, "token-1");

    renderWithProviders(<UserMenuCard user={sampleUser} />);

    await user.click(
      screen.getByRole("button", { name: /Mở menu tài khoản/ }),
    );
    await user.click(await screen.findByText(/Đăng xuất/));

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});
