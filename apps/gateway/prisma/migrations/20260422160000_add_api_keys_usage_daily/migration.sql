-- CreateEnum
CREATE TYPE "ApiKeyEnvironment" AS ENUM ('live', 'test');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "hashed_key" VARCHAR(64) NOT NULL,
    "environment" "ApiKeyEnvironment" NOT NULL DEFAULT 'live',
    "last_used_at" TIMESTAMPTZ,
    "last_used_ip" INET,
    "revoked_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_daily" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_key_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "llm_calls" INTEGER NOT NULL DEFAULT 0,
    "llm_tokens_in" INTEGER NOT NULL DEFAULT 0,
    "llm_tokens_out" INTEGER NOT NULL DEFAULT 0,
    "bytes_in" INTEGER NOT NULL DEFAULT 0,
    "bytes_out" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "cache_hits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_hashed_key_key" ON "api_keys"("hashed_key");

-- CreateIndex
CREATE INDEX "idx_api_keys_hashed_key" ON "api_keys"("hashed_key");

-- CreateIndex
CREATE INDEX "idx_api_keys_user_active" ON "api_keys"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "idx_usage_daily_date" ON "usage_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "usage_daily_key_date_uniq" ON "usage_daily"("api_key_id", "date");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_daily" ADD CONSTRAINT "usage_daily_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
