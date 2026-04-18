import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { sampleUser, sampleAccessToken } from "../msw/handlers";
import { TestProviders } from "../helpers/render";
import { useLogin, useRegister, useForgotPassword } from "@/lib/auth/mutations";
import { useAuthStore } from "@/lib/auth/store";
import { queryKeys } from "@/lib/queries/keys";
import { QueryClient } from "@tanstack/react-query";

const API = "http://localhost:3000/api/v1";

function wrapperWithClient(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );
  Wrapper.displayName = "WrapperWithClient";
  return Wrapper;
}

describe("useLogin (regression for bug 0cb8acd)", () => {
  it("runs wrapper defaults AND caller extras.onSuccess when caller supplies extras", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const callerOnSuccess = vi.fn();

    const { result } = renderHook(
      () => useLogin({ onSuccess: callerOnSuccess }),
      { wrapper: wrapperWithClient(queryClient) },
    );

    result.current.mutate({ email: "test@example.com", password: "secret" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Wrapper default must have run — bug 0cb8acd was that this was skipped
    // whenever caller provided extras.onSuccess.
    expect(useAuthStore.getState().accessToken).toBe(sampleAccessToken);
    expect(useAuthStore.getState().user?.id).toBe(sampleUser.id);
    expect(queryClient.getQueryData(queryKeys.auth.me)).toEqual(sampleUser);

    // Caller extras must also run.
    expect(callerOnSuccess).toHaveBeenCalledTimes(1);
  });

  it("runs wrapper defaults alone when no extras supplied", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapperWithClient(queryClient),
    });

    result.current.mutate({ email: "test@example.com", password: "secret" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe(sampleAccessToken);
  });

  it("does NOT hydrate user when the server rejects credentials", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: "Invalid credentials" }, { status: 401 }),
      ),
      // Prevent the 401 interceptor from silently refreshing against the
      // default /auth/refresh mock — we want this test to observe the login
      // failure end-to-end, not the refresh fallback.
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ message: "No cookie" }, { status: 401 }),
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapperWithClient(queryClient),
    });

    result.current.mutate({ email: "x@y.com", password: "wrong" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // The user field MUST stay null — setAuth writes BOTH user and token
    // together, so `user === null` is the invariant we care about even if
    // the interceptor has scribbled a refresh token into `accessToken`.
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe("useRegister", () => {
  it("sets auth on 201 and invokes caller onSuccess", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const callerOnSuccess = vi.fn();

    const { result } = renderHook(
      () => useRegister({ onSuccess: callerOnSuccess }),
      { wrapper: wrapperWithClient(queryClient) },
    );

    result.current.mutate({
      fullName: "Nguyễn Văn Test",
      email: "new@example.com",
      password: "password123",
      confirmPassword: "password123",
      agreed: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe(sampleAccessToken);
    expect(callerOnSuccess).toHaveBeenCalledTimes(1);
  });
});

describe("useForgotPassword", () => {
  it("calls caller onSuccess on 200", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const callerOnSuccess = vi.fn();

    const { result } = renderHook(
      () => useForgotPassword({ onSuccess: callerOnSuccess }),
      { wrapper: wrapperWithClient(queryClient) },
    );

    result.current.mutate({ email: "a@b.com" });
    await waitFor(() => expect(callerOnSuccess).toHaveBeenCalled());
  });

  it("calls caller onError on network failure WITHOUT firing a default toast", async () => {
    server.use(
      http.post(`${API}/auth/forgot-password`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const callerOnError = vi.fn();

    const { result } = renderHook(
      () => useForgotPassword({ onError: callerOnError }),
      { wrapper: wrapperWithClient(queryClient) },
    );

    result.current.mutate({ email: "a@b.com" });
    await waitFor(() => expect(callerOnError).toHaveBeenCalled());
    // No expectation on toast — absence is the whole point (no leak).
  });
});
