# Plan 2: Gateway Service Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tests use Vitest + `@nestjs/testing`. For each task that lists a `*.spec.ts` file, write the test first, watch it fail, then implement.

**Goal:** Implement the complete Gateway business logic on top of the scaffold produced by Plan 1 — the public REST API entry point that handles auth, audit orchestration, admin operations, and real-time progress streaming. After this plan, a frontend can register, log in, create an audit (which enqueues a `crawl.start` BullMQ job), receive Socket.IO progress events, list/delete audits, fetch audit details (proxied to Report via gRPC), share/compare audits, and admins can manage users + tune SEO rule weights.

**Architecture:** NestJS HTTP application listening on port 3000. The Gateway is the **only** service that owns the user identity tables (`users`, `refresh_tokens`) and the master `audits` table. Everything else (rule results, keyword analysis, final reports, share links) lives in downstream service databases — the Gateway proxies via gRPC. BullMQ producer enqueues `crawl.start` only; the rest of the pipeline is choreography (see spec section 3.1). A Socket.IO gateway subscribes to Redis Pub/Sub channels (`audit.progress`, `audit.completed`, `audit.failed`) and re-emits events to clients in `audit:{auditId}` rooms after a JWT handshake check.

**Tech Stack:** NestJS 10, @nestjs/passport + passport-jwt + passport-google-oauth20, @nestjs/jwt, @nestjs/swagger 8, @nestjs/bullmq 10 + bullmq 5, @nestjs/websockets + @nestjs/platform-socket.io + socket.io 4, @grpc/grpc-js + @grpc/proto-loader, ioredis 5, bcrypt 5 (cost factor 12), class-validator + class-transformer, Vitest 2.

**Reference Spec:** `docs/superpowers/specs/2026-04-09-microservices-architecture-design.md`
- Section 3 (Pipeline + Progress %)
- Section 9 (REST API Endpoints — all 29 routes)
- Section 5.2 (Gateway DB schema)
- Section 4.7 (gRPC call matrix)

**Depends on:** Plan 1 (Foundation) — complete. The scaffold already provides:
- `apps/gateway/src/main.ts` (HTTP bootstrap on port 3000 with Swagger + ValidationPipe)
- `apps/gateway/src/app.module.ts` (ConfigModule + PrismaModule)
- `apps/gateway/src/prisma/{prisma.module.ts,prisma.service.ts}`
- `apps/gateway/prisma/schema.prisma` (User, RefreshToken, Audit) migrated to `gateway-db` on port 5432
- Seeded admin user (email `admin@seo.local`)
- `@repo/proto` (gRPC contracts), `@repo/shared` (enums, constants, REDIS_KEYS, BULLMQ_QUEUES)

---

## File Structure

Files produced by this plan (new, unless noted MODIFY):

```
apps/gateway/
├── .env.example                              # MODIFY — add JWT, Google OAuth, gRPC URLs
├── src/
│   ├── app.module.ts                         # MODIFY — wire all feature modules
│   ├── main.ts                               # MODIFY — global filter, request-id, cookie-parser, helmet
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts      # RFC 7807 problem+json
│   │   ├── middleware/
│   │   │   └── request-id.middleware.ts
│   │   ├── interfaces/
│   │   │   ├── jwt-payload.interface.ts
│   │   │   ├── authenticated-request.interface.ts
│   │   │   └── pagination.interface.ts
│   │   └── utils/
│   │       ├── url-validator.ts              # SSRF prevention
│   │       └── pagination.util.ts
│   ├── redis/
│   │   ├── redis.module.ts
│   │   ├── redis.service.ts                  # ioredis client + pub/sub
│   │   └── rate-limiter.service.ts           # Redis sorted set sliding window
│   ├── grpc/
│   │   ├── grpc.module.ts
│   │   ├── grpc-client.factory.ts
│   │   ├── crawler.client.ts
│   │   ├── analyzer.client.ts
│   │   └── report.client.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── token.service.ts                  # access + refresh JWT signing/rotation
│   │   ├── password.service.ts               # bcrypt wrapper
│   │   ├── verification.service.ts           # email verification + reset tokens
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   ├── verify-email.dto.ts
│   │   │   ├── forgot-password.dto.ts
│   │   │   ├── reset-password.dto.ts
│   │   │   └── auth-response.dto.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── google.strategy.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       ├── roles.guard.ts
│   │       └── google-auth.guard.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── update-profile.dto.ts
│   │       └── change-password.dto.ts
│   ├── audits/
│   │   ├── audits.module.ts
│   │   ├── audits.controller.ts
│   │   ├── audits.service.ts
│   │   ├── audit-queue.producer.ts           # BullMQ producer for crawl.start
│   │   └── dto/
│   │       ├── create-audit.dto.ts
│   │       ├── list-audits.query.ts
│   │       ├── compare-audits.query.ts
│   │       └── audit-summary.dto.ts
│   ├── shared/
│   │   ├── shared.module.ts
│   │   └── shared.controller.ts              # GET /shared/audits/:token
│   ├── admin/
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   │       ├── list-users.query.ts
│   │       ├── update-user.dto.ts
│   │       └── update-rules.dto.ts
│   ├── websocket/
│   │   ├── websocket.module.ts
│   │   ├── audit.gateway.ts                  # Socket.IO gateway
│   │   └── progress-subscriber.service.ts    # Redis Pub/Sub → Socket.IO
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts
├── test/
│   ├── unit/
│   │   ├── url-validator.spec.ts
│   │   ├── rate-limiter.spec.ts
│   │   ├── token.service.spec.ts
│   │   ├── password.service.spec.ts
│   │   ├── auth.service.spec.ts
│   │   └── audits.service.spec.ts
│   └── integration/
│       ├── auth.e2e-spec.ts
│       └── audits.e2e-spec.ts
└── vitest.config.ts                           # CREATE
```

---

## Task 1: Common Infrastructure — Decorators, Filter, Middleware, URL Validator

**Files:**
- Create: `apps/gateway/vitest.config.ts`
- Create: `apps/gateway/src/common/interfaces/jwt-payload.interface.ts`
- Create: `apps/gateway/src/common/interfaces/authenticated-request.interface.ts`
- Create: `apps/gateway/src/common/interfaces/pagination.interface.ts`
- Create: `apps/gateway/src/common/decorators/current-user.decorator.ts`
- Create: `apps/gateway/src/common/decorators/public.decorator.ts`
- Create: `apps/gateway/src/common/decorators/roles.decorator.ts`
- Create: `apps/gateway/src/common/middleware/request-id.middleware.ts`
- Create: `apps/gateway/src/common/filters/all-exceptions.filter.ts`
- Create: `apps/gateway/src/common/utils/url-validator.ts`
- Create: `apps/gateway/src/common/utils/pagination.util.ts`
- Create: `apps/gateway/test/unit/url-validator.spec.ts`

- [ ] **Step 1: Create vitest.config.ts**

Create `apps/gateway/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.dto.ts',
        '**/dto/**',
        '**/interfaces/**',
        '**/generated/**',
        'src/main.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@gateway': resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 2: JWT payload + authenticated request interfaces**

Create `apps/gateway/src/common/interfaces/jwt-payload.interface.ts`:

```ts
import { UserRole } from '@repo/shared';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
```

Create `apps/gateway/src/common/interfaces/authenticated-request.interface.ts`:

```ts
import { Request } from 'express';
import { UserRole } from '@repo/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  requestId: string;
}
```

Create `apps/gateway/src/common/interfaces/pagination.interface.ts`:

```ts
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

- [ ] **Step 3: Decorators (CurrentUser, Public, Roles)**

Create `apps/gateway/src/common/decorators/current-user.decorator.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, AuthenticatedUser } from '../interfaces/authenticated-request.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return data ? user[data] : user;
  },
);
```

Create `apps/gateway/src/common/decorators/public.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Create `apps/gateway/src/common/decorators/roles.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@repo/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 4: Request ID middleware**

Create `apps/gateway/src/common/middleware/request-id.middleware.ts`:

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    const id = incoming && /^[a-zA-Z0-9-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    (req as Request & { requestId: string }).requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
```

- [ ] **Step 5: Global exception filter (RFC 7807)**

Create `apps/gateway/src/common/filters/all-exceptions.filter.ts`:

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  errors?: Array<{ field: string; message: string }>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let errors: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        detail = res;
        title = exception.message;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as { message?: string | string[]; error?: string };
        title = r.error ?? exception.message;
        if (Array.isArray(r.message)) {
          detail = 'Validation failed';
          errors = r.message.map((m) => ({ field: 'body', message: m }));
        } else {
          detail = r.message ?? exception.message;
        }
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      this.logger.error(exception.stack);
    }

    const problem: ProblemDetails = {
      type: `https://httpstatuses.com/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      requestId: request.requestId ?? 'unknown',
      ...(errors ? { errors } : {}),
    };

    response
      .status(status)
      .setHeader('Content-Type', 'application/problem+json')
      .json(problem);
  }
}
```

- [ ] **Step 6: URL validator with SSRF prevention**

Create `apps/gateway/src/common/utils/url-validator.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const PRIVATE_CIDRS_V4: Array<[bigint, bigint]> = [
  ipRange('10.0.0.0', '10.255.255.255'),
  ipRange('172.16.0.0', '172.31.255.255'),
  ipRange('192.168.0.0', '192.168.255.255'),
  ipRange('127.0.0.0', '127.255.255.255'),
  ipRange('169.254.0.0', '169.254.255.255'),
  ipRange('0.0.0.0', '0.255.255.255'),
];

function ipv4ToBigInt(ip: string): bigint {
  return ip
    .split('.')
    .reduce((acc, oct) => (acc << 8n) + BigInt(parseInt(oct, 10)), 0n);
}

function ipRange(start: string, end: string): [bigint, bigint] {
  return [ipv4ToBigInt(start), ipv4ToBigInt(end)];
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToBigInt(ip);
  return PRIVATE_CIDRS_V4.some(([s, e]) => n >= s && n <= e);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower === '::'
  );
}

export interface ValidatedUrl {
  href: string;
  domain: string;
}

export async function validateUrlSafety(rawUrl: string): Promise<ValidatedUrl> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL khong hop le');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Chi ho tro http hoac https');
  }

  const host = parsed.hostname;
  if (!host) throw new BadRequestException('URL thieu hostname');

  const blockedHosts = ['localhost', 'metadata.google.internal'];
  if (blockedHosts.includes(host.toLowerCase())) {
    throw new BadRequestException('Host nay khong duoc phep');
  }

  // Resolve hostname to IP and check against private ranges
  try {
    const records = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true });
    for (const r of records) {
      if (r.family === 4 && isPrivateIPv4(r.address)) {
        throw new BadRequestException('IP private/loopback khong duoc phep');
      }
      if (r.family === 6 && isPrivateIPv6(r.address)) {
        throw new BadRequestException('IPv6 private khong duoc phep');
      }
    }
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException('Khong the resolve hostname');
  }

  return { href: parsed.href, domain: parsed.hostname };
}
```

- [ ] **Step 7: Pagination util**

Create `apps/gateway/src/common/utils/pagination.util.ts`:

```ts
import { PaginationMeta } from '../interfaces/pagination.interface';

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function clampPagination(page?: number, limit?: number): { page: number; limit: number; skip: number } {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
}
```

- [ ] **Step 8: URL validator unit test**

Create `apps/gateway/test/unit/url-validator.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateUrlSafety } from '../../src/common/utils/url-validator';
import { BadRequestException } from '@nestjs/common';

