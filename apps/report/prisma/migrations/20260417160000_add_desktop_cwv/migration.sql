-- Add desktop Lighthouse columns to report_cwv (F5 Sub-phase 1, part 2).
-- All new columns are NULLABLE so existing rows (written before F5) remain
-- valid and no backfill is required.

ALTER TABLE "report_cwv"
  ADD COLUMN "desktop_lcp_ms"                 DECIMAL(10, 2),
  ADD COLUMN "desktop_inp_ms"                 DECIMAL(10, 2),
  ADD COLUMN "desktop_cls"                    DECIMAL(5, 4),
  ADD COLUMN "desktop_performance_score"      INTEGER,
  ADD COLUMN "desktop_accessibility_score"    INTEGER,
  ADD COLUMN "desktop_best_practices_score"   INTEGER,
  ADD COLUMN "desktop_lighthouse_seo_score"   INTEGER;
