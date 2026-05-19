import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/lib/auth/store";

const baseUser = {
  id: "u1",
  email: "u@test.local",
  fullName: "U",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("auth-store admin selectors", () => {
  beforeEach(() => useAuthStore.getState().clearAuth());

  it("isAdmin() returns false when no user", () => {
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it("isAdmin() returns false for role='user'", () => {
    useAuthStore.getState().setAuth({ ...baseUser, role: "user" }, "tok");
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });

  it("isAdmin() returns true for role='admin'", () => {
    useAuthStore.getState().setAuth({ ...baseUser, role: "admin" }, "tok");
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it("clearAuth() flips isAdmin() back to false", () => {
    useAuthStore.getState().setAuth({ ...baseUser, role: "admin" }, "tok");
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });
});
