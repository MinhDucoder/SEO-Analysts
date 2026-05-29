"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LlmsTxtGeneratorModal } from "@/components/audit-detail/geo/llms-txt-generator-modal";

export default function LlmsTxtGeneratorPage() {
  const [modalOpen, setModalOpen] = useState(true);
  const [url, setUrl] = useState("https://example.com");
  const t = useTranslations("tools.llmsTxt");

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold text-fg mb-2">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("description")}</p>

      {!modalOpen && (
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded font-medium"
          onClick={() => setModalOpen(true)}
        >
          {t("cta")}
        </button>
      )}

      {modalOpen && (
        <LlmsTxtGeneratorModal
          initialUrl={url}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
