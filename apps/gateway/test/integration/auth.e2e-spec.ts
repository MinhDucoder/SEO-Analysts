import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock passport-google-oauth20 to avoid CJS interop issues in test environment
vi.mock('passport-google-oauth20', () => ({
  Strategy: class MockGoogleStrategy {
    constructor(_opts: any, _verify: any) {}
    authenticate() {}
  },
}));
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AuthModule } from '../../src/auth/auth.module';
import { RedisModule } from '../../src/infra/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { RateLimiterService } from '../../src/infra/redis/rate-limiter.service';
import { GoogleStrategy } from '../../src/auth/strategies/google.strategy';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';

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

const rateLimiterMock = {
  consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 }),
  loginBucket: (e: string) => `login:${e}`,
  registerBucket: (ip: string) => `reg:${ip}`,
  auditBucket: (u: string) => `audit:${u}`,
};

describe('Auth E2E', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/google/callback';
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .overrideProvider(RateLimiterService)
      .useValue(rateLimiterMock)
      .overrideProvider(GoogleStrategy)
      .useValue({ validate: vi.fn() })
      .overrideProvider(JwtStrategy)
      .useValue({ validate: vi.fn() })
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