describe('validateUrlSafety', () => {
  it('accepts a public https URL', async () => {
    const r = await validateUrlSafety('https://example.com/path');
    expect(r.domain).toBe('example.com');
    expect(r.href).toContain('https://example.com');
  });

  it('rejects ftp scheme', async () => {
    await expect(validateUrlSafety('ftp://example.com')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects localhost', async () => {
    await expect(validateUrlSafety('http://localhost/x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects literal 127.0.0.1', async () => {
    await expect(validateUrlSafety('http://127.0.0.1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects 192.168.x', async () => {
    await expect(validateUrlSafety('http://192.168.1.1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects 10.x', async () => {
    await expect(validateUrlSafety('http://10.0.0.1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects garbage', async () => {
    await expect(validateUrlSafety('not-a-url')).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 9: Run tests + commit**

```bash
cd apps/gateway && npm test -- url-validator
git add apps/gateway/vitest.config.ts apps/gateway/src/common apps/gateway/test/unit/url-validator.spec.ts
git commit -m "feat(gateway): common infra (decorators, filter, request-id, SSRF validator)"
```

---

## Task 2: Redis Module + Rate Limiter (Redis Sorted Set)

**Files:**
- Create: `apps/gateway/src/redis/redis.module.ts`
- Create: `apps/gateway/src/redis/redis.service.ts`
- Create: `apps/gateway/src/redis/rate-limiter.service.ts`
- Create: `apps/gateway/test/unit/rate-limiter.spec.ts`

- [ ] **Step 1: RedisService (ioredis client + pub/sub helpers)**

Create `apps/gateway/src/redis/redis.service.ts`:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _client!: Redis;
  private _subscriber!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this._client = new Redis(url, { maxRetriesPerRequest: null });
    this._subscriber = new Redis(url, { maxRetriesPerRequest: null });
    this._client.on('error', (e) => this.logger.error(`Redis client error: ${e.message}`));
    this._subscriber.on('error', (e) => this.logger.error(`Redis subscriber error: ${e.message}`));
  }

  async onModuleDestroy() {
    await this._client?.quit();
    await this._subscriber?.quit();
  }

  get client(): Redis {
    return this._client;
  }

  get subscriber(): Redis {
    return this._subscriber;
  }

  async publish(channel: string, payload: unknown): Promise<number> {
    return this._client.publish(channel, JSON.stringify(payload));
  }

  async subscribe(channel: string, handler: (data: unknown) => void): Promise<void> {
    await this._subscriber.subscribe(channel);
    this._subscriber.on('message', (ch, msg) => {
      if (ch !== channel) return;
      try {
        handler(JSON.parse(msg));
      } catch (e) {
        this.logger.error(`Failed to parse Redis message on ${channel}: ${(e as Error).message}`);
      }
    });
  }
}
```

- [ ] **Step 2: RateLimiterService (Redis sorted set sliding window)**

Create `apps/gateway/src/redis/rate-limiter.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { REDIS_KEYS } from '@repo/shared';
import { RedisService } from './redis.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Sliding-window rate limit using a Redis sorted set.
   * @param key the bucket key (e.g. rate_limit:audits:{userId})
   * @param limit max events allowed
   * @param windowSeconds window size in seconds
   */
  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const minScore = now - windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

    const pipeline = this.redis.client.multi();
    pipeline.zremrangebyscore(key, 0, minScore);
    pipeline.zcard(key);
    pipeline.zadd(key, now, member);
    pipeline.expire(key, windowSeconds + 1);
    const results = await pipeline.exec();

    if (!results) {
      return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds };
    }
    const count = (results[1][1] as number) ?? 0;

    if (count >= limit) {
      // Remove the just-added member because we are over the limit
      await this.redis.client.zrem(key, member);
      const oldest = await this.redis.client.zrange(key, 0, 0, 'WITHSCORES');
      const oldestScore = oldest[1] ? Number(oldest[1]) : now;
      const retryAfter = Math.max(1, Math.ceil((oldestScore + windowMs - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
    }
    return { allowed: true, remaining: limit - count - 1, retryAfterSeconds: 0 };
  }

  auditBucket(userId: string): string {
    return `${REDIS_KEYS.rateLimit(userId)}:audits`;
  }

  loginBucket(email: string): string {
    return `rate_limit:login:${email.toLowerCase()}`;
  }

  registerBucket(ip: string): string {
    return `rate_limit:register:${ip}`;
  }
}
```

- [ ] **Step 3: RedisModule (global)**

Create `apps/gateway/src/redis/redis.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RateLimiterService } from './rate-limiter.service';

@Global()
@Module({
  providers: [RedisService, RateLimiterService],
  exports: [RedisService, RateLimiterService],
})
export class RedisModule {}
```

- [ ] **Step 4: RateLimiter unit test (in-memory mock)**

Create `apps/gateway/test/unit/rate-limiter.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiterService } from '../../src/redis/rate-limiter.service';
import { RedisService } from '../../src/redis/redis.service';

class FakeRedis {
  store = new Map<string, Array<{ score: number; member: string }>>();
  multi() {
    const ops: Array<() => unknown> = [];
    const self = this;
    const chain = {
      zremrangebyscore(key: string, min: number, max: number) {
        ops.push(() => {
          const arr = self.store.get(key) ?? [];
          self.store.set(key, arr.filter((e) => e.score < min || e.score > max));
        });
        return chain;
      },
      zcard(key: string) {
        ops.push(() => (self.store.get(key) ?? []).length);
        return chain;
      },
      zadd(key: string, score: number, member: string) {
        ops.push(() => {
          const arr = self.store.get(key) ?? [];
          arr.push({ score, member });
          self.store.set(key, arr);
        });
        return chain;
      },
      expire() {
        ops.push(() => 1);
        return chain;
      },
      async exec() {
        return ops.map((fn) => [null, fn()]);
      },
    };
    return chain;
  }
  async zrem(key: string, member: string) {
    const arr = this.store.get(key) ?? [];
    this.store.set(key, arr.filter((e) => e.member !== member));
    return 1;
  }
  async zrange(key: string, start: number, stop: number, _withScores?: string) {
    const arr = (this.store.get(key) ?? []).slice().sort((a, b) => a.score - b.score);
    const slice = arr.slice(start, stop + 1);
    return slice.flatMap((e) => [e.member, String(e.score)]);
  }
}

describe('RateLimiterService', () => {
  let svc: RateLimiterService;
  let fake: FakeRedis;

  beforeEach(() => {
    fake = new FakeRedis();
    svc = new RateLimiterService({ client: fake } as unknown as RedisService);
  });

  it('allows up to limit then blocks', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await svc.consume('test', 3, 60);
      expect(r.allowed).toBe(true);
    }
    const fourth = await svc.consume('test', 3, 60);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('reports remaining count correctly', async () => {
    const r1 = await svc.consume('k', 5, 60);
    expect(r1.remaining).toBe(4);
    const r2 = await svc.consume('k', 5, 60);
    expect(r2.remaining).toBe(3);
  });
});
```

- [ ] **Step 5: Run tests + commit**

```bash
cd apps/gateway && npm test -- rate-limiter
git add apps/gateway/src/redis apps/gateway/test/unit/rate-limiter.spec.ts
git commit -m "feat(gateway): Redis module with pub/sub + sliding-window rate limiter"
```

---

## Task 3: gRPC Client Module (Crawler, Analyzer, Report)

**Files:**
- Create: `apps/gateway/src/grpc/grpc.module.ts`
- Create: `apps/gateway/src/grpc/grpc-client.factory.ts`
- Create: `apps/gateway/src/grpc/crawler.client.ts`
- Create: `apps/gateway/src/grpc/analyzer.client.ts`
- Create: `apps/gateway/src/grpc/report.client.ts`

- [ ] **Step 1: Generic gRPC client factory**

Create `apps/gateway/src/grpc/grpc-client.factory.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { credentials, loadPackageDefinition, ServiceClientConstructor, GrpcObject } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { join } from 'path';

interface ClientOptions {
  protoPath: string;
  packageName: string;
  serviceName: string;
  url: string;
}

@Injectable()
export class GrpcClientFactory {
  private readonly logger = new Logger(GrpcClientFactory.name);
  private readonly protoRoot = join(__dirname, '../../../..', 'packages/proto');

  create<T = unknown>(opts: ClientOptions): T {
    const fullPath = join(this.protoRoot, opts.protoPath);
    const def = loadSync(fullPath, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [this.protoRoot],
    });
    const grpcObj = loadPackageDefinition(def) as GrpcObject;
    const pkgParts = opts.packageName.split('.');
    let pkg: GrpcObject = grpcObj;
    for (const part of pkgParts) {
      pkg = pkg[part] as GrpcObject;
    }
    const ServiceCtor = pkg[opts.serviceName] as unknown as ServiceClientConstructor;
    this.logger.log(`Creating gRPC client for ${opts.packageName}.${opts.serviceName} → ${opts.url}`);
    return new ServiceCtor(opts.url, credentials.createInsecure()) as unknown as T;
  }
}
```

- [ ] **Step 2: CrawlerGrpcClient**

Create `apps/gateway/src/grpc/crawler.client.ts`:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';

interface CrawlerService {
  CrawlUrl(req: { url: string; auditId: string }, cb: (err: Error | null, res?: unknown) => void): void;
  HealthCheck(req: object, cb: (err: Error | null, res?: { healthy: boolean }) => void): void;
}

@Injectable()
export class CrawlerGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(CrawlerGrpcClient.name);
  private client!: CrawlerService;

  constructor(
    private readonly factory: GrpcClientFactory,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('CRAWLER_GRPC_URL') ?? 'localhost:50051';
    this.client = this.factory.create<CrawlerService>({
      protoPath: 'crawler/v1/crawler.proto',
      packageName: 'crawler.v1',
      serviceName: 'CrawlerService',
      url,
    });
  }

  async crawlUrl(auditId: string, url: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.client.CrawlUrl({ auditId, url }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.HealthCheck({}, (err, res) => {
        if (err) {
          this.logger.warn(`Crawler health check failed: ${err.message}`);
          return resolve(false);
        }
        resolve(res?.healthy ?? false);
      });
    });
  }
}
```

- [ ] **Step 3: AnalyzerGrpcClient**

Create `apps/gateway/src/grpc/analyzer.client.ts`:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';

interface SeoRuleItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  weight: number;
  isEnabled: boolean;
}

interface AnalyzerService {
  ListRules(req: object, cb: (err: Error | null, res?: { rules: SeoRuleItem[] }) => void): void;
  GetRulesByCategory(req: { category: string }, cb: (err: Error | null, res?: { rules: SeoRuleItem[] }) => void): void;
  UpdateRuleWeight(req: { ruleId: string; newWeight: number }, cb: (err: Error | null, res?: SeoRuleItem) => void): void;
  HealthCheck(req: object, cb: (err: Error | null, res?: { healthy: boolean }) => void): void;
}

@Injectable()
export class AnalyzerGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AnalyzerGrpcClient.name);
  private client!: AnalyzerService;

  constructor(
    private readonly factory: GrpcClientFactory,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('ANALYZER_GRPC_URL') ?? 'localhost:50053';
    this.client = this.factory.create<AnalyzerService>({
      protoPath: 'analyzer/v1/analyzer.proto',
      packageName: 'analyzer.v1',
      serviceName: 'AnalyzerService',
      url,
    });
  }

  listRules(): Promise<SeoRuleItem[]> {
    return new Promise((resolve, reject) => {
      this.client.ListRules({}, (err, res) => {
        if (err) return reject(err);
        resolve(res?.rules ?? []);
      });
    });
  }

  getRulesByCategory(category: string): Promise<SeoRuleItem[]> {
    return new Promise((resolve, reject) => {
      this.client.GetRulesByCategory({ category }, (err, res) => {
        if (err) return reject(err);
        resolve(res?.rules ?? []);
      });
    });
  }

  updateRuleWeight(ruleId: string, newWeight: number): Promise<SeoRuleItem> {
    return new Promise((resolve, reject) => {
      this.client.UpdateRuleWeight({ ruleId, newWeight }, (err, res) => {
        if (err) return reject(err);
        if (!res) return reject(new Error('Empty response'));
        resolve(res);
      });
    });
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.HealthCheck({}, (err, res) => {
        if (err) {
          this.logger.warn(`Analyzer health check failed: ${err.message}`);
          return resolve(false);
        }
        resolve(res?.healthy ?? false);
      });
    });
  }
}
```

- [ ] **Step 4: ReportGrpcClient**

Create `apps/gateway/src/grpc/report.client.ts`:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';

interface ReportService {
  GetReport(req: { auditId: string }, cb: (err: Error | null, res?: unknown) => void): void;
  CompareReports(req: { audit1: string; audit2: string }, cb: (err: Error | null, res?: unknown) => void): void;
  CreateShareLink(req: { auditId: string; userId: string }, cb: (err: Error | null, res?: { shareToken: string; shareUrl: string }) => void): void;
  RevokeShareLink(req: { auditId: string; userId: string }, cb: (err: Error | null, res?: { revoked: boolean }) => void): void;
  GetSharedReport(req: { token: string }, cb: (err: Error | null, res?: unknown) => void): void;
  GeneratePdf(req: { auditId: string }, cb: (err: Error | null, res?: { pdfUrl: string }) => void): void;
  HealthCheck(req: object, cb: (err: Error | null, res?: { healthy: boolean }) => void): void;
}

@Injectable()
export class ReportGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(ReportGrpcClient.name);
  private client!: ReportService;

  constructor(
    private readonly factory: GrpcClientFactory,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('REPORT_GRPC_URL') ?? 'localhost:50055';
    this.client = this.factory.create<ReportService>({
      protoPath: 'report/v1/report.proto',
      packageName: 'report.v1',
      serviceName: 'ReportService',
      url,
    });
  }

  private call<TReq, TRes>(method: keyof ReportService, req: TReq): Promise<TRes> {
    return new Promise((resolve, reject) => {
      const fn = (this.client[method] as unknown as Function).bind(this.client);
      fn(req, (err: Error | null, res?: TRes) => {
        if (err) {
          this.logger.warn(`Report ${String(method)} failed: ${err.message}`);
          return reject(err);
        }
        if (!res) return reject(new Error('Empty response'));
        resolve(res);
      });
    });
  }

  getReport(auditId: string) {
    return this.call<{ auditId: string }, unknown>('GetReport', { auditId });
  }
  compareReports(audit1: string, audit2: string) {
    return this.call<{ audit1: string; audit2: string }, unknown>('CompareReports', { audit1, audit2 });
  }
  createShareLink(auditId: string, userId: string) {
    return this.call<{ auditId: string; userId: string }, { shareToken: string; shareUrl: string }>(
      'CreateShareLink',
      { auditId, userId },
    );
  }
  revokeShareLink(auditId: string, userId: string) {
    return this.call<{ auditId: string; userId: string }, { revoked: boolean }>(
      'RevokeShareLink',
      { auditId, userId },
    );
  }
  getSharedReport(token: string) {
    return this.call<{ token: string }, unknown>('GetSharedReport', { token });
  }
  generatePdf(auditId: string) {
    return this.call<{ auditId: string }, { pdfUrl: string }>('GeneratePdf', { auditId });
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.HealthCheck({}, (err, res) => {
        if (err) {
          this.logger.warn(`Report health check failed: ${err.message}`);
          return resolve(false);
        }
        resolve(res?.healthy ?? false);
      });
    });
  }
}
```

- [ ] **Step 5: GrpcModule (global)**

Create `apps/gateway/src/grpc/grpc.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { GrpcClientFactory } from './grpc-client.factory';
import { CrawlerGrpcClient } from './crawler.client';
import { AnalyzerGrpcClient } from './analyzer.client';
import { ReportGrpcClient } from './report.client';

@Global()
@Module({
  providers: [GrpcClientFactory, CrawlerGrpcClient, AnalyzerGrpcClient, ReportGrpcClient],
  exports: [CrawlerGrpcClient, AnalyzerGrpcClient, ReportGrpcClient],
})
export class GrpcModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/grpc
git commit -m "feat(gateway): gRPC clients for crawler, analyzer, report services"
```

---

## Task 4: Auth — DTOs, Password Service, Token Service

**Files:**
- Create: `apps/gateway/src/auth/dto/register.dto.ts`
- Create: `apps/gateway/src/auth/dto/login.dto.ts`
- Create: `apps/gateway/src/auth/dto/verify-email.dto.ts`
- Create: `apps/gateway/src/auth/dto/forgot-password.dto.ts`
- Create: `apps/gateway/src/auth/dto/reset-password.dto.ts`
- Create: `apps/gateway/src/auth/dto/auth-response.dto.ts`
- Create: `apps/gateway/src/auth/password.service.ts`
- Create: `apps/gateway/src/auth/token.service.ts`
- Create: `apps/gateway/test/unit/password.service.spec.ts`
- Create: `apps/gateway/test/unit/token.service.spec.ts`

- [ ] **Step 1: DTOs with class-validator**

Create `apps/gateway/src/auth/dto/register.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @Length(2, 100, { message: 'fullName phai tu 2-100 ky tu' })
  fullName!: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @Length(8, 72, { message: 'Mat khau toi thieu 8 ky tu' })
  @Matches(/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'Mat khau phai co 1 chu hoa, 1 so, 1 ky tu dac biet',
  })
  password!: string;
}
```

Create `apps/gateway/src/auth/dto/login.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @MinLength(1)
  password!: string;
}
```

Create `apps/gateway/src/auth/dto/verify-email.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @Length(16, 256)
  token!: string;
}
```

Create `apps/gateway/src/auth/dto/forgot-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}
```

Create `apps/gateway/src/auth/dto/reset-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(16, 256)
  token!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 72)
  @Matches(/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
  newPassword!: string;
}
```

Create `apps/gateway/src/auth/dto/auth-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@repo/shared';

export class UserPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty({ required: false, nullable: true }) avatarUrl!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserPublicDto }) user!: UserPublicDto;
  @ApiProperty() accessToken!: string;
}
```

- [ ] **Step 2: PasswordService (bcrypt cost 12)**

Create `apps/gateway/src/auth/password.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly cost = 12;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
```

- [ ] **Step 3: TokenService (JWT access + refresh rotation)**

Create `apps/gateway/src/auth/token.service.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { JWT_CONFIG, UserRole } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES,
      },
    );
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueTokens(
    user: { id: string; email: string; role: UserRole },
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens> {
    const accessToken = this.signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = this.generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + JWT_CONFIG.REFRESH_TOKEN_EXPIRES_DAYS * 86400 * 1000);

    const row = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshTokenId: row.id, refreshExpiresAt };
  }

  async rotateRefreshToken(
    rawRefreshToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, isRevoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!existing) throw new UnauthorizedException('Refresh token khong hop le');

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { isRevoked: true },
    });

    return this.issueTokens(
      { id: existing.user.id, email: existing.user.email, role: existing.user.role as UserRole },
      meta,
    );
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}
```

- [ ] **Step 4: PasswordService unit test**

Create `apps/gateway/test/unit/password.service.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../src/auth/password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hashes a password and returns a bcrypt string', async () => {
    const h = await svc.hash('Passw0rd!');
    expect(h).toMatch(/^\$2[aby]\$12\$/);
  });

  it('compare returns true for the correct password', async () => {
    const h = await svc.hash('Passw0rd!');
    expect(await svc.compare('Passw0rd!', h)).toBe(true);
  });

  it('compare returns false for the wrong password', async () => {
    const h = await svc.hash('Passw0rd!');
    expect(await svc.compare('wrong', h)).toBe(false);
  });
});
```

- [ ] **Step 5: TokenService unit test**

Create `apps/gateway/test/unit/token.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../src/auth/token.service';
import { UserRole } from '@repo/shared';

describe('TokenService', () => {
  let svc: TokenService;
  const prismaMock = {
    refreshToken: {
      create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const config = {
    getOrThrow: vi.fn().mockReturnValue('test-secret-1234567890'),
  } as unknown as ConfigService;
  const jwt = new JwtService({});

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new TokenService(jwt, config, prismaMock as never);
  });

  it('signAccessToken returns a JWT', () => {
    const tok = svc.signAccessToken({ sub: 'u1', email: 'a@b.c', role: UserRole.USER });
    expect(tok.split('.').length).toBe(3);
  });

  it('issueTokens creates a refresh token row', async () => {
    const out = await svc.issueTokens(
      { id: 'u1', email: 'a@b.c', role: UserRole.USER },
      { userAgent: 'jest', ipAddress: '127.0.0.1' },
    );
    expect(out.accessToken).toBeTypeOf('string');
    expect(out.refreshToken.length).toBeGreaterThan(40);
    expect(prismaMock.refreshToken.create).toHaveBeenCalledOnce();
  });

  it('rotateRefreshToken throws when token not found', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      svc.rotateRefreshToken('bad', { userAgent: 'x', ipAddress: 'y' }),
    ).rejects.toThrow(/khong hop le/);
  });

  it('rotateRefreshToken revokes old + issues new', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValueOnce({
      id: 'rt-old',
      user: { id: 'u1', email: 'a@b.c', role: 'user' },
    });
    const out = await svc.rotateRefreshToken('valid', { userAgent: 'x', ipAddress: 'y' });
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-old' },
      data: { isRevoked: true },
    });
    expect(out.accessToken).toBeTypeOf('string');
  });
});
```

- [ ] **Step 6: Run tests + commit**

```bash
cd apps/gateway && npm test -- password.service token.service
git add apps/gateway/src/auth apps/gateway/test/unit/password.service.spec.ts apps/gateway/test/unit/token.service.spec.ts
git commit -m "feat(gateway): auth DTOs, bcrypt password service, JWT token rotation service"
```

---

## Task 5: Auth — Strategies, Guards, AuthService, Verification

**Files:**
- Create: `apps/gateway/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/gateway/src/auth/strategies/google.strategy.ts`
- Create: `apps/gateway/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/gateway/src/auth/guards/google-auth.guard.ts`
- Create: `apps/gateway/src/auth/guards/roles.guard.ts`
- Create: `apps/gateway/src/auth/verification.service.ts`
- Create: `apps/gateway/src/auth/auth.service.ts`
- Create: `apps/gateway/test/unit/auth.service.spec.ts`

- [ ] **Step 1: JwtStrategy**

Create `apps/gateway/src/auth/strategies/jwt.strategy.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '@repo/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User khong ton tai');
    if (user.isLocked) throw new UnauthorizedException('Tai khoan da bi khoa');
    return { id: user.id, email: user.email, role: user.role as UserRole };
  }
}
```

- [ ] **Step 2: GoogleStrategy**

Create `apps/gateway/src/auth/strategies/google.strategy.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfilePayload {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  oauthProvider: 'google';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(_at: string, _rt: string, profile: any, done: VerifyCallback): Promise<void> {
    const payload: GoogleProfilePayload = {
      email: profile.emails?.[0]?.value ?? '',
      fullName: profile.displayName ?? 'Unknown',
      avatarUrl: profile.photos?.[0]?.value ?? null,
      oauthProvider: 'google',
    };
    done(null, payload);
  }
}
```

- [ ] **Step 3: Guards**

Create `apps/gateway/src/auth/guards/jwt-auth.guard.ts`:

```ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

Create `apps/gateway/src/auth/guards/google-auth.guard.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
```

Create `apps/gateway/src/auth/guards/roles.guard.ts`:

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '@repo/shared';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) throw new ForbiddenException('Chua xac thuc');
    if (!required.includes(req.user.role)) {
      throw new ForbiddenException('Khong co quyen truy cap');
    }
    return true;
  }
}
```

- [ ] **Step 4: VerificationService (in-memory + Redis-backed tokens)**

Create `apps/gateway/src/auth/verification.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly verifyTtl = 60 * 60 * 24; // 24h
  private readonly resetTtl = 60 * 60; // 1h

  constructor(private readonly redis: RedisService) {}

  private genToken(): string {
    return randomBytes(32).toString('base64url');
  }

  async createVerificationToken(userId: string): Promise<string> {
    const token = this.genToken();
    await this.redis.client.set(`verify:${token}`, userId, 'EX', this.verifyTtl);
    this.logger.log(`Verification token created for user ${userId}`);
    return token;
  }

  async consumeVerificationToken(token: string): Promise<string | null> {
    const userId = await this.redis.client.get(`verify:${token}`);
    if (!userId) return null;
    await this.redis.client.del(`verify:${token}`);
    return userId;
  }

  async createResetToken(userId: string): Promise<string> {
    const token = this.genToken();
    await this.redis.client.set(`reset:${token}`, userId, 'EX', this.resetTtl);
    return token;
  }

  async consumeResetToken(token: string): Promise<string | null> {
    const userId = await this.redis.client.get(`reset:${token}`);
    if (!userId) return null;
    await this.redis.client.del(`reset:${token}`);
    return userId;
  }
}
```

- [ ] **Step 5: AuthService**

Create `apps/gateway/src/auth/auth.service.ts`:

```ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService, IssuedTokens } from './token.service';
import { VerificationService } from './verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RateLimiterService } from '../redis/rate-limiter.service';
import { RATE_LIMIT, UserRole } from '@repo/shared';
import { GoogleProfilePayload } from './strategies/google.strategy';

export interface RequestContext {
  ip: string;
  userAgent: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly verification: VerificationService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async register(dto: RegisterDto, ctx: RequestContext) {
    const rl = await this.rateLimiter.consume(
      this.rateLimiter.registerBucket(ctx.ip),
      RATE_LIMIT.REGISTER_PER_HOUR,
      3600,
    );
    if (!rl.allowed) {
      throw new ForbiddenException(`Da dat gioi han dang ky. Thu lai sau ${rl.retryAfterSeconds}s`);
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email da ton tai');

    const passwordHash = await this.password.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: UserRole.USER,
        isVerified: false,
      },
    });

    const verifyToken = await this.verification.createVerificationToken(user.id);
    this.logger.log(`User ${user.email} registered. Verify token (TODO send email): ${verifyToken}`);

    return {
      user: this.toPublic(user),
      message: 'Dang ky thanh cong. Vui long kiem tra email de xac minh tai khoan.',
      verifyToken, // TODO: remove once email service is wired
    };
  }

  async login(dto: LoginDto, ctx: RequestContext): Promise<{ user: ReturnType<AuthService['toPublic']>; tokens: IssuedTokens }> {
    const rl = await this.rateLimiter.consume(
      this.rateLimiter.loginBucket(dto.email),
      RATE_LIMIT.LOGIN_ATTEMPTS_PER_15MIN,
      900,
    );
    if (!rl.allowed) {
      throw new ForbiddenException(`Qua nhieu lan dang nhap that bai. Thu lai sau ${rl.retryAfterSeconds}s`);
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }
    const ok = await this.password.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Email hoac mat khau khong dung');
    if (user.isLocked) throw new ForbiddenException('Tai khoan da bi khoa');
    if (!user.isVerified) throw new ForbiddenException('Vui long xac minh email truoc khi dang nhap');

    const tokens = await this.tokens.issueTokens(
      { id: user.id, email: user.email, role: user.role as UserRole },
      { userAgent: ctx.userAgent, ipAddress: ctx.ip },
    );
    return { user: this.toPublic(user), tokens };
  }

  async refresh(rawRefresh: string, ctx: RequestContext): Promise<IssuedTokens> {
    return this.tokens.rotateRefreshToken(rawRefresh, { userAgent: ctx.userAgent, ipAddress: ctx.ip });
  }

  async logout(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    await this.tokens.revokeRefreshToken(rawRefresh);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.verification.consumeVerificationToken(token);
    if (!userId) throw new UnauthorizedException('Token khong hop le hoac het han');
    await this.prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return; // do not leak existence
    const token = await this.verification.createResetToken(user.id);
    this.logger.log(`Password reset token for ${email}: ${token}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.verification.consumeResetToken(token);
    if (!userId) throw new UnauthorizedException('Token khong hop le hoac het han');
    const passwordHash = await this.password.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async loginWithGoogle(profile: GoogleProfilePayload, ctx: RequestContext): Promise<{ user: ReturnType<AuthService['toPublic']>; tokens: IssuedTokens }> {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          fullName: profile.fullName,
          oauthProvider: profile.oauthProvider,
          avatarUrl: profile.avatarUrl,
          isVerified: true,
          role: UserRole.USER,
        },
      });
    }
    if (user.isLocked) throw new ForbiddenException('Tai khoan da bi khoa');

    const tokens = await this.tokens.issueTokens(
      { id: user.id, email: user.email, role: user.role as UserRole },
      { userAgent: ctx.userAgent, ipAddress: ctx.ip },
    );
    return { user: this.toPublic(user), tokens };
  }

  toPublic(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isVerified: boolean;
    avatarUrl: string | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}
```

- [ ] **Step 6: AuthService unit test**

Create `apps/gateway/test/unit/auth.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/auth/auth.service';
import { PasswordService } from '../../src/auth/password.service';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@repo/shared';

describe('AuthService', () => {
  let svc: AuthService;
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: { updateMany: vi.fn() },
  };
  const password = new PasswordService();
  const tokens = {
    issueTokens: vi.fn().mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      refreshTokenId: 'id',
      refreshExpiresAt: new Date(),
    }),
    rotateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
  };
  const verification = {
    createVerificationToken: vi.fn().mockResolvedValue('vt'),
    consumeVerificationToken: vi.fn(),
    createResetToken: vi.fn().mockResolvedValue('rt'),
    consumeResetToken: vi.fn(),
  };
  const rateLimiter = {
    consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 }),
    loginBucket: (e: string) => `login:${e}`,
    registerBucket: (ip: string) => `reg:${ip}`,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AuthService(prisma as never, password, tokens as never, verification as never, rateLimiter as never);
  });

  it('register rejects duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'x' });
    await expect(
      svc.register(
        { email: 'a@b.c', fullName: 'X', password: 'Passw0rd!' },
        { ip: '1.1.1.1', userAgent: 'jest' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('register hashes password and creates user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 'u1',
      ...data,
      role: 'user',
      avatarUrl: null,
      createdAt: new Date(),
    }));
    const out = await svc.register(
      { email: 'a@b.c', fullName: 'A B', password: 'Passw0rd!' },
      { ip: '1.1.1.1', userAgent: 'jest' },
    );
    expect(out.user.email).toBe('a@b.c');
    expect(out.verifyToken).toBe('vt');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('login rejects unknown email with generic 401', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      svc.login({ email: 'x@y.z', password: 'Passw0rd!' }, { ip: '1.1.1.1', userAgent: 'jest' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login rejects locked accounts', async () => {
    const hash = await password.hash('Passw0rd!');
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.c', passwordHash: hash, role: 'user', isLocked: true, isVerified: true,
      fullName: 'X', avatarUrl: null, createdAt: new Date(),
    });
    await expect(
      svc.login({ email: 'a@b.c', password: 'Passw0rd!' }, { ip: '1.1.1.1', userAgent: 'jest' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('verifyEmail flips isVerified flag', async () => {
    verification.consumeVerificationToken.mockResolvedValueOnce('u1');
    await svc.verifyEmail('vt');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isVerified: true },
    });
  });
});
```

- [ ] **Step 7: Run tests + commit**

```bash
cd apps/gateway && npm test -- auth.service
git add apps/gateway/src/auth
git add apps/gateway/test/unit/auth.service.spec.ts
git commit -m "feat(gateway): JWT/Google strategies, guards, AuthService with verification + rate limit"
```

---

## Task 6: Auth Controller, Module Wiring

**Files:**
- Create: `apps/gateway/src/auth/auth.controller.ts`
- Create: `apps/gateway/src/auth/auth.module.ts`

- [ ] **Step 1: AuthController (all 11 routes)**

Create `apps/gateway/src/auth/auth.controller.ts`:

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { JWT_CONFIG } from '@repo/shared';
import { GoogleProfilePayload } from './strategies/google.strategy';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setRefreshCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/api/v1/auth',
    });
  }

  private requestContext(req: Request) {
    return {
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      userAgent: req.header('user-agent') ?? 'unknown',
    };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Dang ky tai khoan' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, this.requestContext(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dang nhap' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto, this.requestContext(req));
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    const refresh = cookies[REFRESH_COOKIE];
    if (!refresh) throw new UnauthorizedException('Khong tim thay refresh token');
    const tokens = await this.auth.refresh(refresh, this.requestContext(req));
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    return { accessToken: tokens.accessToken };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dang xuat' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    await this.auth.logout(cookies[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return { message: 'Dang xuat thanh cong' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Current user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto.token);
    return { message: 'Email da duoc xac minh' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgot(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'Neu email ton tai, link reset da duoc gui' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async reset(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { message: 'Mat khau da duoc cap nhat' };
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Google OAuth redirect' })
  googleStart() {
    // Passport handles redirect
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as GoogleProfilePayload;
    const { tokens } = await this.auth.loginWithGoogle(profile, this.requestContext(req));
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    res.redirect(`${frontend}/auth/oauth-success?token=${encodeURIComponent(tokens.accessToken)}`);
  }
}
```

- [ ] **Step 2: AuthModule**

Create `apps/gateway/src/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JWT_CONFIG } from '@repo/shared';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { VerificationService } from './verification.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    VerificationService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    GoogleAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, TokenService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/gateway/src/auth/auth.controller.ts apps/gateway/src/auth/auth.module.ts
git commit -m "feat(gateway): auth controller (register/login/refresh/logout/me/verify/reset/google) + module"
```

---

## Task 7: Users Module (Profile, Password Change)

**Files:**
- Create: `apps/gateway/src/users/dto/update-profile.dto.ts`
- Create: `apps/gateway/src/users/dto/change-password.dto.ts`
- Create: `apps/gateway/src/users/users.service.ts`
- Create: `apps/gateway/src/users/users.controller.ts`
- Create: `apps/gateway/src/users/users.module.ts`

- [ ] **Step 1: DTOs**

Create `apps/gateway/src/users/dto/update-profile.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string;
}
```

Create `apps/gateway/src/users/dto/change-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @Length(1)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 72)
  @Matches(/(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
  newPassword!: string;
}
```

- [ ] **Step 2: UsersService**

Create `apps/gateway/src/users/users.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (!dto.fullName && !dto.avatarUrl) {
      throw new BadRequestException('Khong co thong tin de cap nhat');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });
    return { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User khong ton tai');
    if (!user.passwordHash) {
      throw new BadRequestException('Tai khoan OAuth khong co mat khau');
    }
    const ok = await this.password.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Mat khau hien tai khong dung');
    const newHash = await this.password.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Mat khau da duoc cap nhat' };
  }
}
```

- [ ] **Step 3: UsersController**

Create `apps/gateway/src/users/users.controller.ts`:

```ts
import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Patch('password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.id, dto);
  }
}
```

- [ ] **Step 4: UsersModule**

Create `apps/gateway/src/users/users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PasswordService } from '../auth/password.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, PasswordService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/users
git commit -m "feat(gateway): users module — profile + password change"
```

---

## Task 8: Audits — DTOs, Queue Producer, Service

**Files:**
- Create: `apps/gateway/src/audits/dto/create-audit.dto.ts`
- Create: `apps/gateway/src/audits/dto/list-audits.query.ts`
- Create: `apps/gateway/src/audits/dto/compare-audits.query.ts`
- Create: `apps/gateway/src/audits/dto/audit-summary.dto.ts`
- Create: `apps/gateway/src/audits/audit-queue.producer.ts`
- Create: `apps/gateway/src/audits/audits.service.ts`
- Create: `apps/gateway/test/unit/audits.service.spec.ts`

- [ ] **Step 1: DTOs**

Create `apps/gateway/src/audits/dto/create-audit.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateAuditDto {
  @ApiProperty({ example: 'https://example.com' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetKeyword?: string;
}
```

Create `apps/gateway/src/audits/dto/list-audits.query.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditStatus } from '@repo/shared';

export class ListAuditsQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['createdAt', 'seoScore'] })
  @IsOptional()
  @IsString()
  sort?: 'createdAt' | 'seoScore' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AuditStatus })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  scoreMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  scoreMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;
}
```

Create `apps/gateway/src/audits/dto/compare-audits.query.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CompareAuditsQuery {
  @ApiProperty()
  @IsUUID()
  audit1!: string;

  @ApiProperty()
  @IsUUID()
  audit2!: string;
}
```

Create `apps/gateway/src/audits/dto/audit-summary.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { AuditStatus } from '@repo/shared';

export class AuditSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() domain!: string;
  @ApiProperty({ enum: AuditStatus }) status!: AuditStatus;
  @ApiProperty({ required: false, nullable: true }) seoScore!: number | null;
  @ApiProperty({ required: false, nullable: true }) targetKeyword!: string | null;
  @ApiProperty({ required: false, nullable: true }) crawlerType!: string | null;
  @ApiProperty({ required: false, nullable: true }) crawlDurationMs!: number | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ required: false, nullable: true }) completedAt!: Date | null;
}
```

- [ ] **Step 2: AuditQueueProducer (BullMQ enqueue crawl.start)**

Create `apps/gateway/src/audits/audit-queue.producer.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';

export interface CrawlStartPayload {
  auditId: string;
  url: string;
  options?: {
    targetKeyword?: string;
  };
}

@Injectable()
export class AuditQueueProducer {
  private readonly logger = new Logger(AuditQueueProducer.name);

  constructor(@InjectQueue(BULLMQ_QUEUES.CRAWL_START) private readonly queue: Queue) {}

  async enqueueCrawlStart(payload: CrawlStartPayload): Promise<void> {
    const job = await this.queue.add('crawl.start', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
      jobId: `crawl-${payload.auditId}`,
    });
    this.logger.log(`Enqueued crawl.start job ${job.id} for audit ${payload.auditId}`);
  }
}
```

- [ ] **Step 3: AuditsService**

Create `apps/gateway/src/audits/audits.service.ts`:

```ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { ListAuditsQuery } from './dto/list-audits.query';
import { validateUrlSafety } from '../common/utils/url-validator';
import { RateLimiterService } from '../redis/rate-limiter.service';
import { RedisService } from '../redis/redis.service';
import { RATE_LIMIT, AuditStatus, UserRole, REDIS_KEYS } from '@repo/shared';
import { AuditQueueProducer } from './audit-queue.producer';
import { ReportGrpcClient } from '../grpc/report.client';
import { clampPagination, buildPaginationMeta } from '../common/utils/pagination.util';
import { Prisma } from '../generated/prisma';

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: RateLimiterService,
    private readonly redis: RedisService,
    private readonly producer: AuditQueueProducer,
    private readonly reportClient: ReportGrpcClient,
  ) {}

  async createAudit(userId: string, dto: CreateAuditDto) {
    const rl = await this.rateLimiter.consume(
      this.rateLimiter.auditBucket(userId),
      RATE_LIMIT.AUDIT_PER_HOUR,
      3600,
    );
    if (!rl.allowed) {
      throw new BadRequestException(
        `Da dat gioi han ${RATE_LIMIT.AUDIT_PER_HOUR} audits/gio. Thu lai sau ${rl.retryAfterSeconds}s`,
      );
    }

    const safe = await validateUrlSafety(dto.url);

    const audit = await this.prisma.audit.create({
      data: {
        userId,
        url: safe.href,
        domain: safe.domain,
        targetKeyword: dto.targetKeyword ?? null,
        status: AuditStatus.PENDING,
      },
    });

    await this.producer.enqueueCrawlStart({
      auditId: audit.id,
      url: safe.href,
      options: { targetKeyword: dto.targetKeyword },
    });

    return {
      auditId: audit.id,
      status: audit.status,
      message: 'Audit da bat dau xu ly',
    };
  }

  async listAudits(userId: string, query: ListAuditsQuery) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.AuditWhereInput = { userId };

    if (query.search) {
      where.OR = [
        { domain: { contains: query.search, mode: 'insensitive' } },
        { url: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.scoreMin !== undefined || query.scoreMax !== undefined) {
      where.seoScore = {};
      if (query.scoreMin !== undefined) (where.seoScore as Prisma.DecimalFilter).gte = query.scoreMin;
      if (query.scoreMax !== undefined) (where.seoScore as Prisma.DecimalFilter).lte = query.scoreMax;
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(query.dateTo);
    }

    const orderBy: Prisma.AuditOrderByWithRelationInput =
      query.sort === 'seoScore'
        ? { seoScore: query.order ?? 'desc' }
        : { createdAt: query.order ?? 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.audit.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.audit.count({ where }),
    ]);

    return {
      data: data.map((a) => ({
        id: a.id,
        url: a.url,
        domain: a.domain,
        status: a.status,
        seoScore: a.seoScore ? Number(a.seoScore) : null,
        targetKeyword: a.targetKeyword,
        crawlerType: a.crawlerType,
        crawlDurationMs: a.crawlDurationMs,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getAuditDetail(userId: string, role: UserRole, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Khong co quyen xem audit nay');
    }

    let report: unknown = null;
    try {
      report = await this.reportClient.getReport(auditId);
    } catch (e) {
      this.logger.warn(`Report service unavailable for audit ${auditId}: ${(e as Error).message}`);
    }

    return {
      audit: {
        id: audit.id,
        url: audit.url,
        domain: audit.domain,
        status: audit.status,
        seoScore: audit.seoScore ? Number(audit.seoScore) : null,
        targetKeyword: audit.targetKeyword,
        crawlerType: audit.crawlerType,
        crawlDurationMs: audit.crawlDurationMs,
        createdAt: audit.createdAt,
        completedAt: audit.completedAt,
        errorMessage: audit.errorMessage,
      },
      report,
    };
  }

  async getStatus(userId: string, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId) throw new ForbiddenException('Khong co quyen');

    const stepsKey = REDIS_KEYS.auditCompletedSteps(auditId);
    const progressRaw = await this.redis.client.get(`audit:${auditId}:progress`);
    const stage = await this.redis.client.get(`audit:${auditId}:stage`);
    const progress = progressRaw ? Number(progressRaw) : audit.status === AuditStatus.COMPLETED ? 100 : 0;

    return {
      auditId,
      status: audit.status,
      progress,
      stage: stage ?? audit.status,
      seoScore: audit.seoScore ? Number(audit.seoScore) : undefined,
    };
  }

  async deleteAudit(userId: string, role: UserRole, auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Khong co quyen xoa');
    }
    if (
      audit.status === AuditStatus.CRAWLING ||
      audit.status === AuditStatus.ANALYZING ||
      audit.status === AuditStatus.REPORTING
    ) {
      throw new BadRequestException('Khong the xoa audit dang xu ly');
    }
    await this.prisma.audit.delete({ where: { id: auditId } });
  }

  async ensureCompleted(auditId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit khong ton tai');
    if (audit.status !== AuditStatus.COMPLETED) {
      throw new BadRequestException('Audit chua hoan thanh');
    }
    return audit;
  }
}
```

- [ ] **Step 4: AuditsService unit test**

Create `apps/gateway/test/unit/audits.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditsService } from '../../src/audits/audits.service';
import { AuditStatus, UserRole } from '@repo/shared';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

vi.mock('../../src/common/utils/url-validator', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue({ href: 'https://example.com/', domain: 'example.com' }),
}));

describe('AuditsService', () => {
  let svc: AuditsService;
  const prisma = {
    audit: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      delete: vi.fn(),
    },
  };
  const rl = {
    consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
    auditBucket: (u: string) => `audit:${u}`,
  };
  const redis = {
    client: {
      get: vi.fn().mockResolvedValue(null),
    },
  };
  const producer = { enqueueCrawlStart: vi.fn() };
  const reportClient = { getReport: vi.fn().mockRejectedValue(new Error('down')) };

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new AuditsService(
      prisma as never,
      rl as never,
      redis as never,
      producer as never,
      reportClient as never,
    );
  });

  it('createAudit blocks when rate limit hit', async () => {
    rl.consume.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 120 });
    await expect(
      svc.createAudit('u1', { url: 'https://example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createAudit creates pending row + enqueues crawl.start', async () => {
    prisma.audit.create.mockResolvedValueOnce({
      id: 'a1', status: AuditStatus.PENDING, userId: 'u1', url: 'https://example.com/',
    });
    const out = await svc.createAudit('u1', { url: 'https://example.com', targetKeyword: 'foo' });
    expect(out.auditId).toBe('a1');
    expect(out.status).toBe(AuditStatus.PENDING);
    expect(producer.enqueueCrawlStart).toHaveBeenCalledWith({
      auditId: 'a1',
      url: 'https://example.com/',
      options: { targetKeyword: 'foo' },
    });
  });

  it('getAuditDetail returns audit even when report service is down', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce({
      id: 'a1', userId: 'u1', url: 'x', domain: 'd', status: AuditStatus.COMPLETED, seoScore: null,
      targetKeyword: null, crawlerType: 'cheerio', crawlDurationMs: 1000, createdAt: new Date(),
      completedAt: new Date(), errorMessage: null,
    });
    const out = await svc.getAuditDetail('u1', UserRole.USER, 'a1');
    expect(out.audit.id).toBe('a1');
    expect(out.report).toBeNull();
  });

  it('getAuditDetail forbids non-owner non-admin', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce({ id: 'a1', userId: 'other' });
    await expect(svc.getAuditDetail('u1', UserRole.USER, 'a1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deleteAudit refuses while crawling', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce({
      id: 'a1', userId: 'u1', status: AuditStatus.CRAWLING,
    });
    await expect(svc.deleteAudit('u1', UserRole.USER, 'a1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteAudit 404 when missing', async () => {
    prisma.audit.findUnique.mockResolvedValueOnce(null);
    await expect(svc.deleteAudit('u1', UserRole.USER, 'a1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 5: Run tests + commit**

```bash
cd apps/gateway && npm test -- audits.service
git add apps/gateway/src/audits apps/gateway/test/unit/audits.service.spec.ts
git commit -m "feat(gateway): audit DTOs, queue producer, AuditsService (create/list/detail/delete/status)"
```

---

## Task 9: Audits Controller + Module (all 9 endpoints)

**Files:**
- Create: `apps/gateway/src/audits/audits.controller.ts`
- Create: `apps/gateway/src/audits/audits.module.ts`

- [ ] **Step 1: AuditsController**

Create `apps/gateway/src/audits/audits.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { ListAuditsQuery } from './dto/list-audits.query';
import { CompareAuditsQuery } from './dto/compare-audits.query';
import { ReportGrpcClient } from '../grpc/report.client';

@ApiTags('audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audits')
export class AuditsController {
  constructor(
    private readonly audits: AuditsService,
    private readonly reportClient: ReportGrpcClient,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Tao audit moi' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAuditDto) {
    return this.audits.createAudit(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liet ke audit' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditsQuery) {
    return this.audits.listAudits(user.id, query);
  }

  @Get('compare')
  @ApiOperation({ summary: 'So sanh 2 audit' })
  async compare(@CurrentUser() user: AuthenticatedUser, @Query() query: CompareAuditsQuery) {
    // Ownership check: ensure user owns both
    await Promise.all([
      this.audits.getAuditDetail(user.id, user.role, query.audit1),
      this.audits.getAuditDetail(user.id, user.role, query.audit2),
    ]);
    return this.reportClient.compareReports(query.audit1, query.audit2);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet audit' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.audits.getAuditDetail(user.id, user.role, id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Trang thai audit' })
  status(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.audits.getStatus(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoa audit' })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.audits.deleteAudit(user.id, user.role, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Tai PDF report' })
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    await this.audits.getAuditDetail(user.id, user.role, id);
    const audit = await this.audits.ensureCompleted(id);
    const { pdfUrl } = await this.reportClient.generatePdf(id);
    // pdfUrl is the Report service HTTP endpoint that streams the PDF
    res.redirect(302, pdfUrl);
    return undefined;
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tao share link' })
  async share(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.audits.getAuditDetail(user.id, user.role, id);
    return this.reportClient.createShareLink(id, user.id);
  }

  @Delete(':id/share')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Thu hoi share link' })
  async revokeShare(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.audits.getAuditDetail(user.id, user.role, id);
    await this.reportClient.revokeShareLink(id, user.id);
  }
}
```

- [ ] **Step 2: AuditsModule**

Create `apps/gateway/src/audits/audits.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BULLMQ_QUEUES } from '@repo/shared';
import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';
import { AuditQueueProducer } from './audit-queue.producer';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.CRAWL_START }),
  ],
  controllers: [AuditsController],
  providers: [AuditsService, AuditQueueProducer],
  exports: [AuditsService],
})
export class AuditsModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/gateway/src/audits/audits.controller.ts apps/gateway/src/audits/audits.module.ts
git commit -m "feat(gateway): audits controller (9 endpoints) + BullMQ wiring"
```

---

## Task 10: Shared Module (Public Shared Audit View)

**Files:**
- Create: `apps/gateway/src/shared/shared.controller.ts`
- Create: `apps/gateway/src/shared/shared.module.ts`

- [ ] **Step 1: SharedController**

Create `apps/gateway/src/shared/shared.controller.ts`:

```ts
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ReportGrpcClient } from '../grpc/report.client';

