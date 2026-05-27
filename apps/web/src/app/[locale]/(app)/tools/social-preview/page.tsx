"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToolShell } from "@/components/tools/tool-shell";
import { QuotaBanner } from "@/components/tools/quota-banner";
import {
  FacebookOgCard,
  TwitterCard,
  LinkedinOgCard,
} from "@/components/tools/social-cards";
import { useSocialPreview } from "@/lib/queries/use-tools";
import { useAuthStore } from "@/lib/auth/store";

export default function SocialPreviewPage() {
  const t = useTranslations("tools.socialPreview");
  const tc = useTranslations("tools.common");
  const authed = useAuthStore((s) => s.accessToken) !== null;
  const mutation = useSocialPreview();

  const [mode, setMode] = useState<"manual" | "url">("manual");
  const [manual, setManual] = useState({
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    ogSiteName: "",
    twitterImage: "",
  });
  const [fetchUrl, setFetchUrl] = useState("");

  const submit = () => {
    if (mode === "manual") mutation.mutate({ mode: "manual", ...manual, twitterCard: "summary_large_image" });
    else mutation.mutate({ mode: "url", fetchUrl });
  };

  const d = mutation.data?.data;
  const tab = (active: boolean) =>
    `rounded px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`;
  const field = (key: keyof typeof manual, label: string) => (
    <input
      className="w-full rounded border border-border bg-bg p-2 text-fg placeholder:text-fg-muted"
      placeholder={label}
      value={manual[key]}
      onChange={(e) => setManual({ ...manual, [key]: e.target.value })}
    />
  );

  return (
    <ToolShell title={t("title")} description={t("description")}>
      <ToolShell.Input>
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setMode("manual")} className={tab(mode === "manual")}>
            {tc("manual")}
          </button>
          <button type="button" onClick={() => setMode("url")} className={tab(mode === "url")}>
            {tc("fromUrl")}
          </button>
        </div>

        {mode === "manual" ? (
          <div className="space-y-3">
            {field("ogTitle", t("fieldOgTitle"))}
            {field("ogDescription", t("fieldOgDescription"))}
            {field("ogImage", t("fieldOgImage"))}
            {field("ogSiteName", t("fieldOgSiteName"))}
            {field("twitterImage", t("fieldTwitterImage"))}
          </div>
        ) : (
          <input
            className="w-full rounded border border-border bg-bg p-2 text-fg placeholder:text-fg-muted"
            placeholder={tc("urlPlaceholder")}
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
          />
        )}

        <button
          type="button"
          onClick={submit}
          disabled={mutation.isPending}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? tc("working") : tc("generate")}
        </button>
      </ToolShell.Input>

      <ToolShell.Result>
        {mode === "url" && <QuotaBanner meta={mutation.data?.meta} authenticated={authed} />}
        {d ? (
          <div className="space-y-6">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Facebook / LinkedIn</div>
              <FacebookOgCard
                title={d.ogTitle}
                description={d.ogDescription}
                image={d.ogImage}
                siteName={d.ogSiteName}
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">X / Twitter</div>
              <TwitterCard
                title={d.twitterTitle ?? d.ogTitle}
                description={d.twitterDescription ?? d.ogDescription}
                image={d.twitterImage ?? d.ogImage}
                siteName={d.ogSiteName}
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">LinkedIn</div>
              <LinkedinOgCard title={d.ogTitle} image={d.ogImage} siteName={d.ogSiteName} />
            </div>
            {mutation.data!.warnings.length > 0 && (
              <ul className="space-y-1 text-sm">
                {mutation.data!.warnings.map((w, i) => (
                  <li
                    key={i}
                    className={
                      w.severity === "error"
                        ? "text-destructive"
                        : w.severity === "warn"
                          ? "text-orange-600"
                          : "text-muted-foreground"
                    }
                  >
                    [{w.severity}] {w.field}: {w.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tc("empty")}</p>
        )}
        {mutation.error && <p className="mt-2 text-destructive">{tc("error")}</p>}
      </ToolShell.Result>
    </ToolShell>
  );
}
