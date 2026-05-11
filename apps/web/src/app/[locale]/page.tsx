import { setRequestLocale, getTranslations } from "next-intl/server";

/**
 * Temporary landing — Phase 5a-i18n smoke test. Phase 5d (auth) will rewrite
 * this to redirect to `/login` for unauthenticated users or `/dashboard` for
 * authenticated ones.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-fg">
      <h1 className="font-ui text-3xl font-semibold">{t("name")}</h1>
      <p className="font-ui text-base text-fg-muted">{t("tagline")}</p>
      <code className="rounded-md bg-bg-overlay px-3 py-1 font-mono text-xs text-fg-subtle">
        locale: {locale}
      </code>
    </main>
  );
}