@ApiTags('shared')
@Controller('shared')
export class SharedController {
  constructor(private readonly reportClient: ReportGrpcClient) {}

  @Public()
  @Get('audits/:token')
  @ApiOperation({ summary: 'Xem audit duoc share' })
  async view(@Param('token') token: string) {
    if (!token || token.length < 8) {
      throw new NotFoundException('Token khong hop le');
    }
    try {
      return await this.reportClient.getSharedReport(token);
    } catch {
      throw new NotFoundException('Share link khong ton tai hoac da bi thu hoi');
    }
  }
}
```

- [ ] **Step 2: SharedModule**

Create `apps/gateway/src/shared/shared.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SharedController } from './shared.controller';

@Module({
  controllers: [SharedController],
})
export class SharedModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/gateway/src/shared
git commit -m "feat(gateway): public shared audit view endpoint"
```

---

## Task 11: Admin Module (Users, Rules, Stats)

**Files:**
- Create: `apps/gateway/src/admin/dto/list-users.query.ts`
- Create: `apps/gateway/src/admin/dto/update-user.dto.ts`
- Create: `apps/gateway/src/admin/dto/update-rules.dto.ts`
- Create: `apps/gateway/src/admin/admin.service.ts`
- Create: `apps/gateway/src/admin/admin.controller.ts`
- Create: `apps/gateway/src/admin/admin.module.ts`

- [ ] **Step 1: DTOs**

Create `apps/gateway/src/admin/dto/list-users.query.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserRole } from '@repo/shared';

