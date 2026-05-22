"use client";

import type { SitemapValidatorResponse } from "@/lib/api/tools";

type Robots = SitemapValidatorResponse["data"]["robots"];

export function RobotsRulesTable({ robots }: { robots: Robots }) {
  if (!robots.exists) {
    return <p className="text-sm text-muted-foreground">No robots.txt found at {robots.url}.</p>;
  }
  return (
    <div className="space-y-3">
      {robots.rules.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 pr-3">User-agent</th>
              <th className="py-1 pr-3">Rule</th>
              <th className="py-1">Path</th>
            </tr>
          </thead>
          <tbody>
            {robots.rules.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1 pr-3 font-mono text-xs">{r.userAgent}</td>
                <td className="py-1 pr-3">
                  <span className={r.type === "disallow" ? "text-destructive" : "text-green-700"}>
                    {r.type}
                  </span>
                </td>
                <td className="py-1 font-mono text-xs">{r.value || "/"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">No allow/disallow rules.</p>
      )}

      {robots.sitemaps.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Sitemaps: {robots.sitemaps.join(", ")}
        </div>
      )}
      {robots.syntaxErrors.length > 0 && (
        <ul className="space-y-0.5 text-xs text-orange-600">
          {robots.syntaxErrors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
