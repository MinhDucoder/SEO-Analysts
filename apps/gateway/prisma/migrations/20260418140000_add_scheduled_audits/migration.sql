-- F2 Tier 1 Sub-phase 4. Scheduled audits + regression alerts.
--   * "AlertType" enum   — score_drop | new_issues | site_down
--   * "scheduled_audits" — one row per user recurring audit config
--   * "audit_alerts"     — emitted by the regression detector when
--                          a scheduled audit reports a worse score
--
-- Both tables cascade-delete on user/audit removal. Existing rows are
-- unaffected: this migration is purely additive (no existing columns
-- touched), safe to apply with zero downtime.

CREATE TYPE "AlertType" AS ENUM ('score_drop', 'new_issues', 'site_down');

CREATE TABLE "scheduled_audits" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        UUID NOT NULL,
  "url"            TEXT NOT NULL,
  "cron"           VARCHAR(255) NOT NULL,
  "mode"           "AuditMode" NOT NULL DEFAULT 'single',
  "max_urls"       INTEGER,
  "target_keyword" VARCHAR(255),
  "last_run_at"    TIMESTAMPTZ,
  "last_score"     INTEGER,
  "is_active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "scheduled_audits_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_scheduled_audits_user"    ON "scheduled_audits"("user_id");
CREATE INDEX "idx_scheduled_audits_active"  ON "scheduled_audits"("is_active");

CREATE TABLE "audit_alerts" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "audit_id"    UUID NOT NULL,
  "schedule_id" UUID,
  "type"        "AlertType" NOT NULL,
  "delta_score" INTEGER,
  "message"     TEXT NOT NULL,
  "sent_at"     TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "audit_alerts_audit_id_fk"
    FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE,
  CONSTRAINT "audit_alerts_schedule_id_fk"
    FOREIGN KEY ("schedule_id") REFERENCES "scheduled_audits"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_audit_alerts_audit"    ON "audit_alerts"("audit_id");
CREATE INDEX "idx_audit_alerts_schedule" ON "audit_alerts"("schedule_id");
CREATE INDEX "idx_audit_alerts_created"  ON "audit_alerts"("created_at");
