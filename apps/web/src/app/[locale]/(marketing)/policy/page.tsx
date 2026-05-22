import { getTranslations } from "next-intl/server";
import { POLICY_SECTIONS } from "@/lib/content/policy";

export default async function PolicyPage() {
  const t = await getTranslations("policy");
  return (
    <main className="container mx-auto max-w-3xl space-y-10 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      {POLICY_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold">{t(section.titleKey)}</h2>
          {section.paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-fg-muted">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
