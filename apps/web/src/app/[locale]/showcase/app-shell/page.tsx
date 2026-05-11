import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/domain";

/**
 * Phase 5c smoke route — renders full AppShell wrapping a demo content area
 * so sidebar/topbar/theme-toggle/locale-switcher/collapsed-mode can be
 * verified end-to-end. Will be removed once real routes (Phase 6a+) take over.
 *
 * Visit: /showcase/app-shell (EN default) or /vi/showcase/app-shell.
 */
export default async function AppShellShowcase({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Showcase", href: "/showcase" },
        { label: "AppShell" },
      ]}
      topbarActions={
        <>
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button size="sm">New audit</Button>
        </>
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8 font-ui text-fg">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">AppShell — Phase 5c</h1>
          <p className="text-base text-fg-muted">
            Sidebar (Header + Nav + Footer with theme/locale/avatar) + Topbar
            (breadcrumb + actions slot) + main content. Try the collapse toggle
            (top-right of sidebar) and the theme/locale switchers in the footer.
          </p>
          <p className="text-sm text-fg-subtle">
            Current locale: <code className="rounded bg-bg-overlay px-2 py-0.5 font-mono">{locale}</code>
          </p>
        </header>

        <section className="grid grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-bg-elevated p-6">
            <ScoreRing score={92} size={120} />
            <span className="font-ui text-sm text-fg-muted">Latest audit</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-bg-elevated p-6">
            <ScoreRing score={78} size={120} />
            <span className="font-ui text-sm text-fg-muted">Last week avg</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-bg-elevated p-6">
            <ScoreRing score={58} size={120} />
            <span className="font-ui text-sm text-fg-muted">30-day low</span>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-bg-elevated p-6">
          <h2 className="mb-4 text-lg font-semibold">Filler content</h2>
          <div className="flex flex-col gap-3 font-ui text-sm text-fg-muted">
            <p>
              This page demonstrates the AppShell layout. The sidebar is sticky
              left, the topbar is sticky top, and this scroll region grows to
              fill available height.
            </p>
            <p>
              Sidebar admin section is hidden by default since the auth store
              is empty. Phase 5d will wire login → admin role toggles the
              Stats/Users/Rules entries.
            </p>
            <ul className="ml-6 list-disc">
              <li>Theme toggle (light / dark / system) — bottom of sidebar</li>
              <li>Locale switcher (VN / EN) — bottom of sidebar</li>
              <li>Collapse toggle — top-right of sidebar header</li>
              <li>Breadcrumb + action buttons — topbar</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
