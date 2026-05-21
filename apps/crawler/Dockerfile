# ─── Stage 1: Builder ───
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g turbo@^2

COPY package.json package-lock.json turbo.json ./
COPY apps/crawler/package.json apps/crawler/
COPY packages/shared/package.json packages/shared/
COPY packages/proto/package.json packages/proto/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/

RUN npm ci --ignore-scripts

COPY packages/shared/ packages/shared/
COPY packages/proto/ packages/proto/
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/crawler/ apps/crawler/

RUN npx turbo run build --filter=@seo/crawler

# Prune devDependencies for production
RUN npm prune --omit=dev

# ─── Stage 2: Production ───
# Use playwright base image (Debian-based, includes browsers + deps)
FROM mcr.microsoft.com/playwright:v1.50.0-noble AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
# GID/UID 1001 may already exist in the base image (Playwright noble drifted to
# claim it) — fall back to auto-assigned ids; downstream --chown uses names.
RUN (groupadd -g 1001 nodejs 2>/dev/null || groupadd nodejs) && \
    (useradd -m -u 1001 -g nodejs nestjs 2>/dev/null || useradd -m -g nodejs nestjs)

# Install Node.js 20 (playwright image may ship with different version)
# The playwright image already has node, verify version is compatible
RUN node --version

WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/proto ./packages/proto
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared

# Install playwright browsers in production image
RUN npx playwright install chromium --with-deps

USER nestjs

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 50052

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "const g=require('@grpc/grpc-js');const c=new g.Client('localhost:50052',g.credentials.createInsecure());c.waitForReady(Date.now()+3000,e=>{process.exit(e?1:0)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