export class ListUsersQuery {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsBooleanString() isLocked?: string;
}
```

Create `apps/gateway/src/admin/dto/update-user.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty()
  @IsBoolean()
  isLocked!: boolean;
}
```

Create `apps/gateway/src/admin/dto/update-rules.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class RuleWeightUpdate {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  weight!: number;
}

export class UpdateRulesDto {
  @ApiProperty({ type: [RuleWeightUpdate] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RuleWeightUpdate)
  rules!: RuleWeightUpdate[];
}
```

- [ ] **Step 2: AdminService**

Create `apps/gateway/src/admin/admin.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRulesDto } from './dto/update-rules.dto';
import { AnalyzerGrpcClient } from '../grpc/analyzer.client';
import { clampPagination, buildPaginationMeta } from '../common/utils/pagination.util';
import { AuditStatus } from '@repo/shared';
import { Prisma } from '../generated/prisma';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: AnalyzerGrpcClient,
  ) {}

  async listUsers(query: ListUsersQuery) {
    const { page, limit, skip } = clampPagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (query.isLocked !== undefined) where.isLocked = query.isLocked === 'true';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { audits: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        isVerified: u.isVerified,
        isLocked: u.isLocked,
        oauthProvider: u.oauthProvider,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        auditCount: u._count.audits,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async updateUser(adminId: string, targetId: string, dto: UpdateUserDto) {
    if (adminId === targetId && dto.isLocked) {
      throw new BadRequestException('Admin khong the lock chinh minh');
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User khong ton tai');
    return this.prisma.user.update({
      where: { id: targetId },
      data: { isLocked: dto.isLocked },
      select: { id: true, email: true, isLocked: true },
    });
  }

  listRules() {
    return this.analyzer.listRules().then((rules) => ({ rules }));
  }

  async updateRules(dto: UpdateRulesDto) {
    const updated = [];
    for (const r of dto.rules) {
      try {
        // Resolve rule name → ruleId by listing first (cached server-side ideally)
        const all = await this.analyzer.listRules();
        const target = all.find((x) => x.name === r.name);
        if (!target) continue;
        const u = await this.analyzer.updateRuleWeight(target.id, r.weight);
        updated.push(u);
      } catch (e) {
        throw new BadRequestException(`Khong the cap nhat rule ${r.name}: ${(e as Error).message}`);
      }
    }
    return { updated };
  }

  async getStats(periodDays = 30) {
    const since = new Date(Date.now() - periodDays * 86400 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalAudits,
      newUsersToday,
      auditsToday,
      successCount,
      failedCount,
      avgScoreAgg,
      avgDurationAgg,
      topDomains,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.audit.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.audit.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.audit.count({ where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } } }),
      this.prisma.audit.count({ where: { status: AuditStatus.FAILED, createdAt: { gte: since } } }),
      this.prisma.audit.aggregate({
        where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } },
        _avg: { seoScore: true },
      }),
      this.prisma.audit.aggregate({
        where: { status: AuditStatus.COMPLETED, createdAt: { gte: since } },
        _avg: { crawlDurationMs: true },
      }),
      this.prisma.audit.groupBy({
        by: ['domain'],
        where: { createdAt: { gte: since } },
        _count: { domain: true },
        orderBy: { _count: { domain: 'desc' } },
        take: 10,
      }),
    ]);

    const totalAttempts = successCount + failedCount;
    const successRate = totalAttempts > 0 ? Number(((successCount / totalAttempts) * 100).toFixed(2)) : 0;

    return {
      overview: {
        totalUsers,
        totalAudits,
        successRate,
        avgCrawlTimeMs: Math.round(Number(avgDurationAgg._avg.crawlDurationMs ?? 0)),
        avgSeoScore: Number((avgScoreAgg._avg.seoScore ?? 0).toString()),
      },
      newUsersToday,
      auditsToday,
      topDomains: topDomains.map((d) => ({ domain: d.domain, count: d._count.domain })),
    };
  }
}
```

- [ ] **Step 3: AdminController**

Create `apps/gateway/src/admin/admin.controller.ts`:

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { UserRole } from '@repo/shared';
import { AdminService } from './admin.service';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRulesDto } from './dto/update-rules.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Query() query: ListUsersQuery) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() me: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(me.id, id, dto);
  }

  @Get('rules')
  listRules() {
    return this.admin.listRules();
  }

  @Put('rules')
  updateRules(@Body() dto: UpdateRulesDto) {
    return this.admin.updateRules(dto);
  }

  @Get('stats')
  getStats(@Query('period') period?: string) {
    const days = period?.endsWith('d') ? parseInt(period, 10) : 30;
    return this.admin.getStats(days);
  }
}
```

