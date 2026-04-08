---
name: database
description: Use this skill when the user asks about "PostgreSQL", "Prisma", "migration", "database queries", "Redis", "caching", "indexes", "transactions", "connection pool", or any database-related work. Provides Prisma ORM patterns, PostgreSQL optimization, and Redis caching strategies.
allowed-tools: Read, Grep, Glob, Bash(npx prisma *), Bash(node *)
---

# PostgreSQL + Prisma + Redis Patterns

## Prisma Schema Design

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String?    @map("password_hash")
  provider     AuthProvider @default(LOCAL)
  createdAt    DateTime   @default(now()) @map("created_at")
  auditJobs    AuditJob[]

  @@map("users")
}

model AuditJob {
  id          String      @id @default(uuid())
  userId      String?     @map("user_id")
  url         String
  status      AuditStatus @default(QUEUED)
  progress    Int         @default(0)
  createdAt   DateTime    @default(now()) @map("created_at")
  completedAt DateTime?   @map("completed_at")

  user   User?        @relation(fields: [userId], references: [id])
  result AuditResult?
  pages  Page[]

  @@index([userId])
  @@index([url, createdAt])
  @@index([status])
  @@map("audit_jobs")
}

model AuditResult {
  id             String @id @default(uuid())
  jobId          String @unique @map("job_id")
  overallScore   Int    @map("overall_score")
  categoryScores Json   @map("category_scores")  // { technical: 80, onPage: 65, ... }
  issues         Json                              // Issue[]
  metadata       Json?                             // Extra data

  job AuditJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@map("audit_results")
}

model Page {
  id            String @id @default(uuid())
  jobId         String @map("job_id")
  url           String
  htmlSize      Int?   @map("html_size")
  responseTime  Int?   @map("response_time")    // milliseconds
  statusCode    Int?   @map("status_code")
  extractedData Json?  @map("extracted_data")

  job AuditJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@map("pages")
}

enum AuditStatus {
  QUEUED
  CRAWLING
  ANALYZING
  SCORING
  COMPLETED
  FAILED
}

enum AuthProvider {
  LOCAL
  GOOGLE
}
```

---

## Prisma Client Singleton

```typescript
// prisma/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

> **Quan trong**: Luon dung singleton. Moi `new PrismaClient()` tao 1 connection pool moi. Trong dev, hot-reload se tao nhieu instances -> connection pool exhausted.

---

## Common Query Patterns

### CRUD co bao

```typescript
// Tao audit job
const job = await prisma.auditJob.create({
  data: {
    url,
    userId, // nullable (guest)
    status: 'QUEUED',
  },
});

// Tim voi relations
const audit = await prisma.auditJob.findUnique({
  where: { id: jobId },
  include: {
    result: true,
    pages: true,
    user: { select: { id: true, email: true } }, // Chi lay fields can thiet
  },
});

// Update status
await prisma.auditJob.update({
  where: { id: jobId },
  data: { status: 'COMPLETED', completedAt: new Date() },
});

// Tim theo URL (recent first)
const history = await prisma.auditJob.findMany({
  where: { url, status: 'COMPLETED' },
  orderBy: { createdAt: 'desc' },
  take: 10, // LUON co limit
  include: { result: { select: { overallScore: true } } },
});
```

### Duplicate Detection

```typescript
// Kiem tra audit trung lap trong 5 phut
const recentAudit = await prisma.auditJob.findFirst({
  where: {
    url,
    status: 'COMPLETED',
    createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
  },
  include: { result: true },
});

if (recentAudit) return recentAudit; // Return cached result
```

### Transaction

```typescript
// Luu ket qua audit (atomically)
await prisma.$transaction([
  prisma.auditResult.create({
    data: { jobId, overallScore: score, categoryScores, issues },
  }),
  prisma.page.create({
    data: { jobId, url, htmlSize, responseTime, statusCode, extractedData },
  }),
  prisma.auditJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETED', completedAt: new Date(), progress: 100 },
  }),
]);
```

### Transaction Error Handling

```typescript
try {
  await prisma.$transaction(async (tx) => {
    await tx.auditResult.create({ data: resultData });
    await tx.auditJob.update({ where: { id: jobId }, data: { status: 'COMPLETED' } });
  });
} catch (e: any) {
  if (e.code === 'P2002') {
    // Unique constraint violation - result already exists
    console.warn('Audit result already exists for job:', jobId);
  } else if (e.code === 'P2025') {
    // Record not found
    throw new NotFoundError('AuditJob');
  } else {
    throw e;
  }
}
```

---

## Connection Pool (Supabase)

```
# .env - Supabase connection with pooling
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?pgbouncer=true&connection_limit=10"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Used for migrations
}
```

---

## Redis Caching Patterns

```typescript
// config/redis.config.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

// Export connection config for BullMQ (requires separate object)
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};
```

### Cache Patterns

```typescript
// Cache audit result (5 min TTL)
const CACHE_TTL = 300; // 5 minutes

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Usage
const result = await getCachedOrFetch(
  `audit:result:${jobId}`,
  () => prisma.auditResult.findUnique({ where: { jobId } }),
  300
);

// Cache robots.txt (24h TTL)
await redis.setex(`robots:${domain}`, 86400, robotsTxtContent);

// Rate limit counter
const key = `rate:${userId || ip}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 3600); // 1 hour window
if (count > maxRequests) throw new RateLimitError();
```

---

## Common Commands

```bash
npx prisma migrate dev              # Create + apply migration (dev)
npx prisma migrate dev --name init  # Named migration
npx prisma migrate deploy           # Apply migrations (production)
npx prisma generate                 # Regenerate Prisma Client
npx prisma studio                   # Visual data browser (port 5555)
npx prisma db push                  # Push schema without migration file
npx prisma db seed                  # Run seed script
npx prisma migrate reset            # Reset DB + re-apply all migrations (DESTRUCTIVE)
npx prisma format                   # Format schema file
```

---

## Checklist

```
Schema:
- UUID primary keys (@default(uuid()))
- @map for snake_case column names
- @@map for snake_case table names
- Proper indexes on filtered/sorted columns
- onDelete: Cascade for child records
- Json type for flexible structured data

Queries:
- Prisma Client singleton (avoid connection exhaustion)
- Always use select/include to limit returned fields
- Always .take() / limit on list queries
- Transactions for multi-table atomic operations
- Handle P2002 (unique) and P2025 (not found) errors

Supabase:
- pgbouncer=true in DATABASE_URL for connection pooling
- directUrl for migrations (bypasses pgbouncer)
- connection_limit=10 for Railway/serverless

Redis:
- TTL on ALL cached values (no orphan keys)
- Consistent key naming: "entity:identifier"
- Separate connection config for BullMQ vs ioredis
- RetryStrategy for connection resilience
```
