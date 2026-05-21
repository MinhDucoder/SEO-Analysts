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
import { INestApplication, ValidationPipe, ExecutionContext, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { AuditsModule } from '../../src/audits/audits.module';
import { GrpcModule } from '../../src/infra/grpc/grpc.module';
import { RedisModule } from '../../src/infra/redis/redis.module';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { RateLimiterService } from '../../src/infra/redis/rate-limiter.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { ReportGrpcClient } from '../../src/infra/grpc/report.client';
import { CrawlerGrpcClient } from '../../src/infra/grpc/crawler.client';
import { AnalyzerGrpcClient } from '../../src/infra/grpc/analyzer.client';
import { AuditQueueProducer } from '../../src/audits/services/audit-queue.producer';
import { EntitlementService } from '../../src/billing/services/entitlement.service';
import { QuotaCounterService } from '../../src/billing/services/quota-counter.service';
import { UserRole } from '@repo/shared';

vi.mock('../../src/common/utils/url-validator', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue({ href: 'https://example.com/', domain: 'example.com' }),
}));

const redisMock = {
  client: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
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

// RateLimiterService: always allow (not the quota under test here)
const rateLimiterMock = {
  auditBucket: vi.fn((userId: string) => `audit:${userId}`),
  consume: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
};

const prismaMock = {
  audit: {
    create: vi.fn(({ data }: any) =>
      Promise.resolve({ id: 'test-audit-id', ...data, createdAt: new Date(), completedAt: null }),
    ),
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    delete: vi.fn(async () => undefined),
  },
};

class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.user = { id: 'user-free-1', email: 'free@example.com', role: UserRole.USER };
    return true;
  }
}

describe('Quota enforcement on POST /audits (Free plan)', () => {
  let app: INestApplication;
  const consume = vi.fn();

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/google/callback';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        GrpcModule,
        AuditsModule,
      ],
    })
      .overrideProvider(PrismaService).useValue(prismaMock)
      .overrideProvider(RedisService).useValue(redisMock)
      .overrideProvider(RateLimiterService).useValue(rateLimiterMock)
      .overrideProvider(CrawlerGrpcClient).useValue({ isHealthy: vi.fn() })
      .overrideProvider(AnalyzerGrpcClient).useValue({ isHealthy: vi.fn() })
      .overrideProvider(ReportGrpcClient).useValue({
        getReport: vi.fn().mockResolvedValue({ summary: 'ok' }),
        compareReports: vi.fn().mockResolvedValue({ delta: 0 }),
        createShareLink: vi.fn().mockResolvedValue({ shareToken: 'tok', shareUrl: 'https://x/y' }),
        revokeShareLink: vi.fn().mockResolvedValue({ revoked: true }),
        generatePdf: vi.fn().mockResolvedValue({ pdfUrl: 'https://x/p.pdf' }),
        isHealthy: vi.fn(),
      })
      .overrideProvider(AuditQueueProducer).useValue({
        enqueueCrawlStart: vi.fn(),
        enqueueSiteCrawlStart: vi.fn(),
      })
      .overrideProvider(EntitlementService).useValue({
        getEffectivePlan: vi.fn(async () => 'free'),
        hasFeature: vi.fn(async () => ({ allowed: true })),
        checkSiteAuditPageCount: vi.fn(async () => ({ allowed: true })),
      })
      .overrideProvider(QuotaCounterService).useValue({ consume })
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

  it('returns 202 ACCEPTED when quota is available', async () => {
    consume.mockResolvedValueOnce({
      allowed: true,
      used: 1,
      remaining: 9,
      resetAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(202);
    expect(res.body.auditId).toBeDefined();
  });

  it('returns 429 with QUOTA_EXCEEDED when Free plan monthly quota is exhausted', async () => {
    consume.mockResolvedValueOnce({
      allowed: false,
      used: 10,
      remaining: 0,
      resetAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
  });

  it('sets X-RateLimit-* headers on 429 response', async () => {
    consume.mockResolvedValueOnce({
      allowed: false,
      used: 10,
      remaining: 0,
      resetAt: new Date('2026-06-01T00:00:00.000Z'),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(429);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBe('0');
    expect(res.headers['x-quota-reset']).toBeDefined();
  });

  it('returns 403 FEATURE_NOT_AVAILABLE for site-mode on Free plan', async () => {
    // Free plan does NOT have SITE_AUDIT feature
    const entitlement = app.get(EntitlementService) as any;
    entitlement.hasFeature.mockResolvedValueOnce({ allowed: false });
    // consume should not be reached (quota guard runs before service check, but
    // the service check blocks after the guard passes — provide a passing quota)
    consume.mockResolvedValueOnce({
      allowed: true,
      used: 1,
      remaining: 9,
      resetAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com', mode: 'site', maxUrls: 100 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FEATURE_NOT_AVAILABLE');
  });
});
