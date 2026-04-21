import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { renderWithProviders } from "../../helpers/render";
import ResetPasswordPage from "@/app/(auth)/reset-password/[token]/page";

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
  usePathname: () => "/reset-password/abc",
}));

describe("<ResetPasswordPage />", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders two password fields + submit", () => {
    renderWithProviders(<ResetPasswordPage params={{ token: "abc" }} />);

    expect(screen.getByLabelText(/Mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Xác nhận mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt mật khẩu mới/i })).toBeInTheDocument();
  });

  it("rejects short new password", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage params={{ token: "abc" }} />);

    await user.type(screen.getByLabelText(/Mật khẩu mới/i), "short");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "short");
    await user.click(screen.getByRole("button", { name: /Đặt mật khẩu mới/i }));

    await waitFor(() =>
      expect(screen.getByText(/^Mật khẩu tối thiểu 8 ký tự$/i)).toBeInTheDocument(),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage params={{ token: "abc" }} />);

    await user.type(screen.getByLabelText(/Mật khẩu mới/i), "password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "different-one");
    await user.click(screen.getByRole("button", { name: /Đặt mật khẩu mới/i }));

    await waitFor(() =>
      expect(screen.getByText(/không khớp/i)).toBeInTheDocument(),
    );
  });

  it("on 200, pushes to /login", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage params={{ token: "abc" }} />);

    await user.type(screen.getByLabelText(/Mật khẩu mới/i), "password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "password123");
    await user.click(screen.getByRole("button", { name: /Đặt mật khẩu mới/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("on 400 expired token, stays on page", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/auth/reset-password`, () =>
        HttpResponse.json({ message: "Invalid or expired token" }, { status: 400 }),
      ),
    );

    renderWithProviders(<ResetPasswordPage params={{ token: "expired" }} />);
    await user.type(screen.getByLabelText(/Mật khẩu mới/i), "password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "password123");
    await user.click(screen.getByRole("button", { name: /Đặt mật khẩu mới/i }));

    await waitFor(() => {
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
