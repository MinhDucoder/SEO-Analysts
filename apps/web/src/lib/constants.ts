/**
 * App-wide constants: route paths, metadata. All route usages in the app
 * MUST reference ROUTES (not hard-code strings) so renames stay grep-safe.
 */

export const APP_NAME = "SEO Analyst";
export const APP_TAGLINE = "Phân tích SEO cho website Việt";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
/** Support inbox surfaced in legal/policy pages and error CTAs. */
export const SUPPORT_EMAIL = "support@seoanalyst.vn";

export const ROUTES = {
  home: "/",

  // Marketing (public)
  tools: "/tools",
  pricing: "/pricing",
  policy: "/policy",

  // Auth (slug 2)
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: (token: string) => `/reset-password/${token}`,
  verifyEmail: (token: string) => `/verify-email/${token}`,
  oauthSuccess: "/auth/oauth-success",

  // App (slugs 3-7)
  dashboard: "/dashboard",
  audits: "/audits",
  auditsNew: "/audits/new",
  auditDetail: (id: string) => `/audits/${id}`,
  auditCompare: (id: string, withId: string) => `/audits/${id}/compare?with=${withId}`,

  // Settings (slug 8)
  settingsProfile: "/settings/profile",
  settingsPassword: "/settings/password",
  settingsApiKeys: "/settings/api-keys",
  settingsBilling: "/settings/billing",

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

/**
 * Sidebar navigation items. `adminOnly` filters at render time against
 * `useAuth().isAdmin`; routes stay defined for slug 7 to fill in. Icons
 * reference lucide-react names to avoid importing React types from a
 * constants module.
 */
export interface SidebarNavItem {
  label: string;
  href: string;
  iconName:
    | "LayoutDashboard"
    | "Search"
    | "GitCompare"
    | "Shield"
    | "Settings";
  adminOnly?: boolean;
}

export const SIDEBAR_NAV: readonly SidebarNavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, iconName: "LayoutDashboard" },
  { label: "Audit",     href: ROUTES.audits,    iconName: "Search" },
  { label: "So sánh",   href: "/audits?compare=1", iconName: "GitCompare" },
  { label: "Quản trị",  href: ROUTES.adminStats, iconName: "Shield", adminOnly: true },
  { label: "Cài đặt",   href: ROUTES.settingsProfile, iconName: "Settings" },
] as const;

/**
 * Header page-title map keyed by pathname prefix. First match wins;
 * longer keys should precede shorter so `/audits/new` beats `/audits`.
 */
export interface PageTitle {
  title: string;
  subtitle?: string;
}

export const PAGE_TITLE_MAP: ReadonlyArray<[string, PageTitle]> = [
  ["/audits/new",      { title: "Tạo audit mới", subtitle: "Nhập URL + cấu hình để phân tích" }],
  ["/audits",          { title: "Audit của tôi", subtitle: "Quản lý mọi audit bạn đã chạy" }],
  ["/dashboard",       { title: "Tổng quan", subtitle: "Sức khỏe SEO của bạn" }],
  ["/settings/profile",{ title: "Hồ sơ", subtitle: "Cập nhật thông tin cá nhân" }],
  ["/settings/password",{ title: "Mật khẩu", subtitle: "Đổi mật khẩu tài khoản" }],
  ["/admin/users",     { title: "Người dùng", subtitle: "Quản lý tài khoản" }],
  ["/admin/rules",     { title: "Quy tắc SEO", subtitle: "Trọng số các rule" }],
  ["/admin/stats",     { title: "Thống kê", subtitle: "Hoạt động nền tảng" }],
];

/**
 * Storage keys — scope-qualified to avoid collisions with future multi-app
 * mounting or third-party scripts.
 */
export const STORAGE_KEYS = {
  sidebarCollapsed: "seo.sidebar.collapsed",
} as const;
