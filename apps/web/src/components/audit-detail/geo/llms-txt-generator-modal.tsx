"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLlmsTxtGenerator } from "@/lib/queries/use-llms-txt-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LlmsTxtGeneratorModalProps {
  initialUrl: string;
  onClose: () => void;
}

export function LlmsTxtGeneratorModal({ initialUrl, onClose }: LlmsTxtGeneratorModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const mut = useLlmsTxtGenerator();
  const t = useTranslations("tools.llmsTxt");

  const handleGenerate = () => {
    mut.mutate({ url });
  };

  const handleCopy = () => {
    if (mut.data?.content) {
      navigator.clipboard.writeText(mut.data.content);
    }
  };

  const handleDownload = () => {
    if (!mut.data?.content) return;
    const blob = new Blob([mut.data.content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
    >
      <div className="relative bg-background border rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute top-4 right-4 text-fg-muted hover:text-fg"
        >
          ✕
        </button>

        <h3 className="text-lg font-semibold text-fg mb-1">{t("title")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("description")}</p>

        {/* URL input */}
        <div className="flex gap-2 mb-4">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1"
          />
          <Button onClick={handleGenerate} disabled={mut.isPending}>
            {mut.isPending ? "..." : t("cta")}
          </Button>
        </div>

        {/* Error */}
        {mut.isError && (
          <p className="text-sm text-red-600 mb-4">
            {mut.error instanceof Error ? mut.error.message : "Generation failed"}
          </p>
        )}

        {/* Result */}
        {mut.data && (
          <div className="space-y-3">
            <pre className="w-full max-h-64 font-mono text-xs bg-muted p-3 rounded overflow-auto whitespace-pre-wrap">
              {mut.data.content}
            </pre>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {t("copy")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                {t("download")}
              </Button>
            </div>
            {mut.data.warnings.length > 0 && (
              <ul className="text-xs text-amber-600 space-y-1">
                {mut.data.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
