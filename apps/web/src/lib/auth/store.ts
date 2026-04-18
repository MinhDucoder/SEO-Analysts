import { create } from "zustand";
import type { AuthenticatedUser } from "@/lib/api/types";

/**
 * Zustand auth store. Keeps `accessToken` in memory only (NEVER localStorage
 * per §30 Frontend Architecture — XSS risk). Refresh token lives in an
 * HTTP-only cookie set by the gateway.
 *
 * Slug 1 (web-bootstrap) ships this as a stub; slug 2 (auth-flow) wires it
 * to real login/register/logout mutations and boot-time /auth/refresh.
 */

export interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;

  setAuth: (user: AuthenticatedUser, accessToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,

  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),

  isAuthenticated: () => get().accessToken !== null,
  isAdmin: () => get().user?.role === "admin",
}));
