// Root layout is intentionally minimal — html/body, providers, fonts, and
// NextIntlClientProvider all live in [locale]/layout.tsx so locale-aware
// components (i18n hooks, locale-specific fonts) have proper context.
// This file exists only because Next.js App Router requires a root layout.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
