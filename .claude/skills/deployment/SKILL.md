---
name: deployment
description: Use this skill when the user asks about "deploy", "Docker", "Vercel", "Railway", "Supabase", "CI/CD", "GitHub Actions", "environment variables", "production", "staging", or any deployment/infrastructure work. Provides Docker Compose, cloud deployment, and CI/CD patterns.
allowed-tools: Read, Grep, Glob, Bash(docker *), Bash(vercel *), Bash(railway *), Bash(gh *)
---

# Deployment & Infrastructure Patterns

## Architecture Overview

```
                    Internet
                       |
        +--------------+--------------+
        |              |              |
    Vercel         Railway        Supabase
  (Frontend)     (Backend)      (Database)
   Next.js 14    NestJS API     PostgreSQL
                 + Redis        + Auth
                 + BullMQ
```

---

## Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: seo_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Local Dev Commands

```bash
# Start services
docker compose up -d

# Check health
docker compose ps

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Stop
docker compose down

# Reset (delete data)
docker compose down -v
```

---

## Backend Dockerfile (Railway)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

# Install Playwright dependencies (for Lighthouse/crawling)
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --production=false

# Generate Prisma client
RUN npx prisma generate

# Build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package*.json ./

# Run migrations + start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

EXPOSE 3001
```

---

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seo_platform"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/seo_platform"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# Lighthouse
CHROME_PATH="/usr/bin/chromium-browser"
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

### Production (Railway/Vercel)

```bash
# Railway (backend)
DATABASE_URL="postgresql://xxx@db.xxx.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://xxx@db.xxx.supabase.co:5432/postgres"
REDIS_URL="redis://default:xxx@xxx.railway.app:6379"

# Vercel (frontend)
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"
NEXT_PUBLIC_WS_URL="https://api.yourdomain.com"
```

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: seo_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # Lint
      - run: npm run lint
      - run: npm run type-check

      # Backend tests
      - name: Run backend tests
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/seo_test
          REDIS_URL: redis://localhost:6379
        run: |
          npx prisma migrate deploy
          npm run test

      # Frontend tests
      - name: Run frontend tests
        working-directory: apps/web
        run: npm run test

  e2e:
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Deployment Workflows

### Vercel (Frontend - Auto)

```bash
# Vercel auto-deploys from GitHub on push to main
# Manual deploy:
vercel --prod

# Preview deploy (PR):
vercel
```

Vercel config (`apps/web/vercel.json`):
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### Railway (Backend)

```bash
# Railway auto-deploys from GitHub
# Link project:
railway link

# Manual deploy:
railway up

# View logs:
railway logs

# Set env vars:
railway variables set JWT_SECRET=xxx
```

### Supabase (Database)

```bash
# Apply migrations to production
npx prisma migrate deploy

# Open Supabase dashboard
npx supabase db remote commit
```

---

## Health Check Endpoint

```typescript
// modules/health/health.routes.ts
import { Router } from 'express';
import { prisma } from '../../prisma/client';
import { redis } from '../../config/redis.config';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check PostgreSQL
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { database: 'ok', redis: 'ok' },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
    });
  }
});

export default router;
```

---

## Checklist

```
Local Dev:
- Docker Compose for PostgreSQL + Redis
- .env.example with ALL required variables
- npm run dev starts both frontend + backend

CI/CD:
- GitHub Actions: lint -> type-check -> test -> e2e
- PostgreSQL + Redis services in CI
- Playwright report uploaded on failure
- E2E only runs on main branch

Production:
- Prisma migrate deploy in container CMD
- Health check endpoint (/health)
- Environment variables in Railway/Vercel dashboard
- pgbouncer=true in DATABASE_URL for Supabase
- DIRECT_URL for migrations (bypasses pgbouncer)

Security:
- Never commit .env files
- .env.example without real values
- JWT_SECRET >= 32 characters
- CORS restricted to FRONTEND_URL
```
