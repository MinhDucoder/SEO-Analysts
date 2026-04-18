/**
 * App-wide constants: route paths, metadata. All route usages in the app
 * MUST reference ROUTES (not hard-code strings) so renames stay grep-safe.
 */

export const APP_NAME = "SEO Analyst";
export const APP_TAGLINE = "Phân tích SEO cho website Việt";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export const ROUTES = {
  home: "/",

  // Auth (slug 2)
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: (token: string) => `/reset-password/${token}`,
  verifyEmail: (token: string) => `/verify-email/${token}`,
  oauthSuccess: "/oauth-success",

  // App (slugs 3-7)
  dashboard: "/dashboard",
  audits: "/audits",
  auditsNew: "/audits/new",
  auditDetail: (id: string) => `/audits/${id}`,
  auditCompare: (id: string, withId: string) => `/audits/${id}/compare?with=${withId}`,

  // Settings (slug 8)
  settingsProfile: "/settings/profile",
  settingsSecurity: "/settings/security",

  // Admin (slug 7)
  adminUsers: "/admin/users",
  adminRules: "/admin/rules",
  adminStats: "/admin/stats",

  // Public (slug 9)
  shared: (token: string) => `/shared/${token}`,
} as const;

/**
 * Backend base URLs resolved at runtime from NEXT_PUBLIC_* envs. Defaults
 * align with local docker-compose (gateway :3000, report :3004).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000";
export const REPORT_HTTP_URL = process.env.NEXT_PUBLIC_REPORT_HTTP_URL ?? "http://localhost:3004";
