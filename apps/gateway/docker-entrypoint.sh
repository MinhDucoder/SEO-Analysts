#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Running seed (idempotent)..."
node dist/prisma/seed.js || echo "[entrypoint] Seed skipped or already applied"

echo "[entrypoint] Starting application..."
exec node dist/main.js
