"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToolShell } from "@/components/tools/tool-shell";
import { QuotaBanner } from "@/components/tools/quota-banner";
import { RobotsRulesTable } from "@/components/tools/robots-rules-table";
import { SitemapUrlTable } from "@/components/tools/sitemap-url-table";
import { useSitemapValidator } from "@/lib/queries/use-tools";
import { useAuthStore } from "@/lib/auth/store";

export default function SitemapValidatorPage() {
  const t = useTranslations("tools.sitemapValidator");
  const tc = useTranslations("tools.common");
  const authed = useAuthStore((s) => s.accessToken) !== null;
  const mutation = useSitemapValidator();

  const [siteUrl, setSiteUrl] = useState("");
  const [follow, setFollow] = useState(false);

  const submit = () => mutation.mutate({ siteUrl, options: { followSitemapIndex: follow } });
  const data = mutation.data?.data;

  return (
    <ToolShell title={t("title")} description={t("description")}>
      <ToolShell.Input>
        <div className="space-y-3">
          <input
            className="w-full rounded border border-border bg-bg p-2 text-fg placeholder:text-fg-muted"
            placeholder={tc("urlPlaceholder")}
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            {t("followIndex")}
          </label>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={mutation.isPending || !siteUrl}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? tc("working") : tc("analyze")}
        </button>
      </ToolShell.Input>

      <ToolShell.Result>
        <QuotaBanner meta={mutation.data?.meta} authenticated={authed} />
        {data ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 font-semibold">{t("robotsHeading")}</h3>
              <RobotsRulesTable robots={data.robots} />
            </section>

            <section>
              <h3 className="mb-2 font-semibold">{t("sitemapHeading")}</h3>
              {data.sitemap.type === "empty" && (
                <p className="text-sm text-muted-foreground">No valid sitemap found.</p>
              )}
              {data.sitemap.isIndex && data.sitemap.nestedSitemaps && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-3">Nested sitemap</th>
                      <th className="py-1">URLs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sitemap.nestedSitemaps.map((n, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="max-w-[320px] truncate py-1 pr-3 font-mono text-xs" title={n.url}>
                          {n.url}
                        </td>
                        <td className="py-1 text-xs">{n.urlCount || (follow ? 0 : "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {data.sitemap.type === "urlset" && data.sitemap.urls && (
                <>
                  {data.sitemap.truncated && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      {data.sitemap.totalUrls} URLs — showing first {data.sitemap.displayedUrls}.
                    </p>
                  )}
                  <SitemapUrlTable urls={data.sitemap.urls} />
                </>
              )}
            </section>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tc("empty")}</p>
        )}
        {mutation.error && <p className="mt-2 text-destructive">{tc("error")}</p>}
      </ToolShell.Result>
    </ToolShell>
  );
}