- [ ] **Step 4: AdminModule**

Create `apps/gateway/src/admin/admin.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/admin
git commit -m "feat(gateway): admin module — users, rule weights (proxy), stats aggregations"
```

---

## Task 12: WebSocket Gateway + Redis Pub/Sub Subscriber

**Files:**
- Create: `apps/gateway/src/websocket/audit.gateway.ts`
- Create: `apps/gateway/src/websocket/progress-subscriber.service.ts`
- Create: `apps/gateway/src/websocket/websocket.module.ts`

- [ ] **Step 1: AuditGateway (Socket.IO with JWT handshake auth)**

Create `apps/gateway/src/websocket/audit.gateway.ts`:

```ts
import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

interface AuthSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
})
export class AuditGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AuditGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('Audit WebSocket gateway initialized at /ws');
  }

  handleConnection(client: AuthSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace(/^Bearer /, '') as string | undefined);
      if (!token) throw new UnauthorizedException('Missing token');
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.userId = payload.sub;
      this.logger.log(`Socket ${client.id} connected (user ${payload.sub})`);
    } catch (e) {
      this.logger.warn(`Rejecting socket ${client.id}: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  @SubscribeMessage('audit:subscribe')
  subscribeToAudit(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { auditId: string },
  ) {
    if (!client.userId) return { error: 'Unauthorized' };
    const room = `audit:${payload.auditId}`;
    client.join(room);
    return { joined: room };
  }

  @SubscribeMessage('audit:unsubscribe')
  unsubscribe(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { auditId: string },
  ) {
    const room = `audit:${payload.auditId}`;
    client.leave(room);
    return { left: room };
  }

  emitProgress(auditId: string, data: unknown) {
    this.server.to(`audit:${auditId}`).emit('audit:progress', data);
  }

  emitCompleted(auditId: string, data: unknown) {
    this.server.to(`audit:${auditId}`).emit('audit:completed', data);
  }

  emitFailed(auditId: string, data: unknown) {
    this.server.to(`audit:${auditId}`).emit('audit:failed', data);
  }
}
```

- [ ] **Step 2: ProgressSubscriberService (Redis Pub/Sub bridge)**

Create `apps/gateway/src/websocket/progress-subscriber.service.ts`:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AuditGateway } from './audit.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AuditStatus } from '@repo/shared';

interface ProgressPayload {
  auditId: string;
  progress?: number;
  stage?: string;
  message?: string;
  finalScore?: number;
  error?: string;
}

@Injectable()
export class ProgressSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(ProgressSubscriberService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: AuditGateway,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.redis.subscribe('audit.progress', (data) => this.handleProgress(data as ProgressPayload));
    await this.redis.subscribe('audit.completed', (data) => this.handleCompleted(data as ProgressPayload));
    await this.redis.subscribe('audit.failed', (data) => this.handleFailed(data as ProgressPayload));
    this.logger.log('Subscribed to audit.progress / audit.completed / audit.failed channels');
  }

  private async handleProgress(p: ProgressPayload) {
    if (!p?.auditId) return;
    if (typeof p.progress === 'number') {
      await this.redis.client.set(`audit:${p.auditId}:progress`, String(p.progress), 'EX', 3600);
    }
    if (p.stage) {
      await this.redis.client.set(`audit:${p.auditId}:stage`, p.stage, 'EX', 3600);
    }
    this.gateway.emitProgress(p.auditId, p);
  }

  private async handleCompleted(p: ProgressPayload) {
    if (!p?.auditId) return;
    await this.prisma.audit.update({
      where: { id: p.auditId },
      data: {
        status: AuditStatus.COMPLETED,
        seoScore: p.finalScore ?? null,
        completedAt: new Date(),
      },
    });
    await this.redis.client.set(`audit:${p.auditId}:progress`, '100', 'EX', 3600);
    this.gateway.emitCompleted(p.auditId, p);
  }

  private async handleFailed(p: ProgressPayload) {
    if (!p?.auditId) return;
    await this.prisma.audit.update({
      where: { id: p.auditId },
      data: {
        status: AuditStatus.FAILED,
        errorMessage: p.error ?? p.message ?? 'Unknown error',
      },
    });
    this.gateway.emitFailed(p.auditId, p);
  }
}
```

