import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { AuthGuard, AdminGuard } from "@/lib/auth/guard";
import { useAuthStore } from "@/lib/auth/store";
import { sampleUser, sampleAdmin } from "../msw/handlers";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

describe("<AuthGuard />", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("redirects unauthenticated user to /login via router.replace", async () => {
    renderWithProviders(
      <AuthGuard>
        <div data-testid="guarded">Protected</div>
      </AuthGuard>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    // `router.replace` (not `push`) is a deliberate choice — back button must
    // NOT bring the user back to the guarded page post-redirect.
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("guarded")).not.toBeInTheDocument();
  });

  it("renders children when user is authenticated", () => {
    useAuthStore.getState().setAuth(sampleUser, "token-1");

    renderWithProviders(
      <AuthGuard>
        <div data-testid="guarded">Protected</div>
      </AuthGuard>,
    );

    expect(screen.getByTestId("guarded")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe("<AdminGuard />", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("redirects unauthenticated user to /login", async () => {
    renderWithProviders(
      <AdminGuard>
        <div data-testid="admin-area">Admin Only</div>
      </AdminGuard>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByTestId("admin-area")).not.toBeInTheDocument();
  });

  it("renders NotAuthorized card when non-admin user logs in", () => {
    useAuthStore.getState().setAuth(sampleUser, "token-1");

    renderWithProviders(
      <AdminGuard>
        <div data-testid="admin-area">Admin Only</div>
      </AdminGuard>,
    );

    expect(screen.getByText(/Không có quyền truy cập/i)).toBeInTheDocument();
    expect(screen.queryByTestId("admin-area")).not.toBeInTheDocument();
  });

  it("renders children when user has admin role", () => {
    useAuthStore.getState().setAuth(sampleAdmin, "token-1");

    renderWithProviders(
      <AdminGuard>
        <div data-testid="admin-area">Admin Only</div>
      </AdminGuard>,
    );

    expect(screen.getByTestId("admin-area")).toBeInTheDocument();
  });
});
