# Plan 7: Integration — Pipeline Wiring & E2E Testing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 5 NestJS services into a working end-to-end pipeline. Fix event channel mismatches discovered between services, create production-grade Dockerfiles for each service, update docker-compose.yml to run all 9 containers, and validate the full `POST /audits` flow from submission to completed report via an E2E smoke test.

**Architecture:** The pipeline is event-driven (BullMQ queues + Redis Pub/Sub). Gateway enqueues `crawl.start`, Crawler fans out to `analyze.start` + `keyword.start` (parallel choreography), Report waits for both via Redis INCR counter, then runs `report.start`. Gateway listens to Redis Pub/Sub channels for progress updates and final completion via Socket.IO.

**Tech Stack:** Docker (multi-stage builds, node:20-alpine), Docker Compose, BullMQ 5, Redis 7 Pub/Sub, Playwright (Crawler + Report), Shell scripting (E2E smoke test)

**Reference Spec:** `docs/superpowers/specs/2026-04-09-microservices-architecture-design.md` (Sections 3.1-3.6)

**Dependencies:** Plans 1-6 must be complete. All 5 services must have passing unit + integration tests.

---

## Known Wiring Issues (discovered by reading source code)

Before building containers, these event channel mismatches must be fixed:

| Issue | Source | Target | Problem |
|-------|--------|--------|---------|
| **Keyword channel mismatch** | `apps/keyword-analyzer/src/keyword/event.publisher.ts` publishes to channel `'events'` with `type: 'keyword.done'` | `apps/report/src/report/keyword-done.listener.ts` subscribes to channel `'keyword.done'` | Different channels. Report will never receive keyword.done events. |
| **No `report.done` -> `audit.completed` bridge** | `apps/report/src/report/report.service.ts` publishes to `'report.done'` | `apps/gateway/src/websocket/progress-subscriber.service.ts` subscribes to `'audit.completed'` | Gateway never learns the pipeline finished. Need Report to publish `audit.completed` after `report.done`, OR Gateway to also subscribe to `report.done`. |
| **Keyword worker missing `url` field** | Crawler worker sends `{ auditId, textContent, title, metaDescription, h1Tags, targetKeyword }` in keyword.start job | Keyword worker expects `{ auditId, url, textContent, title, h1Text, metaDescription, targetKeyword, language }` | Field name mismatch: `h1Tags` vs `h1Text`. Also `url` is not passed from Crawler. |
| **Analyzer uses raw Redis, others use RedisService** | `apps/seo-analyzer/src/analyzer/analyzer.worker.ts` creates its own `new Redis()` instance | Other services use injected `RedisService` | Inconsistent. Works but fragile when env vars differ. Should use injected service. |

---

## File Structure

```
seo-platform/
├── apps/
│   ├── gateway/
│   │   └── Dockerfile                    # NEW: multi-stage build
│   ├── crawler/
│   │   └── Dockerfile                    # NEW: multi-stage + Playwright/Chromium
│   ├── seo-analyzer/
│   │   └── Dockerfile                    # NEW: multi-stage build
│   ├── keyword-analyzer/
│   │   └── Dockerfile                    # NEW: multi-stage build
│   └── report/
│       └── Dockerfile                    # NEW: multi-stage + Playwright for PDF
├── docker-compose.yml                    # MODIFY: add 5 service containers
├── scripts/
│   └── e2e-smoke-test.sh                 # NEW: full pipeline E2E test
└── .dockerignore                         # NEW: shared ignore patterns
```

---

## Task 1: Fix Keyword Event Channel Mismatch

**Files:**
- Modify: `apps/keyword-analyzer/src/keyword/event.publisher.ts`

- [ ] **Step 1: Change publish channel from `'events'` to `'keyword.done'`**

The keyword EventPublisher currently publishes to a generic `'events'` channel with a `type` field, but the Report service's `KeywordDoneListener` subscribes to the `'keyword.done'` channel directly (matching the Analyzer pattern which publishes to `'analyze.done'`).

In `apps/keyword-analyzer/src/keyword/event.publisher.ts`, replace the `publishDone` method:

```typescript
  /**
   * Publishes the `keyword.done` event on the `keyword.done` Pub/Sub channel.
   * Report service's KeywordDoneListener subscribes to this channel.
   */
  async publishDone(event: KeywordDoneEvent): Promise<void> {
    const message = JSON.stringify(event);
    const subs = await this.client.publish('keyword.done', message);
    this.logger.log(`Published keyword.done audit=${event.auditId} status=${event.status} subscribers=${subs}`);
  }
```