- [ ] **Step 3: WebSocketModule**

Create `apps/gateway/src/websocket/websocket.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditGateway } from './audit.gateway';
import { ProgressSubscriberService } from './progress-subscriber.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [AuditGateway, ProgressSubscriberService],
  exports: [AuditGateway],
})
export class WebsocketModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/websocket
git commit -m "feat(gateway): Socket.IO audit gateway + Redis Pub/Sub progress bridge"
```

---

## Task 13: Health Module + AppModule Wiring + main.ts Update

**Files:**
- Create: `apps/gateway/src/health/health.controller.ts`
- Create: `apps/gateway/src/health/health.module.ts`
- Modify: `apps/gateway/src/app.module.ts`
- Modify: `apps/gateway/src/main.ts`
- Modify: `apps/gateway/.env.example`

- [ ] **Step 1: HealthController**

Create `apps/gateway/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CrawlerGrpcClient } from '../grpc/crawler.client';
import { AnalyzerGrpcClient } from '../grpc/analyzer.client';
import { ReportGrpcClient } from '../grpc/report.client';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly crawler: CrawlerGrpcClient,
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly report: ReportGrpcClient,
  ) {}

  @Public()
  @Get()
  async check() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.client.ping(),
      this.crawler.isHealthy(),
      this.analyzer.isHealthy(),
      this.report.isHealthy(),
    ]);
    return {
      status: 'ok',
      version: process.env.npm_package_version ?? '0.0.1',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      services: {
        database: checks[0].status === 'fulfilled',
        redis: checks[1].status === 'fulfilled' && checks[1].value === 'PONG',
        crawler: checks[2].status === 'fulfilled' && checks[2].value === true,
        analyzer: checks[3].status === 'fulfilled' && checks[3].value === true,
        report: checks[4].status === 'fulfilled' && checks[4].value === true,
      },
    };
  }
}
```

