-- F1 Tier 1 Sub-phase 2. Adds site-wide audit schema:
--   * "AuditMode" enum: 'single' | 'site'
--   * audits.mode column (default 'single' — existing rows stay valid)
--   * audits.discovered_urls_count / audited_urls_count counters
--   * "page_audits" table — one row per URL crawled in a site-mode audit

CREATE TYPE "AuditMode" AS ENUM ('single', 'site');

ALTER TABLE "audits"
  ADD COLUMN "mode" "AuditMode" NOT NULL DEFAULT 'single',
  ADD COLUMN "discovered_urls_count" INTEGER,
  ADD COLUMN "audited_urls_count" INTEGER;

CREATE TABLE "page_audits" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "audit_id"   UUID NOT NULL,
  "url"        TEXT NOT NULL,
  "score"      INTEGER NOT NULL,
  "issues"     JSONB NOT NULL DEFAULT '[]',
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "page_audits_audit_id_fk"
    FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_page_audits_audit" ON "page_audits"("audit_id");
CREATE INDEX "idx_page_audits_score" ON "page_audits"("score");
