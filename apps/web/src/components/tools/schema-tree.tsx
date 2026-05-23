"use client";

import type { SchemaBlock } from "@/lib/api/tools";

function Badge({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {children}
    </span>
  );
}

function SchemaBlockCard({ block }: { block: SchemaBlock }) {
  const { errors, warnings } = block.validation;
  const valid = errors.length === 0;
  return (
    <details className="rounded border bg-card" open={!valid}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2">
        <span className="font-medium">{block.type}</span>
        {valid ? <Badge ok>Valid</Badge> : <Badge>{errors.length} error(s)</Badge>}
      </summary>
      <div className="space-y-2 px-3 pb-3">
        {errors.length > 0 && (
          <ul className="space-y-0.5 text-sm text-destructive">
            {errors.map((e, i) => (
              <li key={`e${i}`}>• {e}</li>
            ))}
          </ul>
        )}
        {warnings.length > 0 && (
          <ul className="space-y-0.5 text-sm text-orange-600">
            {warnings.map((w, i) => (
              <li key={`w${i}`}>• {w}</li>
            ))}
          </ul>
        )}
        <pre className="overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(block.raw, null, 2)}
        </pre>
      </div>
    </details>
  );
}

export function SchemaTree({ blocks }: { blocks: SchemaBlock[] }) {
  if (!blocks.length) {
    return <p className="text-sm text-muted-foreground">No JSON-LD blocks found.</p>;
  }
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <SchemaBlockCard key={i} block={b} />
      ))}
    </div>
  );
}
