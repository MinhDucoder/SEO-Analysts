-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "audit_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "final_score" DECIMAL(5,2) NOT NULL,
    "classification" VARCHAR(20) NOT NULL,
    "total_issues" INTEGER NOT NULL,
    "critical_issues" INTEGER NOT NULL,
    "warn_issues" INTEGER NOT NULL,
    "pass_count" INTEGER NOT NULL,
    "analysis_snapshot" JSONB NOT NULL,
    "cwv_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_keywords" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "keyword" VARCHAR(255) NOT NULL,
    "frequency" INTEGER NOT NULL,
    "density_percent" DECIMAL(5,2) NOT NULL,
    "in_title" BOOLEAN NOT NULL,
    "in_h1" BOOLEAN NOT NULL,
    "in_first_paragraph" BOOLEAN NOT NULL,
    "in_meta_description" BOOLEAN NOT NULL,
    "rank" INTEGER NOT NULL,
    "is_target" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "report_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cwv" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "lcp_ms" DECIMAL(10,2) NOT NULL,
    "inp_ms" DECIMAL(10,2) NOT NULL,
    "cls" DECIMAL(5,4) NOT NULL,
    "performance_score" INTEGER NOT NULL,
    "accessibility_score" INTEGER NOT NULL,
    "best_practices_score" INTEGER NOT NULL,
    "lighthouse_seo_score" INTEGER NOT NULL,

    CONSTRAINT "report_cwv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "audit_id" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "accessed_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reports_audit_id_key" ON "reports"("audit_id");

-- CreateIndex
CREATE INDEX "idx_reports_domain" ON "reports"("domain");

-- CreateIndex
CREATE INDEX "idx_rk_report" ON "report_keywords"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_cwv_report_id_key" ON "report_cwv"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_report_id_key" ON "share_links"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "idx_sl_audit" ON "share_links"("audit_id");

-- AddForeignKey
ALTER TABLE "report_keywords" ADD CONSTRAINT "report_keywords_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cwv" ADD CONSTRAINT "report_cwv_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
