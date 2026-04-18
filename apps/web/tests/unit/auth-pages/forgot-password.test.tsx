import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { renderWithProviders } from "../../helpers/render";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

const API = "http://localhost:3000/api/v1";

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
  usePathname: () => "/forgot-password",
}));

describe("<ForgotPasswordPage />", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders email input and submit button", () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gửi link đặt lại/i })).toBeInTheDocument();
  });

  it("validates malformed email via zod", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/^Email$/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /Gửi link đặt lại/i }));

    await waitFor(() =>
      expect(screen.getByText(/không hợp lệ/i)).toBeInTheDocument(),
    );
  });

  it("shows generic success card on 200 — never leaks account existence", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/^Email$/i), "any@example.com");
    await user.click(screen.getByRole("button", { name: /Gửi link đặt lại/i }));

    await waitFor(() =>
      expect(screen.getByText(/Đã gửi email/i)).toBeInTheDocument(),
    );
  });

  it("STILL shows success card on 500 — no account-existence leak even on errors", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/auth/forgot-password`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText(/^Email$/i), "any@example.com");
    await user.click(screen.getByRole("button", { name: /Gửi link đặt lại/i }));

    await waitFor(() =>
      expect(screen.getByText(/Đã gửi email/i)).toBeInTheDocument(),
    );
  });
});
