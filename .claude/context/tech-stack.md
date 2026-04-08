# Tech Stack Details

## Runtime & Build

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend Runtime | Node.js | 20 |
| Frontend Framework | Next.js | 14 (App Router) |
| Backend Framework | NestJS | 10.x |
| Monorepo | Turborepo | latest |
| Package Manager | pnpm / npm | - |
| ORM | Prisma | 5.x |

## Frontend (apps/web)

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 14.x |
| React | React | 18.x |
| Styling | Tailwind CSS | 3.x |
| UI Components | shadcn/ui | latest |
| Data Fetching | @tanstack/react-query | 5.x |
| HTTP Client | axios | 1.x |
| WebSocket | socket.io-client | 4.x |
| Charts | recharts / chart.js | - |
| Form Validation | react-hook-form + zod | - |
| Icons | lucide-react | latest |
| PDF Viewer | @react-pdf/renderer | - |

## Backend (apps/api)

### Core Framework

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | NestJS | 10.x |
| HTTP Platform | @nestjs/platform-express | 10.x |
| WebSocket | @nestjs/websockets + socket.io | 4.x |
| Validation | class-validator + class-transformer | - |
| Config | @nestjs/config | 3.x |
| Swagger | @nestjs/swagger | 7.x |

### Database & Queue

| Category | Technology | Version |
|----------|-----------|---------|
| Database | PostgreSQL | 16 |
| ORM | Prisma | 5.x |
| Managed DB | Supabase | - |
| Queue | BullMQ | 5.x |
| Queue UI | @nestjs/bull + bull-board | - |
| Cache/Queue Store | Redis | 7.x |

### Authentication

| Category | Technology | Version |
|----------|-----------|---------|
| JWT | @nestjs/jwt + passport-jwt | - |
| Passport | @nestjs/passport | 10.x |
| Google OAuth | passport-google-oauth20 | - |
| Password Hashing | bcrypt | 5.x |
| Rate Limiting | @nestjs/throttler | 5.x |

### Web Crawling

| Category | Technology | Version |
|----------|-----------|---------|
| HTML Parsing | cheerio | 1.x |
| JS Rendering | playwright | 1.x |
| HTTP Client | axios | 1.x |
| robots.txt | robots-parser | 3.x |

### Performance Analysis

| Category | Technology | Version |
|----------|-----------|---------|
| Lighthouse | lighthouse | 12.x |
| Chrome Launcher | chrome-launcher | 1.x |
| Headless Chrome | puppeteer | 22.x |

### Report Generation

| Category | Technology | Version |
|----------|-----------|---------|
| PDF | @react-pdf/renderer / puppeteer | - |

### Utilities

| Category | Technology | Version |
|----------|-----------|---------|
| Schema Validation | zod | 3.x |
| UUID | uuid | 9.x |
| Date | dayjs | 1.x |
| Lodash | lodash | 4.x |

## Shared (packages/shared)

| Category | Technology |
|----------|-----------|
| Language | TypeScript 5.x |
| Shared types | Interfaces for Audit, Issue, Score, User |

## Infrastructure

| Service | Provider | Tier |
|---------|----------|------|
| Frontend Hosting | Vercel | Hobby/Pro |
| Backend Hosting | Railway | Hobby |
| Database | Supabase (PostgreSQL) | Free (500MB) |
| Redis | Railway (add-on) | Hobby |
| CI/CD | GitHub Actions | Free |

## Key Config Files

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo pipeline config |
| `docker-compose.yml` | Local dev (PostgreSQL + Redis) |
| `prisma/schema.prisma` | Database schema |
| `apps/web/tailwind.config.ts` | Tailwind CSS config |
| `apps/api/src/main.ts` | NestJS bootstrap |
| `.env` / `.env.example` | Environment variables |
| `.github/workflows/ci.yml` | CI pipeline |

## Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Supabase | PostgreSQL connection string |
| `REDIS_URL` | Railway | Redis connection string |
| `JWT_SECRET` | Backend | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google | OAuth client secret |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | Frontend | WebSocket URL |