- [ ] **Step 2: HealthModule**

Create `apps/gateway/src/health/health.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 3: Replace AppModule to wire all feature modules**

Replace `apps/gateway/src/app.module.ts`:

```ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { GrpcModule } from './grpc/grpc.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditsModule } from './audits/audits.module';
import { SharedModule } from './shared/shared.module';
import { AdminModule } from './admin/admin.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    GrpcModule,
    AuthModule,
    UsersModule,
    AuditsModule,
    SharedModule,
    AdminModule,
    WebsocketModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

- [ ] **Step 4: Update main.ts (cookie parser, helmet, graceful shutdown)**

Replace `apps/gateway/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SEO Analyst Platform API')
    .setDescription('Gateway REST API for SEO analysis microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`Gateway running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 5: Update .env.example**

Replace `apps/gateway/.env.example`:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database
GATEWAY_DATABASE_URL=postgresql://gateway_user:gateway_pass@localhost:5432/gateway_db?schema=public

# Redis (BullMQ + Pub/Sub + Rate limiter)
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=replace-with-32-byte-random-secret-please
JWT_REFRESH_SECRET=replace-with-32-byte-random-secret-please

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# gRPC service URLs
CRAWLER_GRPC_URL=localhost:50051
ANALYZER_GRPC_URL=localhost:50053
KEYWORD_GRPC_URL=localhost:50054
REPORT_GRPC_URL=localhost:50055
```

- [ ] **Step 6: Install missing runtime deps**

```bash
cd apps/gateway
npm install cookie-parser helmet passport-google-oauth20
npm install -D @types/cookie-parser @types/passport-google-oauth20
```

- [ ] **Step 7: Verify build + commit**

```bash
cd apps/gateway && npm run check-types
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
git add apps/gateway/src/health apps/gateway/src/app.module.ts apps/gateway/src/main.ts apps/gateway/.env.example apps/gateway/package.json apps/gateway/package-lock.json
git commit -m "feat(gateway): wire all modules in AppModule, health endpoint, hardened main.ts"
```

---

## Task 14: Integration Test — Auth E2E

**Files:**
- Create: `apps/gateway/test/integration/auth.e2e-spec.ts`

- [ ] **Step 1: Auth E2E test (in-memory + supertest)**

Create `apps/gateway/test/integration/auth.e2e-spec.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AuthModule } from '../../src/auth/auth.module';
import { RedisModule } from '../../src/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';

const fakeUserStore = new Map<string, any>();

const prismaMock = {
  user: {
    findUnique: vi.fn(({ where }: any) =>
      Promise.resolve(fakeUserStore.get(where.email ?? where.id) ?? null),
    ),
    create: vi.fn(({ data }: any) => {
      const user = {
        id: `u-${fakeUserStore.size + 1}`,
        ...data,
        createdAt: new Date(),
        avatarUrl: null,
        isLocked: false,
      };
      fakeUserStore.set(user.email, user);
      fakeUserStore.set(user.id, user);
      return Promise.resolve(user);
    }),
    update: vi.fn(({ where, data }: any) => {
      const u = fakeUserStore.get(where.id);
      Object.assign(u, data);
      return Promise.resolve(u);
    }),
  },
  refreshToken: {
    create: vi.fn(() => Promise.resolve({ id: 'rt-1' })),
    findFirst: vi.fn(() => Promise.resolve(null)),
    update: vi.fn(),
    updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
  },
};

const redisStore = new Map<string, string>();
const redisMock = {
  client: {
    set: vi.fn(async (k: string, v: string) => {
      redisStore.set(k, v);
      return 'OK';
    }),
    get: vi.fn(async (k: string) => redisStore.get(k) ?? null),
    del: vi.fn(async (k: string) => {
      redisStore.delete(k);
      return 1;
    }),
    multi: vi.fn(() => ({
      zremrangebyscore: () => undefined,
      zcard: () => undefined,
      zadd: () => undefined,
      expire: () => undefined,
      exec: async () => [
        [null, 0],
        [null, 0],
        [null, 1],
        [null, 1],
      ],
    })),
    zrem: vi.fn(),
    zrange: vi.fn(async () => []),
  },
};

