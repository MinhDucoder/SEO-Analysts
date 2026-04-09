-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('meta', 'headings', 'images', 'links', 'performance', 'technical');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('pass', 'warn', 'fail');

-- CreateTable
CREATE TABLE "seo_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "weight" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "check_config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "seo_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "audit_id" UUID NOT NULL,
    "rule_id" VARCHAR(100) NOT NULL,
    "rule_name" VARCHAR(100) NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "weight" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "suggestion" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seo_rules_name_key" ON "seo_rules"("name");

-- CreateIndex
CREATE INDEX "idx_rules_category" ON "seo_rules"("category");

-- CreateIndex
CREATE INDEX "idx_rr_audit" ON "rule_results"("audit_id");

-- CreateIndex
CREATE INDEX "idx_rr_audit_status" ON "rule_results"("audit_id", "status");
