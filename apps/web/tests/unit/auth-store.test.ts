import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import type { AuthenticatedUser } from "@/lib/api/types";

const sampleUser: AuthenticatedUser = {
  id: "user-1",
  email: "a@b.com",
  fullName: "Nguyễn Văn A",
  role: "user",
  emailVerified: true,
  createdAt: new Date().toISOString(),
};

const sampleAdmin: AuthenticatedUser = { ...sampleUser, id: "u-admin", role: "admin" };

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("defaults to unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
    expect(state.isAdmin()).toBe(false);
  });

  it("setAuth stores user + token and flips isAuthenticated", () => {
    useAuthStore.getState().setAuth(sampleUser, "token-123");
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe("a@b.com");
    expect(state.accessToken).toBe("token-123");
    expect(state.isAuthenticated()).toBe(true);
    expect(state.isAdmin()).toBe(false);
  });

  it("isAdmin returns true for role=admin users", () => {
    useAuthStore.getState().setAuth(sampleAdmin, "t");
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it("clearAuth resets both user and token", () => {
    useAuthStore.getState().setAuth(sampleUser, "t");
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });
});
