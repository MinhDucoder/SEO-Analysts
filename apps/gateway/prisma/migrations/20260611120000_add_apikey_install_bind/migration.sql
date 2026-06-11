-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN "install_id" VARCHAR(36);
ALTER TABLE "api_keys" ADD COLUMN "install_bound_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "idx_api_keys_install_id" ON "api_keys"("install_id");
