# ─── Stage 1: Builder ───
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g turbo@^2

COPY package.json package-lock.json turbo.json ./
COPY apps/keyword-analyzer/package.json apps/keyword-analyzer/
COPY packages/shared/package.json packages/shared/
COPY packages/proto/package.json packages/proto/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/

RUN npm ci --ignore-scripts

COPY packages/shared/ packages/shared/
COPY packages/proto/ packages/proto/
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/keyword-analyzer/ apps/keyword-analyzer/

RUN npx turbo run build --filter=@seo/keyword-analyzer

# ─── Stage 2: Production ───
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/apps/keyword-analyzer/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/keyword-analyzer/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/keyword-analyzer/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/proto ./packages/proto
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared

USER nestjs

ENV NODE_ENV=production

EXPOSE 50054

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const g=require('@grpc/grpc-js');const c=new g.Client('localhost:50054',g.credentials.createInsecure());c.waitForReady(Date.now()+3000,e=>{process.exit(e?1:0)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
