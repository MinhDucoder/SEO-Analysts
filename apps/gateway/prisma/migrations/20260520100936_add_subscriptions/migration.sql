-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('free', 'pro', 'business');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'canceled');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('pending', 'paid', 'expired', 'failed');

-- DropForeignKey
ALTER TABLE "audit_alerts" DROP CONSTRAINT "audit_alerts_audit_id_fk";

-- DropForeignKey
ALTER TABLE "audit_alerts" DROP CONSTRAINT "audit_alerts_schedule_id_fk";

-- DropForeignKey
ALTER TABLE "page_audits" DROP CONSTRAINT "page_audits_audit_id_fk";

-- DropForeignKey
ALTER TABLE "scheduled_audits" DROP CONSTRAINT "scheduled_audits_user_id_fk";

-- AlterTable
ALTER TABLE "scheduled_audits" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "plans" (
    "code" "PlanCode" NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "price_vnd" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_code" "PlanCode" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "canceled_at" TIMESTAMPTZ,
    "granted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "plan_code" "PlanCode" NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "ref_code" VARCHAR(40) NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'pending',
    "vietqr_url" TEXT NOT NULL,
    "casso_txn_id" VARCHAR(64),
    "paid_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casso_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "casso_txn_id" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "matched_intent_id" UUID,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casso_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sub_expiry" ON "subscriptions"("expires_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_ref_code_key" ON "payment_intents"("ref_code");

-- CreateIndex
CREATE INDEX "idx_pi_ref" ON "payment_intents"("ref_code");

-- CreateIndex
CREATE INDEX "idx_pi_user_status" ON "payment_intents"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "casso_events_casso_txn_id_key" ON "casso_events"("casso_txn_id");

-- CreateIndex
CREATE INDEX "idx_casso_recv" ON "casso_events"("received_at");

-- AddForeignKey
ALTER TABLE "page_audits" ADD CONSTRAINT "page_audits_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_audits" ADD CONSTRAINT "scheduled_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_alerts" ADD CONSTRAINT "audit_alerts_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_alerts" ADD CONSTRAINT "audit_alerts_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "scheduled_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "usage_daily_key_date_uniq" RENAME TO "usage_daily_api_key_id_date_key";

-- Seed plans
INSERT INTO "plans" (code, display_name, price_vnd, sort_order, is_public, created_at, updated_at)
VALUES
  ('free',     'Cá nhân',         0,      1, true, NOW(), NOW()),
  ('pro',      'Chuyên nghiệp',   99000,  2, true, NOW(), NOW()),
  ('business', 'Doanh nghiệp',    299000, 3, true, NOW(), NOW());

-- Backfill Free subscription for every existing user
INSERT INTO "subscriptions" (id, user_id, plan_code, status, started_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  'free',
  'active',
  NOW(),
  NOW(),
  NOW()
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "subscriptions" s WHERE s.user_id = u.id
);
