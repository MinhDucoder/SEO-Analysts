# Recipe — Seed Fixtures + Cleanup

Seed deterministic test data qua Prisma trước mỗi suite; cleanup sau mỗi suite để suite kế tiếp không thấy leak.

## File 1: `apps/web/tests/integration/fixtures/seed-users.ts`

```ts
import bcrypt from "bcryptjs";
import { PrismaClient } from "@seo/gateway/src/infra/prisma/generated/client";

/**
 * Seed deterministic test users. Gọi ở `globalSetup` của
 * playwright.integration.config.ts. Fixed IDs + hashed passwords
 * để tests reuse được.
 */
export const TEST_USERS = {
  regular: {
    id: "itest-user-regular",
    email: "itest-regular@example.com",
    password: "Test1234!",   // plaintext, tests dùng để login
    fullName: "Integration Regular User",
    role: "user" as const,
  },
  admin: {
    id: "itest-user-admin",
    email: "itest-admin@example.com",
    password: "Admin1234!",
    fullName: "Integration Admin User",
    role: "admin" as const,
  },
  unverified: {
    id: "itest-user-unverified",
    email: "itest-unverified@example.com",
    password: "Test1234!",
    fullName: "Integration Unverified",
    role: "user" as const,
  },
};

export async function seedUsers(): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.GATEWAY_DATABASE_URL ?? "postgresql://postgres:pw@localhost:5432/seo_gateway" },
    },
  });

  try {
    for (const u of Object.values(TEST_USERS)) {
      const hashed = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { email: u.email },
        create: {
          id: u.id,
          email: u.email,
          passwordHash: hashed,
          fullName: u.fullName,
          role: u.role,
          emailVerified: u.email !== TEST_USERS.unverified.email,
          createdAt: new Date(),
        },
        update: { passwordHash: hashed, role: u.role },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export default async function globalSetup(): Promise<void> {
  await seedUsers();
}
```

## File 2: `apps/web/tests/integration/fixtures/cleanup.ts`

```ts
import { PrismaClient } from "@seo/gateway/src/infra/prisma/generated/client";
import Redis from "ioredis";
import { TEST_USERS } from "./seed-users";

/**
 * TRUNCATE test rows từ Postgres + FLUSHDB Redis test keys.
 * Gọi ở `globalTeardown` của playwright.integration.config.ts HOẶC
 * trong `afterAll` của mỗi spec nếu cần fine-grained.
 */
export async function cleanup(): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.GATEWAY_DATABASE_URL ?? "postgresql://postgres:pw@localhost:5432/seo_gateway" },
    },
  });

  const testIds = Object.values(TEST_USERS).map(u => u.id);

  try {
    // Delete refresh tokens first (FK to user)
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: testIds } },
    });
    // Delete test users (idempotent)
    await prisma.user.deleteMany({
      where: { id: { in: testIds } },
    });
  } finally {
    await prisma.$disconnect();
  }

  // Flush Redis keys for test users (rate-limit counters, verify tokens, etc.)
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
  });
  try {
    for (const u of Object.values(TEST_USERS)) {
      const keys = await redis.keys(`*:${u.id}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } finally {
    await redis.quit();
  }
}

export default async function globalTeardown(): Promise<void> {
  await cleanup();
}
```

## Usage trong playwright config

```ts
// playwright.integration.config.ts
export default defineConfig({
  // ...
  globalSetup: require.resolve("./tests/integration/fixtures/seed-users.ts"),
  globalTeardown: require.resolve("./tests/integration/fixtures/cleanup.ts"),
});
```

## Per-test reset (tùy chọn)

Nếu 1 spec tạo dữ liệu phụ (vd: register tạo user mới), cleanup trong `afterEach` của spec:

```ts
import { test } from "@playwright/test";
import { PrismaClient } from "@seo/gateway/src/infra/prisma/generated/client";

test.afterEach(async () => {
  const prisma = new PrismaClient({ /* ... */ });
  await prisma.user.deleteMany({
    where: { email: { startsWith: "itest-dynamic-" } },
  });
  await prisma.$disconnect();
});
```

## Anti-patterns

- ❌ Seed từ SQL raw → drift với Prisma schema khi migrate.
- ❌ Seed users với password plaintext trong DB → dùng `bcrypt.hash`.
- ❌ Dùng production DB URL → bắt buộc check env `GATEWAY_DATABASE_URL` chỉ point tới DB test.
- ❌ Quên delete `RefreshToken` trước `User` → FK violation.
- ❌ Không flush Redis → rate-limit counter leak sang suite sau.

## Checklist

- [ ] `seedUsers()` idempotent (upsert, không INSERT cứng).
- [ ] `cleanup()` xử lý FK order (tokens trước users).
- [ ] Redis keys flushed theo pattern `*:<userId>:*`.
- [ ] Credentials hardcoded trong `TEST_USERS` object — không env var (test values).
- [ ] DB URL qua env, **không** default tới prod.
- [ ] `$disconnect()` trong `finally` block.