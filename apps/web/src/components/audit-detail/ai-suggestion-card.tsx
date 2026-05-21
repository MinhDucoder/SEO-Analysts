import * as React from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReportAiSuggestion } from "@/lib/api/types";

export interface AiSuggestionCardProps {
  suggestion: ReportAiSuggestion | undefined;
  status?: "ready" | "loading";
}

export function AiSuggestionCard({
  suggestion,
  status = "ready",
}: AiSuggestionCardProps): React.ReactElement | null {
  if (status === "loading") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-sm text-accent">
        <Sparkles className="h-4 w-4 animate-pulse" aria-hidden />
        <span>AI đang phân tích...</span>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        <Badge variant="info">AI Gợi ý</Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            Vì sao
          </div>
          <p className="mt-0.5 text-fg">{suggestion.explanation}</p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            Sửa thế nào
          </div>
          <p className="mt-0.5 text-fg">{suggestion.actionableFix}</p>
        </div>
      </div>
    </div>
  );
}
