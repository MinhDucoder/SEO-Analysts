import { setRequestLocale } from "next-intl/server";
import {
  CategoryBars,
  CategoryRadar,
  CwvCard,
  KeywordTable,
  RuleResultRow,
  ScoreDelta,
  ScoreRing,
  StatusPipeline,
} from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Phase 5b smoke test — renders every domain component with sample data so
 * the visual fidelity vs Pencil can be verified in the browser. This route
 * will be removed once auth pages (Phase 5d) take over the root.
 *
 * Visit: /_showcase (VN default) or /en/_showcase (EN).
 */
export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categoryRows = [
    { label: "Meta", score: 92 },
    { label: "Headings", score: 85 },
    { label: "Images", score: 78 },
    { label: "Links", score: 91 },
    { label: "Performance", score: 72 },
    { label: "Technical", score: 88 },
  ];

  return (
    <main className="min-h-screen bg-bg p-8 font-ui text-fg">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Phase 5b — Domain Components</h1>
          <p className="text-base text-fg-muted">
            Smoke test for 8 reusable domain components from Pencil design system.
            Locale: <code className="rounded bg-bg-overlay px-2 py-0.5 font-mono text-xs">{locale}</code>
          </p>
        </header>

        {/* ScoreRing */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">ScoreRing/Lg</h2>
          <div className="flex flex-wrap items-center gap-8 rounded-lg border border-border bg-bg-elevated p-6">
            <ScoreRing score={92} />
            <ScoreRing score={78} />
            <ScoreRing score={58} />
            <ScoreRing score={29} />
            <ScoreRing score={null} />
          </div>
        </section>

        {/* ScoreDelta */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">ScoreDelta</h2>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-bg-elevated p-6">
            <ScoreDelta delta={5.2} />
            <ScoreDelta delta={12.7} />
            <ScoreDelta delta={-3.1} />
            <ScoreDelta delta={-8.4} />
            <ScoreDelta delta={0} />
            <ScoreDelta delta={null} />
          </div>
        </section>

        {/* CategoryBars */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">CategoryBars/Lg</h2>
          <div className="rounded-lg border border-border bg-bg-elevated p-6">
            <CategoryBars rows={categoryRows} />
          </div>
        </section>

        {/* CategoryRadar */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">CategoryRadar</h2>
          <div className="rounded-lg border border-border bg-bg-elevated p-6">
            <CategoryRadar data={categoryRows} />
          </div>
        </section>

        {/* CwvCard */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">CwvCard</h2>
          <CwvCard metrics={{ lcp: 2100, cls: 0.08, inp: 180 }} />
          <CwvCard
            metrics={{ lcp: 3400, cls: 0.18, inp: 320 }}
            show={["lcp", "cls", "inp", "fcp", "ttfb"]}
          />
        </section>

        {/* StatusPipeline */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">StatusPipeline</h2>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-elevated p-6">
            <StatusPipeline
              steps={[
                { key: "crawl", label: "Crawling", status: "active" },
                { key: "analyze", label: "Analyzing", status: "pending" },
                { key: "report", label: "Reporting", status: "pending" },
              ]}
            />
            <StatusPipeline
              steps={[
                { key: "crawl", label: "Crawling", status: "done" },
                { key: "analyze", label: "Analyzing", status: "active" },
                { key: "report", label: "Reporting", status: "pending" },
              ]}
            />
            <StatusPipeline
              steps={[
                { key: "crawl", label: "Crawling", status: "done" },
                { key: "analyze", label: "Analyzing", status: "done" },
                { key: "report", label: "Reporting", status: "done" },
              ]}
            />
            <StatusPipeline
              steps={[
                { key: "crawl", label: "Crawling", status: "done" },
                { key: "analyze", label: "Analyzing", status: "failed" },
                { key: "report", label: "Reporting", status: "pending" },
              ]}
            />
          </div>
        </section>

        {/* RuleResultRow */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">RuleResultRow</h2>
          <div className="flex flex-col gap-2">
            <RuleResultRow
              name="Title tag length is 50-60 characters"
              status="pass"
              weight={10}
              detail="Your title tag is 56 characters, which sits in the recommended 50-60 character window."
            />
            <RuleResultRow
              name="Meta description is present and 120-160 characters"
              status="warn"
              weight={5}
              detail="Meta description is 92 characters — consider expanding to 120-160 for richer SERP snippets."
            />
            <RuleResultRow
              name="All images have alt text"
              status="fail"
              weight={8}
              detail="15 of 42 images are missing alt text. Add descriptive alt text for accessibility and SEO."
            />
            <RuleResultRow name="Sitemap.xml present" status="skipped" weight={3} />
          </div>
        </section>

        {/* KeywordTable */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">KeywordTable</h2>
          <KeywordTable
            rows={[
              { keyword: "phân tích seo", inTitle: true, inH1: true, inMeta: true, inFirstParagraph: true },
              { keyword: "audit website", inTitle: true, inH1: false, inMeta: true, inFirstParagraph: true },
              { keyword: "tối ưu seo onpage", inTitle: false, inH1: true, inMeta: false, inFirstParagraph: false },
              { keyword: "core web vitals", inTitle: false, inH1: false, inMeta: false, inFirstParagraph: true },
            ]}
          />
        </section>

        {/* shadcn re-verification */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">shadcn primitives</h2>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-elevated p-6">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Badge variant="success">Success</Badge>
            <Badge variant="warn">Warn</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge>Muted</Badge>
          </div>
        </section>
      </div>
    </main>
  );
}
