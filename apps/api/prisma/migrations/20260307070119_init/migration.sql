-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "provider_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "audit_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_results" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "category_scores" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "html_size" INTEGER NOT NULL,
    "response_time" INTEGER NOT NULL,
    "status_code" INTEGER NOT NULL,
    "extracted_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_jobs_url_created_at_idx" ON "audit_jobs"("url", "created_at");

-- CreateIndex
CREATE INDEX "audit_jobs_user_id_idx" ON "audit_jobs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_results_job_id_key" ON "audit_results"("job_id");

-- CreateIndex
CREATE INDEX "pages_job_id_idx" ON "pages"("job_id");

-- AddForeignKey
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "audit_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "audit_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
