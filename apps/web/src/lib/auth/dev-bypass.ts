import type { AuthenticatedUser } from "@/lib/api/types";

/**
 * Dev-only auth bypass. When enabled, `AuthBootstrap` injects a fake admin
 * user into the Zustand store so `AuthGuard` + `AdminGuard` both pass
 * without contacting the gateway. Real API calls will still 401 because
 * the token is fake — this is purely for visual / layout / i18n testing.
 *
 * Double-gated: requires `NEXT_PUBLIC_DEV_BYPASS_AUTH=1` AND a non-prod
 * `NODE_ENV`. Production builds tree-shake the bypass branch because
 * Next.js inlines `process.env.NODE_ENV` at build time.
 */
export function isAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1";
}

export const DEV_BYPASS_USER: AuthenticatedUser = {
  id: "dev-bypass-user",
  email: "dev-bypass@local",
  fullName: "Dev Bypass Admin",
  role: "admin",
  emailVerified: true,
  createdAt: new Date(0).toISOString(),
};

export const DEV_BYPASS_TOKEN = "dev-bypass-fake-token";