Key changes:
- Channel: `'events'` -> `'keyword.done'` (matches what `KeywordDoneListener` subscribes to)
- Payload: Remove the `type: 'keyword.done'` wrapper, send the `KeywordDoneEvent` directly (Report listener parses `auditId` from root)

- [ ] **Step 2: Verify keyword.done listener parses correctly**

Open `apps/report/src/report/keyword-done.listener.ts` and confirm the listener parses `auditId` from the root of the JSON payload. The current code does:

```typescript
const payload = JSON.parse(raw) as { auditId?: string };
```

This will work correctly with the new payload shape `{ auditId, status, error? }`.

No changes needed in the listener.

- [ ] **Step 3: Run keyword-analyzer tests**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
npx turbo run test --filter=@seo/keyword-analyzer
```

- [ ] **Step 4: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add apps/keyword-analyzer/src/keyword/event.publisher.ts
git commit -m "fix: keyword publisher uses correct 'keyword.done' channel (was 'events')"
```

---

## Task 2: Fix Keyword Job Payload Field Mismatch

**Files:**
- Modify: `apps/crawler/src/crawler/crawler.worker.ts`

- [ ] **Step 1: Fix field names in keyword.start job payload**

The Crawler worker sends `h1Tags` but the Keyword worker expects `h1Text`. Also, `url` is not forwarded.

In `apps/crawler/src/crawler/crawler.worker.ts`, update the keyword queue `add()` call inside the `Promise.all` block:

```typescript
        this.keywordQueue.add(
          'keyword',
          {
            auditId,
            url,
            textContent: result.pageData.textContent,
            title: result.pageData.title,
            h1Text: result.pageData.h1Tags?.[0] ?? '',
            metaDescription: result.pageData.metaDescription,
            targetKeyword,
          },
          { removeOnComplete: true, removeOnFail: false },
        ),
```

