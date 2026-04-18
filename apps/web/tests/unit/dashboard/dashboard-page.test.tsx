import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { renderWithProviders } from "../../helpers/render";
import DashboardPage from "@/app/(app)/dashboard/page";
import { useAuthStore } from "@/lib/auth/store";
import {
  sampleAudits,
  sampleAuditsEmpty,
  sampleUser,
} from "../../msw/handlers";

const API = "http://localhost:3000/api/v1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

describe("<DashboardPage />", () => {
  beforeEach(() => {
    // Page query depends on an authenticated store (hook is `enabled:
    // accessToken !== null`).
    useAuthStore.getState().setAuth(sampleUser, "token-1");
  });

  it("renders DashboardEmpty when audits array is empty", async () => {
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(sampleAuditsEmpty, { status: 200 }),
      ),
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Chưa có audit nào/ }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("link", { name: /Tạo audit đầu tiên/ }),
    ).toHaveAttribute("href", "/audits/new");
  });

  it("renders stats grid + score hero + recent list when audits arrive", async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText(/Audit gần đây/)).toBeInTheDocument(),
    );
    // StatsGrid labels present
    expect(screen.getByText(/Audit tháng này/)).toBeInTheDocument();
    expect(screen.getByText(/Điểm SEO TB/)).toBeInTheDocument();
    // At least one sample URL rendered in RecentAuditsCard
    const firstAudit = sampleAudits[0];
    if (!firstAudit) throw new Error("sampleAudits fixture is empty");
    expect(screen.getByText(new RegExp(firstAudit.url))).toBeInTheDocument();
  });

  it("renders error banner with retry button on 500", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json({ message: "Internal" }, { status: 500 }),
      ),
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/Không tải được dashboard/),
      ).toBeInTheDocument(),
    );

    const retryBtn = screen.getByRole("button", { name: /Thử lại/ });
    expect(retryBtn).toBeInTheDocument();

    // Swap handler to 200 before click, verify retry recovers.
    server.use(
      http.get(`${API}/audits`, () =>
        HttpResponse.json(sampleAuditsEmpty, { status: 200 }),
      ),
    );
    await user.click(retryBtn);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Chưa có audit nào/ }),
      ).toBeInTheDocument(),
    );
  });
});
