import { defineRouting } from "next-intl/routing";

/**
 * i18n routing config (single source of truth for middleware + navigation).
 *
 * - Locales: Vietnamese (default) + English. VN is the primary market, so its
 *   routes carry no prefix; EN gets `/en/...`.
 * - localePrefix: 'as-needed' → `/login` (VN), `/en/login` (EN).
 *
 * Reference: design Phase 5 INVENTORY §4.1.
 */
export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
