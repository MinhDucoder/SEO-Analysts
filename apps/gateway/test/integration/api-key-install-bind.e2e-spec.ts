/**
 * @file E2E integration test for API key install-bind lifecycle.
 *
 * Tests the full bind → mismatch → no-header → rebind → re-bind flow against
 * real Prisma (gateway DB) and real Redis, with gRPC mocked so /public/check
 * doesn't require downstream services.
 *
 * Does NOT import AppModule (avoids APP_GUARD global) — only PublicApiModule
 * plus its real deps. FakeJwtGuard overrides JwtAuthGuard for the JWT-protected
 * rebind endpoint.
 */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext, CanActivate, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { PublicApiModule } from '../../src/public-api/public-api.module';
import { PrismaModule } from '../../src/infra/prisma/prisma.module';
import { RedisModule } from '../../src/infra/redis/redis.module';
import { GrpcModule } from '../../src/infra/grpc/grpc.module';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { ApiKeyService } from '../../src/public-api/services/api-key.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { INSTALL_BIND_MODE } from '../../src/public-api/config/install-bind-mode';
import { AnalyzerGrpcClient } from '../../src/infra/grpc/analyzer.client';
import { CrawlerGrpcClient } from '../../src/infra/grpc/crawler.client';
import { ReportGrpcClient } from '../../src/infra/grpc/report.client';
import { GrpcClientFactory } from '../../src/infra/grpc/grpc-client.factory';
import { EntitlementService } from '../../src/billing/services/entitlement.service';
import { UserRole } from '@repo/shared';

const INSTALL_A = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';
const INSTALL_B = '7a1b2c3d-4e5f-4a6b-9c8d-1e2f3a4b5c6d';

// Minimal analyzer response so /public/check returns 200 instead of timing out
const analyzerResponse = {
  ruleVersion: '1.0.0',
  issues: [],
  contentStats: {
    wordCount: 1,
    characterCount: 5,
    readingTimeSec: 1,
    paragraphCount: 1,
    imageCount: 0,
    internalLinkCount: 0,
    externalLinkCount: 0,
  },
};

let currentUserId: string; // mutated in beforeAll, read by FakeJwtGuard

class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.user = { id: currentUserId, email: 'bind@e.com', role: UserRole.USER };
    return true;
  }
}

describe('API key install bind (E2E, enforce mode)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let svc: ApiKeyService;
  let plaintext: string;
  let apiKeyId: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/google/callback';

    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        RedisModule,
        GrpcModule,
        PublicApiModule,
      ],
    })
      .overrideGuard(JwtAuthGuard).useClass(FakeJwtGuard)
      .overrideProvider(AnalyzerGrpcClient).useValue({
        analyzeContent: vi.fn().mockResolvedValue(analyzerResponse),
        isHealthy: vi.fn().mockResolvedValue(true),
      })
      .overrideProvider(CrawlerGrpcClient).useValue({
        liteFetch: vi.fn(),
        isHealthy: vi.fn().mockResolvedValue(true),
      })
      .overrideProvider(ReportGrpcClient).useValue({
        isHealthy: vi.fn().mockResolvedValue(true),
      })
      .overrideProvider(GrpcClientFactory).useValue({ create: vi.fn() })
      .overrideProvider(EntitlementService).useValue({
        isAdmin: vi.fn().mockResolvedValue(true),        // admin bypasses api_keys_max plan check
        getEffectivePlan: vi.fn().mockResolvedValue('free'),
        hasFeature: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
        canRunGeo: vi.fn().mockResolvedValue({ allowed: true, reason: null, remainingQuota: 10 }),
      })
      .overrideProvider(INSTALL_BIND_MODE).useValue('enforce')
      .compile();

    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    svc = app.get(ApiKeyService);

    const user = await prisma.user.create({
      data: {
        email: `bind-${Date.now()}@test`,
        passwordHash: '$2a$12$dummy',
        fullName: 'Bind Test User',
        role: UserRole.ADMIN,         // admin bypasses api_keys_max plan check
        isVerified: true,
      },
    });
    currentUserId = user.id;

    const created = await svc.create(currentUserId, 'e2e-bind', 'test');
    plaintext = created.plaintext;
    apiKeyId = created.record.id;
  }, 30_000);

  afterAll(async () => {
    if (currentUserId) {
      await prisma.apiKey.deleteMany({ where: { userId: currentUserId } });
      await prisma.user.delete({ where: { id: currentUserId } });
    }
    await app.close();
  });

  it('first call from install A binds the key', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_A)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect([200, 422]).toContain(res.status); // 200 normally; 422 if rule fixtures absent — either way, bind ran
    const row = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    expect(row?.installId).toBe(INSTALL_A);
    expect(row?.installBoundAt).toBeInstanceOf(Date);
  }, 15_000);

  it('call from install B is rejected with 401 KEY_INSTALL_MISMATCH', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_B)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('KEY_INSTALL_MISMATCH');
  }, 10_000);

  it('call without X-Install-Id is rejected with 401 MISSING_INSTALL_ID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MISSING_INSTALL_ID');
  }, 10_000);

  it('after rebind, install B can use the key (and install A is now locked out)', async () => {
    const rebindRes = await request(app.getHttpServer())
      .post(`/api/v1/users/me/api-keys/${apiKeyId}/rebind`);
    // FakeJwtGuard stamps req.user — no Authorization header needed
    expect(rebindRes.status).toBe(204);

    const rowAfterRebind = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    expect(rowAfterRebind?.installId).toBeNull();

    const checkRes = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_B)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect([200, 422]).toContain(checkRes.status);

    const rowAfterRebind2 = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    expect(rowAfterRebind2?.installId).toBe(INSTALL_B);

    const lockoutRes = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_A)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect(lockoutRes.status).toBe(401);
    expect(lockoutRes.body.code).toBe('KEY_INSTALL_MISMATCH');
  }, 15_000);
});
