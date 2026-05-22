"use client";

import type { FaviconCheckerResponse } from "@/lib/api/tools";

type Data = FaviconCheckerResponse["data"];

const COVERAGE_LABELS: Record<keyof Data["coverage"], string> = {
  hasBasic: "Basic favicon",
  hasAppleTouch: "Apple touch icon",
  hasManifest: "Web manifest",
  hasPwaSizes: "PWA sizes (192/512)",
  hasMaskIcon: "Safari mask icon",
};

export function FaviconGrid({ data }: { data: Data }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.icons.map((icon, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center">
              {icon.exists ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon.href} alt="" className="max-h-12 max-w-12" />
              ) : (
                <span className="text-destructive" title={`status ${icon.status}`}>
                  ✗
                </span>
              )}
            </div>
            <div className="mt-2 truncate text-xs font-medium" title={icon.rel ?? icon.source}>
              {icon.rel ?? icon.source}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {icon.size ? `${icon.size.width}×${icon.size.height}` : icon.format ?? "—"}
            </div>
          </div>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {(Object.keys(COVERAGE_LABELS) as Array<keyof Data["coverage"]>).map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span className={data.coverage[key] ? "text-green-700" : "text-muted-foreground"}>
              {data.coverage[key] ? "✓" : "✗"}
            </span>
            {COVERAGE_LABELS[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}
