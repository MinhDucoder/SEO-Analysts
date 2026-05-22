// Root layout is a pass-through: the real <html>/<body>, NextIntlClientProvider
// and app Providers live in app/[locale]/layout.tsx. Rendering html/body +
// Providers here too would (a) nest <html>/<body> and (b) mount intl-dependent
// global modals (AccountLockedModal/RateLimitModal) OUTSIDE the intl provider,
// crashing every page with a missing-NextIntlClientProvider error.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
