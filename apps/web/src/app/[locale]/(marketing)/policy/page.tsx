import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarClock,
  Clock,
  CreditCard,
  Mail,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { POLICY_SECTIONS, POLICY_UPDATED_AT, type PolicySection } from "@/lib/content/policy";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { PolicyAside } from "@/components/policy/policy-aside";
import { PolicyBackToTop } from "@/components/policy/policy-back-to-top";

const SECTION_ICON: Record<PolicySection["titleKey"], LucideIcon> = {
  terms: Scale,
  privacy: ShieldCheck,
  payment: CreditCard,
};

const WORDS_PER_MINUTE = 200;

export default async function PolicyPage() {
  const t = await getTranslations("policy");
  const locale = await getLocale();

  const updatedAt = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(POLICY_UPDATED_AT));

  const wordCount = POLICY_SECTIONS.reduce((sum, s) => {
    const text = s.blocks
      .map((b) => [b.heading, ...(b.paragraphs ?? []), ...(b.list ?? [])].join(" "))
      .join(" ");
    return sum + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  const minutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

  const tocItems = POLICY_SECTIONS.map((s) => ({ id: s.id, label: t(s.titleKey) }));

  const supportMailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    SUPPORT_EMAIL,
  )}&su=${encodeURIComponent(t("contactSubject"))}`;

  return (
    <main className="relative">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-border bg-bg-elevated">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_right,rgb(var(--color-border))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--color-border))_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_-10%,#000_25%,transparent_72%)]"
        />
        <div className="container mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="animate-fade-up space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg/70 px-3 py-1 font-mono text-xs uppercase tracking-widest text-fg-muted backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("eyebrow")}
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
            <p className="max-w-xl text-md leading-relaxed text-fg-muted">{t("subtitle")}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm text-fg-subtle">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {t("readTime", { minutes })}
              </span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-border-strong" />
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                {t("lastUpdated")}:&nbsp;
                <time dateTime={POLICY_UPDATED_AT} className="text-fg-muted">
                  {updatedAt}
                </time>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body: sticky TOC + sections ───────────────────────────────── */}
      <div className="container mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_1fr] lg:gap-14">
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-10">
              <PolicyAside
                items={tocItems}
                tocTitle={t("tocTitle")}
                printLabel={t("printPage")}
              />
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {POLICY_SECTIONS.map((section, i) => {
              const Icon = SECTION_ICON[section.titleKey];
              return (
                <section
                  key={section.id}
                  id={section.id}
                  style={{ animationDelay: `${(i + 1) * 70}ms` }}
                  className="animate-fade-up scroll-mt-10 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-bg-overlay text-fg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1 pt-0.5">
                      <span className="font-mono text-xs tabular-nums text-fg-subtle">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-2xl font-semibold tracking-tight">
                        <a href={`#${section.id}`} className="group inline-flex items-center gap-2">
                          {t(section.titleKey)}
                          <span
                            aria-hidden
                            className="font-mono text-fg-disabled opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            #
                          </span>
                        </a>
                      </h2>
                      <p className="text-sm text-fg-muted">{section.summary}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-7 border-t border-border pt-6">
                    {section.blocks.map((block, j) => (
                      <div key={j} className="space-y-2.5">
                        <h3 className="flex items-baseline gap-2.5 text-base font-semibold text-fg">
                          <span className="font-mono text-xs tabular-nums text-fg-subtle">
                            {i + 1}.{j + 1}
                          </span>
                          {block.heading}
                        </h3>
                        {block.paragraphs?.map((paragraph, k) => (
                          <p key={k} className="text-sm leading-relaxed text-fg-muted">
                            {paragraph}
                          </p>
                        ))}
                        {block.list && (
                          <ul className="mt-1 space-y-2">
                            {block.list.map((item, k) => (
                              <li
                                key={k}
                                className="flex gap-3 text-sm leading-relaxed text-fg-muted"
                              >
                                <span
                                  aria-hidden
                                  className="mt-[0.5rem] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-border-strong"
                                />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ── Contact CTA ──────────────────────────────────────────── */}
            <section
              style={{ animationDelay: `${(POLICY_SECTIONS.length + 1) * 70}ms` }}
              className="animate-fade-up rounded-xl border border-border bg-bg-overlay p-8 text-center sm:p-10 print:hidden"
            >
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg text-fg">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">{t("contactTitle")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
                {t("contactBody")}
              </p>
              <a
                href={supportMailHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-overlay"
              >
                <Mail className="h-4 w-4" />
                {t("contactCta")}
              </a>
              <p className="mt-3 font-mono text-xs text-fg-subtle">{SUPPORT_EMAIL}</p>
            </section>
          </div>
        </div>
      </div>

      <PolicyBackToTop label={t("backToTop")} />
    </main>
  );
}
