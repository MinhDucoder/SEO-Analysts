"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToolShell } from "@/components/tools/tool-shell";
import { QuotaBanner } from "@/components/tools/quota-banner";
import { FaviconGrid } from "@/components/tools/favicon-grid";
import { useFaviconChecker } from "@/lib/queries/use-tools";
import { useAuthStore } from "@/lib/auth/store";

export default function FaviconCheckerPage() {
  const t = useTranslations("tools.faviconChecker");
  const tc = useTranslations("tools.common");
  const authed = useAuthStore((s) => s.accessToken) !== null;
  const mutation = useFaviconChecker();

  const [url, setUrl] = useState("");
  const submit = () => mutation.mutate({ url });
  const data = mutation.data?.data;

  return (
    <ToolShell title={t("title")} description={t("description")}>
      <ToolShell.Input>
        <input
          className="w-full rounded border p-2"
          placeholder={tc("urlPlaceholder")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          onClick={submit}
          disabled={mutation.isPending || !url}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? tc("working") : tc("analyze")}
        </button>
      </ToolShell.Input>

      <ToolShell.Result>
        <QuotaBanner meta={mutation.data?.meta} authenticated={authed} />
        {data ? (
          <FaviconGrid data={data} />
        ) : (
          <p className="text-sm text-muted-foreground">{tc("empty")}</p>
        )}
        {mutation.error && <p className="mt-2 text-destructive">{tc("error")}</p>}
      </ToolShell.Result>
    </ToolShell>
  );
}
