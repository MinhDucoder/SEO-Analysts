"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToolShell } from "@/components/tools/tool-shell";
import { QuotaBanner } from "@/components/tools/quota-banner";
import { GoogleSerpCard } from "@/components/tools/google-serp-card";
import { useGooglePreview } from "@/lib/queries/use-tools";
import { useAuthStore } from "@/lib/auth/store";

export default function GooglePreviewPage() {
  const t = useTranslations("tools.googlePreview");
  const tc = useTranslations("tools.common");
  const authed = useAuthStore((s) => s.accessToken) !== null;
  const mutation = useGooglePreview();

  const [mode, setMode] = useState<"manual" | "url">("manual");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [manual, setManual] = useState({
    url: "https://example.com/blog/post",
    title: "",
    description: "",
    faviconUrl: "",
  });
  const [fetchUrl, setFetchUrl] = useState("");

  const submit = () => {
    if (mode === "manual") mutation.mutate({ mode: "manual", ...manual });
    else mutation.mutate({ mode: "url", fetchUrl });
  };

  const result = mutation.data;
  const tab = (active: boolean) =>
    `rounded px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`;

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
            <input
              className="w-full rounded border p-2"
              placeholder={t("fieldUrl")}
              value={manual.url}
              onChange={(e) => setManual({ ...manual, url: e.target.value })}
            />
            <input
              className="w-full rounded border p-2"
              placeholder={t("fieldTitle")}
              value={manual.title}
              onChange={(e) => setManual({ ...manual, title: e.target.value })}
            />
            <textarea
              className="w-full rounded border p-2"
              placeholder={t("fieldDescription")}
              value={manual.description}
              onChange={(e) => setManual({ ...manual, description: e.target.value })}
            />
            <input
              className="w-full rounded border p-2"
              placeholder={t("fieldFavicon")}
              value={manual.faviconUrl}
              onChange={(e) => setManual({ ...manual, faviconUrl: e.target.value })}
            />
          </div>
        ) : (
          <input
            className="w-full rounded border p-2"
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
        {mode === "url" && <QuotaBanner meta={result?.meta} authenticated={authed} />}
        <div className="my-4 flex gap-2">
          <button type="button" onClick={() => setDevice("desktop")} className={tab(device === "desktop")}>
            {tc("desktop")}
          </button>
          <button type="button" onClick={() => setDevice("mobile")} className={tab(device === "mobile")}>
            {tc("mobile")}
          </button>
        </div>

        {result ? (
          <>
            <GoogleSerpCard
              title={result.data.title}
              description={result.data.description}
              displayUrl={result.data.displayUrl}
              faviconUrl={result.data.faviconUrl}
              device={device}
            />
            {result.warnings.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm">
                {result.warnings.map((w, i) => (
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{tc("empty")}</p>
        )}
        {mutation.error && <p className="mt-2 text-destructive">{tc("error")}</p>}
      </ToolShell.Result>
    </ToolShell>
  );
}
