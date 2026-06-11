import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools.index" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function ToolsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tools.index" });

  const tools = [
    { slug: "google-preview", name: t("google.name"), desc: t("google.desc") },
    { slug: "social-preview", name: t("social.name"), desc: t("social.desc") },
    { slug: "schema-preview", name: t("schema.name"), desc: t("schema.desc") },
    { slug: "sitemap-validator", name: t("sitemap.name"), desc: t("sitemap.desc") },
    { slug: "favicon-checker", name: t("favicon.name"), desc: t("favicon.desc") },
  ];

  return (
    <div className="container mx-auto max-w-6xl py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="rounded-lg border bg-card p-5 transition-colors hover:border-primary"
          >
            <h2 className="text-lg font-semibold">{tool.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
