import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { renderWithProviders } from "../../helpers/render";
import LoginPage from "@/app/(auth)/login/page";
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
  usePathname: () => "/login",
}));

describe("<LoginPage />", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("renders email + password inputs and primary button", () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Đăng nhập$/i })).toBeInTheDocument();
  });

  it("shows zod validation error when email is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /^Đăng nhập$/i }));

    // Vietnamese email-required message comes from schemas.ts
    await waitFor(() =>
      expect(screen.getByText(/Vui lòng nhập email/i)).toBeInTheDocument(),
    );
    // router.push should NOT have been called on a client-side validation fail.
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("on 200 response, hydrates auth store and navigates to /dashboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/i), "test@example.com");
    await user.type(screen.getByLabelText(/Mật khẩu/i), "secret");
    await user.click(screen.getByRole("button", { name: /^Đăng nhập$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(useAuthStore.getState().accessToken).toBeTruthy();
    expect(useAuthStore.getState().user?.email).toBe("test@example.com");
  });

  it("on 401 response, does not navigate and leaves user null", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: "Invalid credentials" }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ message: "No cookie" }, { status: 401 }),
      ),
    );

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/Email/i), "bad@example.com");
    await user.type(screen.getByLabelText(/Mật khẩu/i), "wrong");
    await user.click(screen.getByRole("button", { name: /^Đăng nhập$/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
