import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { renderWithProviders } from "../../helpers/render";
import RegisterPage from "@/app/(auth)/register/page";
import { useAuthStore } from "@/lib/auth/store";

const API = "http://localhost:3000/api/v1";

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
  usePathname: () => "/register",
}));

describe("<RegisterPage />", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("renders full name, email, password, confirm, agreed checkbox, submit", () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByLabelText(/Họ và tên/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Xác nhận mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Đăng ký$/i })).toBeInTheDocument();
  });

  it("blocks submit when agreed=false and shows Vietnamese error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/Họ và tên/i), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/^Email$/i), "a@b.com");
    await user.type(screen.getByLabelText(/^Mật khẩu$/i), "password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "password123");
    await user.click(screen.getByRole("button", { name: /^Đăng ký$/i }));

    await waitFor(() =>
      expect(screen.getByText(/đồng ý với điều khoản/i)).toBeInTheDocument(),
    );
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("rejects mismatched confirm password", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/Họ và tên/i), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/^Email$/i), "a@b.com");
    await user.type(screen.getByLabelText(/^Mật khẩu$/i), "password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "wrong-other");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /^Đăng ký$/i }));

    await waitFor(() =>
      expect(screen.getByText(/không khớp/i)).toBeInTheDocument(),
    );
  });

  it("on 201, hydrates store and shows success card with submitted email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/Họ và tên/i), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/^Email$/i), "new-user@example.com");
    await user.type(screen.getByLabelText(/^Mật khẩu$/i), "password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /^Đăng ký$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Đã gửi email xác nhận/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/new-user@example.com/)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeTruthy();
  });

  it("on 409 email taken, stays on form and leaves store empty", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json({ message: "Email already exists" }, { status: 409 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ message: "No cookie" }, { status: 401 }),
      ),
    );

    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText(/Họ và tên/i), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/^Email$/i), "taken@example.com");
    await user.type(screen.getByLabelText(/^Mật khẩu$/i), "password123");
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/i), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /^Đăng ký$/i }));

    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
    expect(screen.queryByText(/Đã gửi email xác nhận/i)).not.toBeInTheDocument();
  });
});