Changes:
- Added `url` field (from the job's input data)
- Renamed `h1Tags` -> `h1Text` with `?.[0] ?? ''` to convert string array to single string (Keyword worker expects a single string, not an array)
- Removed redundant `textContent` alias (it was already `result.pageData.textContent`)

- [ ] **Step 2: Run crawler tests**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
npx turbo run test --filter=@seo/crawler
```

- [ ] **Step 3: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add apps/crawler/src/crawler/crawler.worker.ts
git commit -m "fix: crawler sends correct field names (url, h1Text) in keyword.start payload"
```

---

## Task 3: Bridge report.done to audit.completed for Gateway

**Files:**
- Modify: `apps/report/src/report/report.service.ts`

- [ ] **Step 1: Publish `audit.completed` after `report.done`**

The Gateway's `ProgressSubscriberService` subscribes to `'audit.completed'` to mark the audit as completed and emit Socket.IO events. The Report service currently publishes `'report.done'` but nobody translates that to `'audit.completed'`.

In `apps/report/src/report/report.service.ts`, in the `persistAndPublish` method, add an `audit.completed` publish after the existing `report.done` publish:

```typescript
  private async persistAndPublish(input: GenerateDirectInput) {
    const aggregated = this.aggregator.aggregate({
      auditId: input.auditId,
      url: input.url,
      domain: input.domain,
      analyze: input.analyze,
      keywords: input.keywords,
      cwv: input.cwv,
    });

    const report = await this.repo.createFullReport({
      auditId: input.auditId,
      aggregated,
      keywords: input.keywords.keywords,
      cwv: input.cwv,
    });

    // Publish report.done (for any service that cares about report lifecycle)
    const reportEvent = {
      auditId: input.auditId,
      reportId: report.id,
      finalScore: aggregated.finalScore,
      classification: aggregated.classification,
    };
    await this.redis.client().publish('report.done', JSON.stringify(reportEvent));
    this.logger.log(`report.done published for ${input.auditId} (reportId=${report.id})`);

    // Publish audit.completed (Gateway listens to this to update audit status + Socket.IO)
    const completedEvent = {
      auditId: input.auditId,
      finalScore: aggregated.finalScore,
      reportId: report.id,
      classification: aggregated.classification,
    };
    await this.redis.client().publish('audit.completed', JSON.stringify(completedEvent));
    this.logger.log(`audit.completed published for ${input.auditId}`);

    return report;
  }
```

- [ ] **Step 2: Also publish `audit.failed` on report failure**

In `apps/report/src/report/report.worker.ts`, add a failure handler that publishes `audit.failed`:

```typescript
  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error(`report.start ${job?.id} failed: ${err.message}`);
    if (job?.data?.auditId) {
      await this.redis.client().publish(
        'audit.failed',
        JSON.stringify({
          auditId: job.data.auditId,
          error: `Report generation failed: ${err.message}`,
        }),
      );
    }
  }
```

Note: Change `onFailed` from sync `void` to `async Promise<void>` since it now does async work.

- [ ] **Step 3: Run report tests**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
npx turbo run test --filter=@seo/report
```

- [ ] **Step 4: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add apps/report/src/report/report.service.ts apps/report/src/report/report.worker.ts
git commit -m "fix: report service publishes audit.completed so gateway updates status"
```

---

## Task 4: Create .dockerignore and Dockerfiles for Gateway, SEO Analyzer, Keyword Analyzer

**Files:**
- Create: `.dockerignore`
- Create: `apps/gateway/Dockerfile`
- Create: `apps/seo-analyzer/Dockerfile`
- Create: `apps/keyword-analyzer/Dockerfile`

- [ ] **Step 1: Create root `.dockerignore`**

Create `.dockerignore` in the project root:

```dockerignore
node_modules
.git
.gitignore
*.md
.env
.env.*
!.env.example
dist
coverage
.turbo
.next
.cache
*.log
.vscode
.idea
```

- [ ] **Step 2: Create Gateway Dockerfile**

Create `apps/gateway/Dockerfile`:

```dockerfile
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
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/

# Install all dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/proto/ packages/proto/
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/gateway/ apps/gateway/

# Generate Prisma client
RUN cd apps/gateway && npx prisma generate

# Build the gateway
RUN npx turbo run build --filter=@seo/gateway

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

USER nestjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000 50051

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

- [ ] **Step 3: Create SEO Analyzer Dockerfile**

Create `apps/seo-analyzer/Dockerfile`:

```dockerfile
# ─── Stage 1: Builder ───
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g turbo@^2

COPY package.json package-lock.json turbo.json ./
COPY apps/seo-analyzer/package.json apps/seo-analyzer/
COPY packages/shared/package.json packages/shared/
COPY packages/proto/package.json packages/proto/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/

RUN npm ci --ignore-scripts

COPY packages/shared/ packages/shared/
COPY packages/proto/ packages/proto/
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/seo-analyzer/ apps/seo-analyzer/

RUN cd apps/seo-analyzer && npx prisma generate
RUN npx turbo run build --filter=@seo/seo-analyzer

# ─── Stage 2: Production ───
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/apps/seo-analyzer/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/seo-analyzer/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/seo-analyzer/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/seo-analyzer/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/proto ./packages/proto
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared

USER nestjs

ENV NODE_ENV=production

EXPOSE 50053

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const g=require('@grpc/grpc-js');const c=new g.Client('localhost:50053',g.credentials.createInsecure());c.waitForReady(Date.now()+3000,e=>{process.exit(e?1:0)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

- [ ] **Step 4: Create Keyword Analyzer Dockerfile**

Create `apps/keyword-analyzer/Dockerfile`:

```dockerfile
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
```

- [ ] **Step 5: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add .dockerignore apps/gateway/Dockerfile apps/seo-analyzer/Dockerfile apps/keyword-analyzer/Dockerfile
git commit -m "build: add Dockerfiles for gateway, seo-analyzer, keyword-analyzer"
```

---

## Task 5: Create Dockerfiles for Crawler and Report (Playwright)

**Files:**
- Create: `apps/crawler/Dockerfile`
- Create: `apps/report/Dockerfile`

Both services need Playwright with Chromium installed in the Docker image. Crawler uses it for JavaScript-rendered pages and Lighthouse. Report uses it for PDF generation.

- [ ] **Step 1: Create Crawler Dockerfile**

Create `apps/crawler/Dockerfile`:

```dockerfile
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

# ─── Stage 2: Production ───
# Use playwright base image (Debian-based, includes browsers + deps)
FROM mcr.microsoft.com/playwright:v1.50.0-noble AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

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
RUN npx playwright install chromium --with-deps 2>/dev/null || true

USER nestjs

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 50052

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "const g=require('@grpc/grpc-js');const c=new g.Client('localhost:50052',g.credentials.createInsecure());c.waitForReady(Date.now()+3000,e=>{process.exit(e?1:0)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: Create Report Dockerfile**

Create `apps/report/Dockerfile`:

```dockerfile
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

# Install playwright browsers in production image
RUN npx playwright install chromium --with-deps 2>/dev/null || true

USER nestjs

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 3004 50055

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

- [ ] **Step 3: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add apps/crawler/Dockerfile apps/report/Dockerfile
git commit -m "build: add Dockerfiles for crawler and report (with Playwright/Chromium)"
```

---

## Task 6: Update docker-compose.yml — Add 5 Service Containers

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add all 5 NestJS service containers**

Replace `docker-compose.yml` with:

```yaml
services:
  # ─── Infrastructure ───

  gateway-db:
    image: postgres:16-alpine
    container_name: seo-gateway-db
    environment:
      POSTGRES_USER: gateway_user
      POSTGRES_PASSWORD: gateway_pass
      POSTGRES_DB: seo_gateway
    ports:
      - "5432:5432"
    volumes:
      - gateway_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gateway_user -d seo_gateway"]
      interval: 5s
      timeout: 5s
      retries: 5

  analyzer-db:
    image: postgres:16-alpine
    container_name: seo-analyzer-db
    environment:
      POSTGRES_USER: analyzer_user
      POSTGRES_PASSWORD: analyzer_pass
      POSTGRES_DB: seo_analyzer
    ports:
      - "5433:5432"
    volumes:
      - analyzer_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U analyzer_user -d seo_analyzer"]
      interval: 5s
      timeout: 5s
      retries: 5

  report-db:
    image: postgres:16-alpine
    container_name: seo-report-db
    environment:
      POSTGRES_USER: report_user
      POSTGRES_PASSWORD: report_pass
      POSTGRES_DB: seo_report
    ports:
      - "5434:5432"
    volumes:
      - report_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U report_user -d seo_report"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: seo-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ─── Application Services ───

  gateway:
    build:
      context: .
      dockerfile: apps/gateway/Dockerfile
    container_name: seo-gateway
    ports:
      - "3000:3000"
      - "50051:50051"
    environment:
      NODE_ENV: production
      PORT: "3000"
      GRPC_PORT: "50051"
      DATABASE_URL: "postgresql://gateway_user:gateway_pass@gateway-db:5432/seo_gateway"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      JWT_SECRET: "dev-jwt-secret-change-in-production"
      JWT_REFRESH_SECRET: "dev-refresh-secret-change-in-production"
      FRONTEND_URL: "http://localhost:3001"
      CRAWLER_GRPC_URL: "crawler:50052"
      ANALYZER_GRPC_URL: "seo-analyzer:50053"
      KEYWORD_GRPC_URL: "keyword-analyzer:50054"
      REPORT_GRPC_URL: "report:50055"
      GOOGLE_CLIENT_ID: ""
      GOOGLE_CLIENT_SECRET: ""
      GOOGLE_CALLBACK_URL: "http://localhost:3000/api/v1/auth/google/callback"
    depends_on:
      gateway-db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  crawler:
    build:
      context: .
      dockerfile: apps/crawler/Dockerfile
    container_name: seo-crawler
    environment:
      NODE_ENV: production
      GRPC_PORT: "50052"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped

  seo-analyzer:
    build:
      context: .
      dockerfile: apps/seo-analyzer/Dockerfile
    container_name: seo-seo-analyzer
    environment:
      NODE_ENV: production
      GRPC_PORT: "50053"
      DATABASE_URL: "postgresql://analyzer_user:analyzer_pass@analyzer-db:5432/seo_analyzer"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
    depends_on:
      analyzer-db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  keyword-analyzer:
    build:
      context: .
      dockerfile: apps/keyword-analyzer/Dockerfile
    container_name: seo-keyword-analyzer
    environment:
      NODE_ENV: production
      GRPC_PORT: "50054"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped

  report:
    build:
      context: .
      dockerfile: apps/report/Dockerfile
    container_name: seo-report
    ports:
      - "3004:3004"
      - "50055:50055"
    environment:
      NODE_ENV: production
      HTTP_PORT: "3004"
      GRPC_PORT: "50055"
      DATABASE_URL: "postgresql://report_user:report_pass@report-db:5432/seo_report"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
    depends_on:
      report-db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  gateway_db_data:
  analyzer_db_data:
  report_db_data:
  redis_data:
```

- [ ] **Step 2: Verify compose config is valid**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
docker compose config --quiet
```

Expected: No errors printed.

- [ ] **Step 3: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add docker-compose.yml
git commit -m "infra: add 5 NestJS service containers to docker-compose.yml"
```

---

## Task 7: Database Migration Entrypoint Scripts

**Files:**
- Create: `apps/gateway/docker-entrypoint.sh`
- Create: `apps/seo-analyzer/docker-entrypoint.sh`
- Create: `apps/report/docker-entrypoint.sh`
- Modify: `apps/gateway/Dockerfile` (use entrypoint script)
- Modify: `apps/seo-analyzer/Dockerfile` (use entrypoint script)
- Modify: `apps/report/Dockerfile` (use entrypoint script)

Services with databases need to run Prisma migrations on startup before the NestJS process starts.

- [ ] **Step 1: Create Gateway entrypoint script**

Create `apps/gateway/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Running seed (idempotent)..."
node dist/prisma/seed.js 2>/dev/null || echo "[entrypoint] Seed skipped or already applied"

echo "[entrypoint] Starting application..."
exec node dist/main.js
```

- [ ] **Step 2: Create SEO Analyzer entrypoint script**

Create `apps/seo-analyzer/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Running seed (idempotent)..."
node dist/prisma/seed.js 2>/dev/null || echo "[entrypoint] Seed skipped or already applied"

echo "[entrypoint] Starting application..."
exec node dist/main.js
```

- [ ] **Step 3: Create Report entrypoint script**

Create `apps/report/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting application..."
exec node dist/main.js
```

- [ ] **Step 4: Update Dockerfiles to use entrypoint scripts**

For each of the three Dockerfiles (`apps/gateway/Dockerfile`, `apps/seo-analyzer/Dockerfile`, `apps/report/Dockerfile`), add a COPY line for the entrypoint script and change CMD:

Add before `USER nestjs`:
```dockerfile
COPY --from=builder --chown=nestjs:nodejs /app/apps/<service>/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
```

Replace the CMD line:
```dockerfile
CMD ["./docker-entrypoint.sh"]
```

For **gateway**, the COPY line is:
```dockerfile
COPY --from=builder --chown=nestjs:nodejs /app/apps/gateway/docker-entrypoint.sh ./docker-entrypoint.sh
```

For **seo-analyzer**:
```dockerfile
COPY --from=builder --chown=nestjs:nodejs /app/apps/seo-analyzer/docker-entrypoint.sh ./docker-entrypoint.sh
```

For **report**:
```dockerfile
COPY --from=builder --chown=nestjs:nodejs /app/apps/report/docker-entrypoint.sh ./docker-entrypoint.sh
```

- [ ] **Step 5: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add apps/gateway/docker-entrypoint.sh apps/seo-analyzer/docker-entrypoint.sh apps/report/docker-entrypoint.sh
git add apps/gateway/Dockerfile apps/seo-analyzer/Dockerfile apps/report/Dockerfile
git commit -m "build: add database migration entrypoint scripts for services with Prisma"
```

---

## Task 8: E2E Smoke Test Script

**Files:**
- Create: `scripts/e2e-smoke-test.sh`

- [ ] **Step 1: Create the smoke test script**

Create `scripts/e2e-smoke-test.sh`:

```bash
#!/usr/bin/env bash
#
# E2E Smoke Test — Full SEO Audit Pipeline
#
# Usage:
#   ./scripts/e2e-smoke-test.sh
#
# Prerequisites:
#   - All 9 containers running: docker compose up -d --build
#   - curl and jq installed
#
# What it tests:
#   1. Health check — all downstream services healthy
#   2. Register user
#   3. Login, get JWT
#   4. Create audit (POST /audits) for https://example.com
#   5. Poll audit status until 'completed' (timeout 90s)
#   6. Verify audit has seo_score and results
#   7. Test PDF export
#   8. Cleanup
#
set -euo pipefail

BASE_URL="${GATEWAY_URL:-http://localhost:3000/api/v1}"
TIMEOUT_SECONDS=90
POLL_INTERVAL=3
TEST_URL="https://example.com"
TIMESTAMP=$(date +%s)
TEST_EMAIL="e2e-test-${TIMESTAMP}@test.local"
TEST_PASSWORD="Test1234!@#"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

pass=0
fail=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((pass++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((fail++)); }
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

cleanup() {
  log_info "Tests complete: ${pass} passed, ${fail} failed"
  if [ "$fail" -gt 0 ]; then
    exit 1
  fi
  exit 0
}
trap cleanup EXIT

# ─── Prerequisite check ───
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not installed."
    exit 1
  fi
done

echo "========================================"
echo "  SEO Analyst Platform — E2E Smoke Test"
echo "========================================"
echo ""

# ─── Test 1: Health Check ───
log_info "Test 1: Health check"
HEALTH=$(curl -sf "${BASE_URL}/health" 2>/dev/null || echo '{}')
HEALTH_STATUS=$(echo "$HEALTH" | jq -r '.status // empty')

if [ "$HEALTH_STATUS" = "ok" ]; then
  log_pass "Gateway health check returned status=ok"
else
  log_fail "Gateway health check failed: $HEALTH"
fi

# Check downstream services
for svc in database redis crawler analyzer report; do
  SVC_UP=$(echo "$HEALTH" | jq -r ".services.${svc} // false")
  if [ "$SVC_UP" = "true" ]; then
    log_pass "Downstream service '${svc}' is healthy"
  else
    log_fail "Downstream service '${svc}' is NOT healthy"
  fi
done

# ─── Test 2: Register User ───
log_info "Test 2: Register user (${TEST_EMAIL})"
REGISTER_RESP=$(curl -sf -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"E2E Test User\"}" \
  2>/dev/null || echo '{"error":"failed"}')

REGISTER_ID=$(echo "$REGISTER_RESP" | jq -r '.id // .userId // empty')
if [ -n "$REGISTER_ID" ]; then
  log_pass "User registered: id=${REGISTER_ID}"
else
  log_fail "Registration failed: ${REGISTER_RESP}"
fi

# ─── Test 3: Login ───
log_info "Test 3: Login"
LOGIN_RESP=$(curl -sf -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" \
  2>/dev/null || echo '{"error":"failed"}')

ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken // .access_token // empty')
if [ -n "$ACCESS_TOKEN" ]; then
  log_pass "Login successful, got JWT"
else
  log_fail "Login failed: ${LOGIN_RESP}"
  # Cannot continue without token
  exit 1
fi

AUTH_HEADER="Authorization: Bearer ${ACCESS_TOKEN}"

# ─── Test 4: Create Audit ───
log_info "Test 4: Create audit for ${TEST_URL}"
AUDIT_RESP=$(curl -sf -X POST "${BASE_URL}/audits" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d "{\"url\":\"${TEST_URL}\"}" \
  2>/dev/null || echo '{"error":"failed"}')

AUDIT_ID=$(echo "$AUDIT_RESP" | jq -r '.id // .auditId // empty')
if [ -n "$AUDIT_ID" ]; then
  log_pass "Audit created: id=${AUDIT_ID}"
else
  log_fail "Create audit failed: ${AUDIT_RESP}"
  exit 1
fi

# ─── Test 5: Poll Until Completed ───
log_info "Test 5: Polling audit status (timeout ${TIMEOUT_SECONDS}s)..."
ELAPSED=0
FINAL_STATUS=""

while [ "$ELAPSED" -lt "$TIMEOUT_SECONDS" ]; do
  POLL_RESP=$(curl -sf -H "${AUTH_HEADER}" "${BASE_URL}/audits/${AUDIT_ID}" 2>/dev/null || echo '{}')
  CURRENT_STATUS=$(echo "$POLL_RESP" | jq -r '.status // empty')
  CURRENT_PROGRESS=$(echo "$POLL_RESP" | jq -r '.progress // "?"')

  echo -ne "\r  Status: ${CURRENT_STATUS:-unknown} | Progress: ${CURRENT_PROGRESS}% | Elapsed: ${ELAPSED}s   "

  if [ "$CURRENT_STATUS" = "completed" ] || [ "$CURRENT_STATUS" = "COMPLETED" ]; then
    FINAL_STATUS="completed"
    echo ""
    break
  elif [ "$CURRENT_STATUS" = "failed" ] || [ "$CURRENT_STATUS" = "FAILED" ]; then
    FINAL_STATUS="failed"
    echo ""
    break
  fi

  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

if [ "$FINAL_STATUS" = "completed" ]; then
  log_pass "Audit completed in ${ELAPSED}s"
elif [ "$FINAL_STATUS" = "failed" ]; then
  ERROR_MSG=$(echo "$POLL_RESP" | jq -r '.errorMessage // "unknown"')
  log_fail "Audit failed: ${ERROR_MSG}"
else
  echo ""
  log_fail "Audit timed out after ${TIMEOUT_SECONDS}s (status: ${CURRENT_STATUS:-unknown})"
fi

# ─── Test 6: Verify Audit Results ───
log_info "Test 6: Verify audit has results"
AUDIT_DETAIL=$(curl -sf -H "${AUTH_HEADER}" "${BASE_URL}/audits/${AUDIT_ID}" 2>/dev/null || echo '{}')

SEO_SCORE=$(echo "$AUDIT_DETAIL" | jq -r '.seoScore // .seo_score // empty')
if [ -n "$SEO_SCORE" ] && [ "$SEO_SCORE" != "null" ]; then
  log_pass "Audit has SEO score: ${SEO_SCORE}"
else
  log_fail "Audit missing SEO score"
fi

# Check for report data via the report endpoint
REPORT_RESP=$(curl -sf -H "${AUTH_HEADER}" "${BASE_URL}/audits/${AUDIT_ID}/report" 2>/dev/null || echo '{}')
REPORT_ID=$(echo "$REPORT_RESP" | jq -r '.id // .reportId // empty')
if [ -n "$REPORT_ID" ] && [ "$REPORT_ID" != "null" ]; then
  log_pass "Report generated: reportId=${REPORT_ID}"
else
  log_fail "Report not found for audit"
fi

RULE_COUNT=$(echo "$REPORT_RESP" | jq -r '.ruleResults | length // 0' 2>/dev/null || echo "0")
if [ "$RULE_COUNT" -gt 0 ]; then
  log_pass "Report contains ${RULE_COUNT} rule results"
else
  log_fail "Report has no rule results"
fi

KEYWORD_COUNT=$(echo "$REPORT_RESP" | jq -r '.keywords | length // 0' 2>/dev/null || echo "0")
if [ "$KEYWORD_COUNT" -gt 0 ]; then
  log_pass "Report contains ${KEYWORD_COUNT} keywords"
else
  log_fail "Report has no keywords"
fi

# ─── Test 7: PDF Export ───
log_info "Test 7: PDF export"
PDF_HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "${AUTH_HEADER}" \
  "${BASE_URL}/audits/${AUDIT_ID}/export" 2>/dev/null || echo "000")

if [ "$PDF_HTTP_CODE" = "200" ]; then
  log_pass "PDF export returned HTTP 200"
else
  log_fail "PDF export returned HTTP ${PDF_HTTP_CODE}"
fi

echo ""
echo "========================================"
echo "  Smoke Test Summary"
echo "  Passed: ${pass} | Failed: ${fail}"
echo "========================================"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN/scripts/e2e-smoke-test.sh
```

- [ ] **Step 3: Add convenience script to root package.json**

Add to `scripts` in root `package.json`:

```json
"e2e:smoke": "./scripts/e2e-smoke-test.sh",
"docker:build": "docker compose build",
"docker:e2e": "docker compose up -d --build && sleep 30 && ./scripts/e2e-smoke-test.sh"
```

- [ ] **Step 4: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add scripts/e2e-smoke-test.sh package.json
git commit -m "test: add E2E smoke test script for full pipeline validation"
```

---

## Task 9: Gateway report.done Subscription (Belt-and-Suspenders)

**Files:**
- Modify: `apps/gateway/src/websocket/progress-subscriber.service.ts`

- [ ] **Step 1: Add `report.done` subscription as fallback**

The Gateway already subscribes to `audit.completed` (published by Report in Task 3). For extra resilience, also subscribe to `report.done` in case the `audit.completed` publish fails but `report.done` succeeded.

In `apps/gateway/src/websocket/progress-subscriber.service.ts`, add to `onModuleInit`:

```typescript
  async onModuleInit() {
    await this.redis.subscribe('audit.progress', (data) => this.handleProgress(data as ProgressPayload));
    await this.redis.subscribe('audit.completed', (data) => this.handleCompleted(data as ProgressPayload));
    await this.redis.subscribe('audit.failed', (data) => this.handleFailed(data as ProgressPayload));
    await this.redis.subscribe('report.done', (data) => this.handleReportDone(data as ProgressPayload));
    this.logger.log('Subscribed to audit.progress / audit.completed / audit.failed / report.done channels');
  }

  private async handleReportDone(p: ProgressPayload) {
    if (!p?.auditId) return;
    // Only process if audit is not already completed (idempotent guard)
    const audit = await this.prisma.audit.findUnique({
      where: { id: p.auditId },
      select: { status: true },
    });
    if (audit && audit.status !== AuditStatus.COMPLETED) {
      await this.handleCompleted(p);
    }
  }
```

- [ ] **Step 2: Run gateway tests**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
npx turbo run test --filter=@seo/gateway
```

- [ ] **Step 3: Commit**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add apps/gateway/src/websocket/progress-subscriber.service.ts
git commit -m "fix: gateway subscribes to report.done as fallback for audit completion"
```

---

## Task 10: Final Verification — Build, Start, and Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Build all Docker images**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
docker compose build
```

Expected: All 5 service images build successfully. Watch for:
- Prisma generate errors
- TypeScript compilation errors
- Playwright installation errors

- [ ] **Step 2: Start all containers**

```bash
docker compose up -d
```

- [ ] **Step 3: Wait for all containers to be healthy**

```bash
# Check every 5 seconds for up to 60 seconds
for i in $(seq 1 12); do
  echo "--- Attempt $i ---"
  docker compose ps --format "table {{.Name}}\t{{.Status}}"
  UNHEALTHY=$(docker compose ps --format json | jq -r 'select(.Health != "healthy" and .Health != "") | .Name' | wc -l)
  if [ "$UNHEALTHY" -eq 0 ]; then
    echo "All containers healthy!"
    break
  fi
  sleep 5
done
```

Expected: 9 containers running, all with health status "healthy".

- [ ] **Step 4: Run migrations manually if entrypoint didn't work**

```bash
# Only needed if entrypoint scripts fail
docker compose exec gateway npx prisma migrate deploy --schema=./prisma/schema.prisma
docker compose exec seo-analyzer npx prisma migrate deploy --schema=./prisma/schema.prisma
docker compose exec report npx prisma migrate deploy --schema=./prisma/schema.prisma
```

- [ ] **Step 5: Verify health endpoint shows all services healthy**

```bash
curl -s http://localhost:3000/api/v1/health | jq .
```

Expected output:
```json
{
  "status": "ok",
  "version": "0.0.1",
  "uptime": 42,
  "services": {
    "database": true,
    "redis": true,
    "crawler": true,
    "analyzer": true,
    "report": true
  }
}
```

- [ ] **Step 6: Run the E2E smoke test**

```bash
./scripts/e2e-smoke-test.sh
```

Expected: All tests pass (register, login, create audit, poll until completed, verify results, PDF export).

- [ ] **Step 7: Check container logs for errors**

```bash
docker compose logs --tail=50 gateway crawler seo-analyzer keyword-analyzer report
```

Look for:
- `crawl.start` picked up by crawler
- `analyze.start` + `keyword.start` enqueued after crawl
- `analyze.done` + `keyword.done` events published
- `completed_steps=2/2` in report logs
- `report.start` enqueued and processed
- `audit.completed` published

- [ ] **Step 8: Commit final state**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add -A
git commit -m "feat: complete pipeline wiring — all 9 containers, E2E smoke test passing"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `docker compose ps` shows 9 containers, all healthy
- [ ] `curl http://localhost:3000/api/v1/health` returns all services `true`
- [ ] Keyword publisher uses `'keyword.done'` channel (not `'events'`)
- [ ] Report publishes both `'report.done'` and `'audit.completed'`
- [ ] Gateway subscribes to `audit.progress`, `audit.completed`, `audit.failed`, `report.done`
- [ ] Crawler sends correct payload fields (`url`, `h1Text`) to keyword.start queue
- [ ] E2E smoke test passes: `./scripts/e2e-smoke-test.sh` returns 0 failures
- [ ] PDF export returns HTTP 200
- [ ] Container logs show the full event chain: `crawl.start` -> `crawl.done` -> `analyze.start` + `keyword.start` -> `analyze.done` + `keyword.done` -> `report.start` -> `report.done` -> `audit.completed`
- [ ] No `new Redis()` instantiated outside of injected services (Analyzer worker fixed or documented)

---

## Event Wiring Reference (Post-Fix)

```
POST /audits
  │
  ▼
Gateway: INSERT audit (pending) → enqueue crawl.start
  │
  ▼ BullMQ queue: crawl.start
Crawler Worker: crawl URL (Cheerio/Playwright + Lighthouse)
  ├─ publish audit.progress (10%, 33%)
  ├─ publish crawl.done (Redis Pub/Sub)
  ├─ enqueue analyze.start (BullMQ)
  └─ enqueue keyword.start (BullMQ)
      │                              │
      ▼ BullMQ: analyze.start       ▼ BullMQ: keyword.start
  Analyzer Worker                Keyword Worker
  ├─ run 20 SEO rules            ├─ tokenize + density calc
  ├─ cache result (Redis)        ├─ cache result (Redis)
  ├─ SADD completed_steps        └─ publish keyword.done ← FIXED (was 'events')
  └─ publish analyze.done              │
      │                                │
      ▼                                ▼
  Report: KeywordDoneListener     Report: AnalyzeDoneListener
  ├─ cache payload                ├─ cache payload
  └─ INCR completed_steps        └─ INCR completed_steps
      │                                │
      └──── when count >= 2 ───────────┘
                  │
                  ▼ BullMQ: report.start
            Report Worker
            ├─ readBoth (analyze + keyword results from Redis)
            ├─ aggregate scores
            ├─ persist to PostgreSQL #3
            ├─ publish report.done
            └─ publish audit.completed ← NEW (Gateway needs this)
                  │
                  ▼ Redis Pub/Sub: audit.completed
            Gateway: ProgressSubscriberService
            ├─ UPDATE audit status = completed, seoScore
            └─ Socket.IO emit audit.completed to client
```

---

## What Comes Next

This plan completes the **backend microservices platform**. All 5 services are wired, containerized, and validated end-to-end. The following future work builds on top:

| Future Work | What it adds |
|-------------|-------------|
| Frontend (Next.js 14) | Dashboard UI, audit creation form, real-time progress via Socket.IO, report viewer |
| CI/CD Pipeline | GitHub Actions: lint, test, build Docker images, push to registry |
| Kubernetes | Helm charts, HPA for Crawler/Analyzer, ingress |
| Monitoring | Prometheus metrics, Grafana dashboards, distributed tracing (Jaeger) |
| Performance | Connection pooling, BullMQ concurrency tuning, Redis Cluster |
