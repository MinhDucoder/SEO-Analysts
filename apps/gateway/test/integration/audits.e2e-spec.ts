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

const audits: any[] = [];
const uuids = [
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
];
const prismaMock = {
  audit: {
    create: vi.fn(({ data }: any) => {
      const a = { id: uuids[audits.length] ?? `550e8400-e29b-41d4-a716-44665544000${audits.length + 4}`, ...data, createdAt: new Date(), completedAt: null, errorMessage: null, crawlerType: null, crawlDurationMs: null, seoScore: null };
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
        generatePdf: vi.fn().mockResolvedValue({ pdfUrl: 'https://x/p.pdf' }),
        isHealthy: vi.fn(),
      })
      .overrideProvider(AuditQueueProducer).useValue({
        enqueueCrawlStart: vi.fn(),
        enqueueSiteCrawlStart: vi.fn(),
      })
      // Billing entitlement/quota deps were added to the audits flow; the
      // prisma/redis mocks here don't model the subscription/quota tables, so
      // stub the services to a permissive "allowed" decision.
      .overrideProvider(EntitlementService).useValue({
        hasFeature: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
        checkSiteAuditPageCount: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
        getEffectivePlan: vi.fn().mockResolvedValue('business'),
      })
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

  it('POST /audits with mode=site creates a site-mode audit + routes to site-crawl.start', async () => {
    const producer = app.get(AuditQueueProducer) as unknown as {
      enqueueCrawlStart: ReturnType<typeof vi.fn>;
      enqueueSiteCrawlStart: ReturnType<typeof vi.fn>;
    };
    const crawlStartCallsBefore = producer.enqueueCrawlStart.mock.calls.length;

    const res = await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com', mode: 'site', maxUrls: 250, targetKeyword: 'seo' })
      .expect(202);

    expect(res.body.auditId).toBeDefined();
    expect(res.body.status).toBe(AuditStatus.PENDING);
    expect(res.body.mode).toBe('site');

    const created = audits.find((a) => a.id === res.body.auditId);
    expect(created?.mode).toBe('site');
    expect(producer.enqueueSiteCrawlStart).toHaveBeenCalledWith({
      auditId: res.body.auditId,
      rootUrl: 'https://example.com/',
      maxUrls: 250,
      targetKeyword: 'seo',
    });
    // site-mode must NOT add a new crawl.start call on top of whatever single-mode
    // tests earlier in this suite may have produced.
    expect(producer.enqueueCrawlStart.mock.calls.length).toBe(crawlStartCallsBefore);
  });

  it('POST /audits rejects maxUrls > 5000 via validation pipe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com', mode: 'site', maxUrls: 10_000 })
      .expect(400);
  });

  it('POST /audits rejects unknown mode values via validation pipe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/audits')
      .send({ url: 'https://example.com', mode: 'bulk' })
      .expect(400);
  });

  it('DELETE /audits/:id removes a pending audit', async () => {
    const id = audits[0].id;
    audits[0].status = AuditStatus.COMPLETED;
    await request(app.getHttpServer()).delete(`/api/v1/audits/${id}`).expect(204);
  });
});
