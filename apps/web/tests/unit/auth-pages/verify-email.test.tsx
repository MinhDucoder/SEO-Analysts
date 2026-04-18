import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { renderWithProviders } from "../../helpers/render";
import VerifyEmailPage from "@/app/(auth)/verify-email/[token]/page";

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
  usePathname: () => "/verify-email/abc",
}));

describe("<VerifyEmailPage />", () => {
  it("auto-fires verify mutation on mount and renders success card on 200", async () => {
    renderWithProviders(<VerifyEmailPage params={{ token: "valid-token" }} />);

    await waitFor(() =>
      expect(screen.getByText(/Xác nhận thành công/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Đăng nhập/i })).toBeInTheDocument();
  });

  it("renders error state when server returns 400 (expired token)", async () => {
    server.use(
      http.post(`${API}/auth/verify-email`, () =>
        HttpResponse.json({ message: "Token expired" }, { status: 400 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ message: "No cookie" }, { status: 401 }),
      ),
    );

    renderWithProviders(<VerifyEmailPage params={{ token: "expired-token" }} />);

    await waitFor(() =>
      expect(screen.getByText(/Link không hợp lệ/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Yêu cầu email mới/i })).toBeInTheDocument();
  });
});
