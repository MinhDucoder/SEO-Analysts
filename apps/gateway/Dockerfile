# ─── Stage 1: Builder ───
FROM node:20-alpine AS builder

WORKDIR /app

# Install turbo globally for monorepo filtering
RUN npm install -g turbo@^2

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./

# Copy workspace package.json files for dependency resolution
COPY apps/gateway/package.json apps/gateway/
COPY packages/shared/package.json packages/shared/
COPY packages/proto/package.json packages/proto/
COPY packages/seo-ai-core/package.json packages/seo-ai-core/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/

# Install all dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/proto/ packages/proto/
COPY packages/seo-ai-core/ packages/seo-ai-core/
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/gateway/ apps/gateway/

# Generate Prisma client
RUN cd apps/gateway && npx prisma generate

# Build the gateway
RUN npx turbo run build --filter=@seo/gateway

# Prune devDependencies for production
RUN npm prune --omit=dev

# ─── Stage 2: Production ───
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

# Copy built output
COPY --from=builder --chown=nestjs:nodejs /app/apps/gateway/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/gateway/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/gateway/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/gateway/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/proto ./packages/proto
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=nestjs:nodejs /app/packages/seo-ai-core ./packages/seo-ai-core
COPY --from=builder --chown=nestjs:nodejs /app/apps/gateway/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nestjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000 50051

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
