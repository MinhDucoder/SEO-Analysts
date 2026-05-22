"use client";

import { useMemo, useState } from "react";
import type { SitemapUrlEntry } from "@/lib/api/tools";

const PAGE_SIZE = 50;

export function SitemapUrlTable({ urls }: { urls: SitemapUrlEntry[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => urls.filter((u) => u.loc.toLowerCase().includes(query.toLowerCase())),
    [urls, query],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="Filter URLs…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-1 pr-3">URL</th>
            <th className="py-1 pr-3">lastmod</th>
            <th className="py-1 pr-3">changefreq</th>
            <th className="py-1 pr-3">priority</th>
            <th className="py-1">valid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u, i) => (
            <tr key={i} className="border-b last:border-0 align-top">
              <td className="max-w-[280px] truncate py-1 pr-3 font-mono text-xs" title={u.loc}>
                {u.loc}
              </td>
              <td className="py-1 pr-3 text-xs">{u.lastmod ?? "—"}</td>
              <td className="py-1 pr-3 text-xs">{u.changefreq ?? "—"}</td>
              <td className="py-1 pr-3 text-xs">{u.priority ?? "—"}</td>
              <td className="py-1">
                {u.isValid ? (
                  <span className="text-green-700">✓</span>
                ) : (
                  <span className="text-destructive" title={u.errors.join("; ")}>
                    ✗
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} URLs</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={current === 0}
          >
            Prev
          </button>
          <span>
            {current + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={current >= pageCount - 1}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
