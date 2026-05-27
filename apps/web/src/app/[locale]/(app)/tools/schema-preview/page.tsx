"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToolShell } from "@/components/tools/tool-shell";
import { QuotaBanner } from "@/components/tools/quota-banner";
import { SchemaTree } from "@/components/tools/schema-tree";
import { useSchemaPreview } from "@/lib/queries/use-tools";
import { useAuthStore } from "@/lib/auth/store";

export default function SchemaPreviewPage() {
  const t = useTranslations("tools.schemaPreview");
  const tc = useTranslations("tools.common");
  const authed = useAuthStore((s) => s.accessToken) !== null;
  const mutation = useSchemaPreview();

  const [mode, setMode] = useState<"paste" | "url">("paste");
  const [raw, setRaw] = useState("");
  const [fetchUrl, setFetchUrl] = useState("");

  const submit = () => {
    if (mode === "paste") mutation.mutate({ mode: "paste", raw });
    else mutation.mutate({ mode: "url", fetchUrl });
  };

  const data = mutation.data?.data;
  const tab = (active: boolean) =>
    `rounded px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`;

  return (
    <ToolShell title={t("title")} description={t("description")}>
      <ToolShell.Input>
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setMode("paste")} className={tab(mode === "paste")}>
            {tc("paste")}
          </button>
          <button type="button" onClick={() => setMode("url")} className={tab(mode === "url")}>
            {tc("fromUrl")}
          </button>
        </div>

        {mode === "paste" ? (
          <textarea
            className="h-64 w-full rounded border border-border bg-bg p-2 text-fg placeholder:text-fg-muted font-mono text-xs"
            placeholder={t("rawPlaceholder")}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        ) : (
          <input
            className="w-full rounded border border-border bg-bg p-2 text-fg placeholder:text-fg-muted"
            placeholder={tc("urlPlaceholder")}
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
          />
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? tc("working") : tc("analyze")}
          </button>
          {mode === "url" && fetchUrl && (
            <a
              href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(fetchUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {t("richResults")}
            </a>
          )}
        </div>
      </ToolShell.Input>

      <ToolShell.Result>
        {mode === "url" && <QuotaBanner meta={mutation.data?.meta} authenticated={authed} />}
        {data ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {data.summary.totalBlocks} blocks · {data.summary.validBlocks} {t("valid")} ·{" "}
              {data.summary.invalidBlocks} {t("invalid")}
            </div>
            <SchemaTree blocks={data.blocks} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tc("empty")}</p>
        )}
        {mutation.error && <p className="mt-2 text-destructive">{tc("error")}</p>}
      </ToolShell.Result>
    </ToolShell>
  );
}
