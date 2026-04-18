import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { renderWithProviders } from "../../helpers/render";
import OAuthSuccessPage from "@/app/auth/oauth-success/page";
import { useAuthStore } from "@/lib/auth/store";

const API = "http://localhost:3000/api/v1";

const pushMock = vi.fn();
const replaceMock = vi.fn();
let searchString = "?token=oauth-token-abc";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(searchString),
  usePathname: () => "/auth/oauth-success",
}));

/**
 * Regression for bug d38fc4f (Suspense + force-dynamic wrap around
 * useSearchParams). A follow-up that removes either the Suspense
 * boundary or the `dynamic` export would re-introduce the Next build
 * failure caught inline during slug 2. This suite asserts the page still
 * mounts + hydrates + navigates correctly.
 */
describe("<OAuthSuccessPage /> (regression for bug d38fc4f)", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    searchString = "?token=oauth-token-abc";
  });

  it("hydrates store and replaces to /dashboard on valid ?token=", async () => {
    renderWithProviders(<OAuthSuccessPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("oauth-token-abc");
    expect(state.user?.email).toBe("test@example.com");
  });

  it("redirects to /login when ?token= is missing", async () => {
    searchString = "";
    renderWithProviders(<OAuthSuccessPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("clears auth and redirects to /login when /auth/me fails", async () => {
    server.use(
      http.get(`${API}/auth/me`, () =>
        HttpResponse.json({ message: "Token expired" }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ message: "No cookie" }, { status: 401 }),
      ),
    );

    renderWithProviders(<OAuthSuccessPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(useAuthStore.getState().user).toBeNull();
  });
});
