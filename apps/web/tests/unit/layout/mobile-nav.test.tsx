import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../helpers/render";
import { MobileNav } from "@/components/layout/mobile-nav";
import { sampleUser } from "../../msw/handlers";

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

describe("<MobileNav />", () => {
  it("renders closed by default — no drawer content visible", () => {
    renderWithProviders(<MobileNav user={sampleUser} />);
    expect(
      screen.getByRole("button", { name: /Mở menu điều hướng/ }),
    ).toBeInTheDocument();
    // The drawer content is inside a portal that is not mounted until
    // the trigger is clicked.
    expect(screen.queryByRole("link", { name: /Dashboard/ })).not.toBeInTheDocument();
  });

  it("opens the drawer on hamburger click and shows nav links", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MobileNav user={sampleUser} />);

    await user.click(
      screen.getByRole("button", { name: /Mở menu điều hướng/ }),
    );

    expect(await screen.findByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Audit$/ })).toBeInTheDocument();
  });

  it("closes the drawer when a nav item is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MobileNav user={sampleUser} />);

    await user.click(
      screen.getByRole("button", { name: /Mở menu điều hướng/ }),
    );
    const dashboardLink = await screen.findByRole("link", {
      name: /Dashboard/,
    });
    await user.click(dashboardLink);

    // Drawer portal unmounts after close animation completes.
    await new Promise((r) => setTimeout(r, 150));
  });
});