describe('Auth E2E', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890';
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register creates a user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'foo@example.com', fullName: 'Foo Bar', password: 'Passw0rd!' })
      .expect(201);
    expect(res.body.user.email).toBe('foo@example.com');
    expect(res.body.user.isVerified).toBe(false);
    expect(res.body.verifyToken).toBeDefined();
  });

  it('POST /auth/login fails before verification', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'foo@example.com', password: 'Passw0rd!' })
      .expect(403);
  });

  it('POST /auth/verify-email then login succeeds', async () => {
    // Grab the verify token created by register
    const token = Array.from(redisStore.entries()).find(([k]) => k.startsWith('verify:'))?.[0].slice(7);
    expect(token).toBeDefined();
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(200);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'foo@example.com', password: 'Passw0rd!' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=/);
  });

  it('POST /auth/register rejects weak password (validation)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'weak@example.com', fullName: 'Weak', password: 'short' })
      .expect(400);
  });
});
```

- [ ] **Step 2: Install supertest**

```bash
cd apps/gateway && npm install -D supertest @types/supertest
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/gateway && npm test -- auth.e2e
git add apps/gateway/test/integration/auth.e2e-spec.ts apps/gateway/package.json apps/gateway/package-lock.json
git commit -m "test(gateway): auth E2E covering register/verify/login flow"
```

---

## Task 15: Integration Test — Audits E2E + Final Verification

**Files:**
- Create: `apps/gateway/test/integration/audits.e2e-spec.ts`

- [ ] **Step 1: Audits E2E test**

Create `apps/gateway/test/integration/audits.e2e-spec.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext, CanActivate } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { AuditsModule } from '../../src/audits/audits.module';
import { GrpcModule } from '../../src/grpc/grpc.module';
import { RedisModule } from '../../src/redis/redis.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { ReportGrpcClient } from '../../src/grpc/report.client';
import { CrawlerGrpcClient } from '../../src/grpc/crawler.client';
import { AnalyzerGrpcClient } from '../../src/grpc/analyzer.client';
import { AuditQueueProducer } from '../../src/audits/audit-queue.producer';
import { AuditStatus, UserRole } from '@repo/shared';

vi.mock('../../src/common/utils/url-validator', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue({ href: 'https://example.com/', domain: 'example.com' }),
}));

const audits: any[] = [];
const prismaMock = {
  audit: {
    create: vi.fn(({ data }: any) => {
      const a = { id: `a-${audits.length + 1}`, ...data, createdAt: new Date(), completedAt: null, errorMessage: null, crawlerType: null, crawlDurationMs: null, seoScore: null };
      audits.push(a);
      return Promise.resolve(a);
    }),
    findUnique: vi.fn(({ where }: any) => Promise.resolve(audits.find((a) => a.id === where.id) ?? null)),
    findMany: vi.fn(() => Promise.resolve(audits)),
    count: vi.fn(() => Promise.resolve(audits.length)),
    delete: vi.fn(({ where }: any) => {
      const i = audits.findIndex((a) => a.id === where.id);
      if (i >= 0) audits.splice(i, 1);
      return Promise.resolve();
    }),
  },
};

const redisStore = new Map<string, string>();
const redisMock = {
  client: {
    get: vi.fn(async (k: string) => redisStore.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      redisStore.set(k, v);
      return 'OK';
    }),
    multi: vi.fn(() => ({
      zremrangebyscore: () => undefined,
      zcard: () => undefined,
      zadd: () => undefined,
      expire: () => undefined,
      exec: async () => [[null, 0], [null, 0], [null, 1], [null, 1]],
    })),
    zrem: vi.fn(),
    zrange: vi.fn(async () => []),
  },
};

class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.user = { id: 'user-1', email: 'u@e.com', role: UserRole.USER };
    return true;
  }
}

describe('Audits E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, GrpcModule, AuditsModule],
    })
      .overrideProvider(PrismaService).useValue(prismaMock)
      .overrideProvider(RedisService).useValue(redisMock)
      .overrideProvider(CrawlerGrpcClient).useValue({ isHealthy: vi.fn() })
      .overrideProvider(AnalyzerGrpcClient).useValue({ isHealthy: vi.fn() })
      .overrideProvider(ReportGrpcClient).useValue({
        getReport: vi.fn().mockResolvedValue({ summary: 'ok' }),
        compareReports: vi.fn().mockResolvedValue({ delta: 5 }),
        createShareLink: vi.fn().mockResolvedValue({ shareToken: 'tok', shareUrl: 'https://x/y' }),
        revokeShareLink: vi.fn().mockResolvedValue({ revoked: true }),
        getSharedReport: vi.fn(),
        generatePdf: vi.fn().mockResolvedValue({ pdfUrl: 'https://x/p.pdf' }),
        isHealthy: vi.fn(),
      })
      .overrideProvider(AuditQueueProducer).useValue({ enqueueCrawlStart: vi.fn() })
      .overrideGuard(JwtAuthGuard).useClass(FakeJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /audits creates a pending audit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com' })
      .expect(202);
    expect(res.body.auditId).toBeDefined();
    expect(res.body.status).toBe(AuditStatus.PENDING);
  });

  it('GET /audits lists user audits', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audits')
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('GET /audits/:id returns detail with proxied report', async () => {
    const id = audits[0].id;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/audits/${id}`)
      .expect(200);
    expect(res.body.audit.id).toBe(id);
    expect(res.body.report).toEqual({ summary: 'ok' });
  });

  it('POST /audits rejects invalid URL (validation pipe)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'not a url' })
      .expect(400);
  });

  it('DELETE /audits/:id removes a pending audit', async () => {
    const id = audits[0].id;
    audits[0].status = AuditStatus.COMPLETED;
    await request(app.getHttpServer()).delete(`/api/v1/audits/${id}`).expect(204);
  });
});
```

- [ ] **Step 2: Run full test suite**

```bash
cd apps/gateway && npm test
```

Expected: All unit + integration suites pass (url-validator, rate-limiter, password.service, token.service, auth.service, audits.service, auth.e2e, audits.e2e). 0 failures.

- [ ] **Step 3: Type-check + lint**

```bash
cd apps/gateway && npm run check-types && npm run lint
```

- [ ] **Step 4: Smoke run**

```bash
docker compose up -d redis gateway-db
cd apps/gateway && npm run dev
# In another terminal:
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok",...,"services":{"database":true,"redis":true,...}}
```

- [ ] **Step 5: Final commit**

```bash
git add apps/gateway/test/integration/audits.e2e-spec.ts
git commit -m "test(gateway): audits E2E covering create/list/detail/delete + validation"
```

---

## Verification Checklist

After completing all 15 tasks, verify:

- [ ] `cd apps/gateway && npm test` — all unit + integration suites pass, 0 failures
- [ ] `cd apps/gateway && npm run check-types` — no TypeScript errors
- [ ] `cd apps/gateway && npm run lint` — no lint errors
- [ ] `docker compose up -d redis gateway-db && cd apps/gateway && npm run dev` boots cleanly
- [ ] `GET /api/v1/health` returns `{status: "ok", services: {...}}` even if downstream services are down (graceful)
- [ ] `POST /api/v1/auth/register` → `POST /api/v1/auth/verify-email` → `POST /api/v1/auth/login` returns access token + sets `refresh_token` HttpOnly cookie
- [ ] `POST /api/v1/auth/refresh` rotates the refresh token (old token revoked, new one issued)
- [ ] `POST /api/v1/audits` with a valid public URL returns 202 + `auditId` and a `crawl.start` job appears in the BullMQ queue (`redis-cli LRANGE bull:crawl.start:wait 0 -1`)
- [ ] `POST /api/v1/audits` with `http://localhost` returns 400 (SSRF blocked)
- [ ] `POST /api/v1/audits` 11 times in an hour → 11th request returns 400 with `Da dat gioi han` message
- [ ] `GET /api/v1/audits/:id` proxies to Report gRPC `GetReport`; if Report is down, returns audit row with `report: null`
- [ ] `GET /api/v1/admin/users` as a non-admin returns 403; as admin returns paginated list
- [ ] `PUT /api/v1/admin/rules` proxies to Analyzer gRPC `UpdateRuleWeight`
- [ ] WebSocket client connecting to `ws://localhost:3000/ws` with a valid JWT in `auth.token` joins room `audit:{id}` and receives `audit:progress` events when `redis-cli PUBLISH audit.progress '{"auditId":"x","progress":50,"stage":"crawling"}'` is run
- [ ] Connecting to `/ws` without a token immediately disconnects
- [ ] Errors come back as `application/problem+json` with `requestId` field
- [ ] `x-request-id` header is present on every response (echoes incoming or generates UUID)
- [ ] Swagger UI at `http://localhost:3000/api/docs` lists all 29 endpoints grouped by tag
- [ ] Refresh tokens are stored hashed (SHA-256) in `refresh_tokens.token_hash` (verified by inspecting DB after a login)
- [ ] Bcrypt cost factor is 12 (verified by inspecting `users.password_hash` — starts with `$2b$12$`)

---

## What Comes Next

This plan produces a **fully functional Gateway service** that handles auth, orchestrates audits, proxies to downstream services via gRPC, and streams progress over WebSocket. Downstream plans depend on it as follows:

| Next Plan | What it consumes from this plan |
|-----------|---------------------------------|
| Plan 3: Crawler Service | Consumes the `crawl.start` BullMQ jobs enqueued by Gateway; publishes `crawl.done`/`audit.progress` events that Gateway re-emits over WebSocket |
| Plan 4: SEO Analyzer | Gateway admin endpoints proxy to Analyzer gRPC `ListRules`/`UpdateRuleWeight` |
| Plan 5: Keyword Analyzer | (No direct Gateway dependency — invoked by the choreography layer; Gateway only sees the eventual `audit.completed` event) |
| Plan 6: Report Service | Gateway audit detail/compare/share/PDF endpoints proxy to Report gRPC; Report publishes `report.done` and `audit.completed` events that Gateway listens to |
| Plan 7: Integration | Wires the full pipeline (crawl.done → analyze.start → analyze.done → report.start → report.done) end-to-end; Gateway is the entry point + observer |

**Known follow-ups** (out of scope for this plan, to be handled later):
- Wire a real email service (Postmark/SES) for verification + password reset (currently logs the token).
- Add Redis adapter for Socket.IO so multiple Gateway pods can share rooms (`@socket.io/redis-adapter`) — required only when scaling horizontally.
- Distributed tracing (OpenTelemetry) — propagate `x-request-id` to gRPC metadata so downstream service logs can be correlated.
- Circuit breaker (e.g. `cockatiel`) around gRPC clients — currently they degrade by returning null/throwing, but no half-open state.
- Per-endpoint Swagger response schemas — currently most routes only have `@ApiOperation` summaries.
- CSRF protection on `/auth/refresh` since it relies on a cookie — add a double-submit token or restrict origin via SameSite=strict in production.
