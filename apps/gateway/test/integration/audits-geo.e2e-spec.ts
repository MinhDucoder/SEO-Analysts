/**
 * @file Gateway E2E — POST /audits with GEO flag.
 *
 * Tests the entitlement gate that lives in AuditsService.createAudit()
 * (NOT a guard — it's an inline canRunGeo() check).  We stub the entire
 * EntitlementService so we can control the canRunGeo() return value for each
 * scenario without a real billing DB.
 *
 * Scenarios:
 *   1. Free user → POST /audits { runGeo: true } → 403 Forbidden (free_plan)
 *   2. Pro user  → POST /audits { runGeo: true } → 202, enqueueCrawlStart
 *                  called with options.runGeo = true
 *   3. Pro user with quota exhausted → POST /audits { runGeo: true } → 403
 *                  Forbidden (quota_exhausted)
 */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

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
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { ReportGrpcClient } from '../../src/infra/grpc/report.client';
import { CrawlerGrpcClient } from '../../src/infra/grpc/crawler.client';
import { AnalyzerGrpcClient } from '../../src/infra/grpc/analyzer.client';
import { AuditQueueProducer } from '../../src/audits/services/audit-queue.producer';
import { EntitlementService } from '../../src/billing/services/entitlement.service';
import { QuotaCounterService } from '../../src/billing/services/quota-counter.service';
import { AuditStatus, UserRole } from '@repo/shared';

vi.mock('../../src/common/utils/url-validator', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue({ href: 'https://example.com/', domain: 'example.com' }),
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------
const audits: any[] = [];
const uuids = [
  'geo-e2e-0001-0000-0000-000000000001',
  'geo-e2e-0002-0000-0000-000000000002',
  'geo-e2e-0003-0000-0000-000000000003',
];
const prismaMock = {
  audit: {
    create: vi.fn(({ data }: any) => {
      const a = {
        id: uuids[audits.length] ?? `geo-e2e-00${audits.length + 4}-0000-0000-000000000001`,
        ...data,
        createdAt: new Date(),
        completedAt: null,
        errorMessage: null,
        crawlerType: null,
        crawlDurationMs: null,
        seoScore: null,
      };
      audits.push(a);
      return Promise.resolve(a);
    }),
    findUnique: vi.fn(({ where }: any) => Promise.resolve(audits.find((a) => a.id === where.id) ?? null)),
    findMany: vi.fn(() => Promise.resolve(audits)),
    count: vi.fn(() => Promise.resolve(audits.length)),
    delete: vi.fn(),
  },
};

// ---------------------------------------------------------------------------
// Redis mock
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Entitlement mock — controlled per-scenario via canRunGeo
// ---------------------------------------------------------------------------
const canRunGeoMock = vi.fn();

const entitlementMock = {
  hasFeature: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
  checkSiteAuditPageCount: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
  getEffectivePlan: vi.fn().mockResolvedValue('pro'),
  isAdmin: vi.fn().mockResolvedValue(false),
  canRunGeo: canRunGeoMock,
};

const enqueueCrawlStartMock = vi.fn().mockResolvedValue(undefined);

// ---------------------------------------------------------------------------
// Auth guard — injects a controllable fake user
// ---------------------------------------------------------------------------
let fakeUser = { id: 'user-1', email: 'u@e.com', role: UserRole.USER };

class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.user = { ...fakeUser };
    return true;
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('Audits GEO E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/google/callback';

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
        generatePdf: vi.fn().mockResolvedValue({ pdfContent: Buffer.from('PDF'), filename: 'audit.pdf', sizeBytes: 3 }),
        isHealthy: vi.fn(),
      })
      .overrideProvider(AuditQueueProducer).useValue({
        enqueueCrawlStart: enqueueCrawlStartMock,
        enqueueSiteCrawlStart: vi.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(EntitlementService).useValue(entitlementMock)
      .overrideProvider(QuotaCounterService).useValue({
        consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, limit: 100, resetAt: new Date() }),
      })
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

  it('free user → POST /audits with runGeo:true → 403 Forbidden (free_plan)', async () => {
    // Scenario 1: canRunGeo returns denied due to free plan
    canRunGeoMock.mockResolvedValueOnce({
      allowed: false,
      reason: 'free_plan',
      remainingQuota: 0,
    });
    fakeUser = { id: 'free-user', email: 'free@e.com', role: UserRole.USER };
    enqueueCrawlStartMock.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com', runGeo: true })
      .expect(403);

    expect(res.body.message).toContain('GEO Audit requires Pro/Business plan');
    // Queue must NOT be called
    expect(enqueueCrawlStartMock).not.toHaveBeenCalled();
  });

  it('pro user → POST /audits with runGeo:true → 202 + queue payload has runGeo:true', async () => {
    // Scenario 2: canRunGeo returns allowed
    canRunGeoMock.mockResolvedValueOnce({
      allowed: true,
      reason: null,
      remainingQuota: 49,
    });
    fakeUser = { id: 'pro-user', email: 'pro@e.com', role: UserRole.USER };
    enqueueCrawlStartMock.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com', runGeo: true })
      .expect(202);

    expect(res.body.auditId).toBeDefined();
    expect(res.body.status).toBe(AuditStatus.PENDING);
    // The BullMQ payload must carry runGeo: true
    expect(enqueueCrawlStartMock).toHaveBeenCalledOnce();
    const payload = enqueueCrawlStartMock.mock.calls[0][0];
    expect(payload.options?.runGeo).toBe(true);
  });

  it('pro user with quota exhausted → POST /audits with runGeo:true → 403 (quota_exhausted)', async () => {
    // Scenario 3: canRunGeo returns denied due to exhausted monthly quota
    canRunGeoMock.mockResolvedValueOnce({
      allowed: false,
      reason: 'quota_exhausted',
      remainingQuota: 0,
    });
    fakeUser = { id: 'pro-user-quota', email: 'quota@e.com', role: UserRole.USER };
    enqueueCrawlStartMock.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com', runGeo: true })
      .expect(403);

    expect(res.body.message).toContain('GEO quota exceeded');
    // Queue must NOT be called
    expect(enqueueCrawlStartMock).not.toHaveBeenCalled();
  });
});
