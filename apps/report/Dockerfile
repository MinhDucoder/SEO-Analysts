# ─── Stage 1: Builder ───
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g turbo@^2

COPY package.json package-lock.json turbo.json ./
COPY apps/report/package.json apps/report/
COPY packages/shared/package.json packages/shared/
COPY packages/proto/package.json packages/proto/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/

RUN npm ci --ignore-scripts

COPY packages/shared/ packages/shared/
COPY packages/proto/ packages/proto/
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/report/ apps/report/

RUN cd apps/report && npx prisma generate
RUN npx turbo run build --filter=@seo/report

# Prune devDependencies for production
RUN npm prune --omit=dev

# ─── Stage 2: Production ───
FROM mcr.microsoft.com/playwright:v1.50.0-noble AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/apps/report/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/report/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/report/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/report/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/proto ./packages/proto
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=nestjs:nodejs /app/apps/report/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Install playwright browsers in production image
RUN npx playwright install chromium --with-deps

USER nestjs

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 3004 50055

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
