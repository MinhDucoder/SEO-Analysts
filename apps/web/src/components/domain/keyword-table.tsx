import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface KeywordRow {
  keyword: string;
  inTitle: boolean;
  inH1: boolean;
  inMeta: boolean;
  inFirstParagraph: boolean;
}

export interface KeywordTableProps {
  rows: KeywordRow[];
  className?: string;
}

const COLUMNS: { key: keyof Omit<KeywordRow, "keyword">; label: string }[] = [
  { key: "inTitle", label: "Title" },
  { key: "inH1", label: "H1" },
  { key: "inMeta", label: "Meta" },
  { key: "inFirstParagraph", label: "First ¶" },
];

function BoolCell({ ok }: { ok: boolean }) {
  return (
    <td className="px-3 py-2 text-center">
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full",
          ok ? "bg-class-excellent/15 text-class-excellent" : "bg-class-poor/15 text-class-poor",
        )}
      >
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </span>
    </td>
  );
}

/**
 * Pencil Component/KeywordTable — keyword × {title/h1/meta/first-p} presence
 * matrix with check/cross badges per cell.
 */
export function KeywordTable({ rows, className }: KeywordTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border bg-bg-elevated", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-overlay">
            <th className="px-4 py-3 text-left font-ui font-semibold text-fg-muted">
              Keyword
            </th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className="px-3 py-3 text-center font-ui font-semibold text-fg-muted"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.keyword}-${i}`}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-4 py-2 font-ui text-fg">{row.keyword}</td>
              {COLUMNS.map((c) => (
                <BoolCell key={c.key} ok={row[c.key]} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
