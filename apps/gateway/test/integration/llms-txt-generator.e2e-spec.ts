/**
 * @file Gateway E2E — POST /api/v1/tools/llms-txt-generator
 *
 * The endpoint uses:
 *   @UseGuards(JwtAuthGuard, PlanGuard)
 *   @RequireFeature(FeatureFlag.GEO_AUDIT)
 *
 * PlanGuard calls EntitlementService.hasFeature(userId, 'geo_audit').
 * When BILLING_FEATURE_ENABLED=true and the user lacks GEO_AUDIT, it throws
 * FeatureNotAvailableError → 403 with body.code = 'FEATURE_NOT_AVAILABLE'.
 *
 * Scenarios:
 *   1. Free user (no GEO_AUDIT feature) → 403 FEATURE_NOT_AVAILABLE
 *   2. Pro user + valid URL → 200 with { content: <markdown> }
 *   3. Pro user + invalid URL string → 400 (ValidationPipe, class-validator @IsUrl)
 *
 * Note: The plan described 422 for invalid URL, but NestJS ValidationPipe
 * throws BadRequestException (400). The test uses 400 to match actual behavior.
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
import { ToolsModule } from '../../src/tools/tools.module';
import { GrpcModule } from '../../src/infra/grpc/grpc.module';
import { RedisModule } from '../../src/infra/redis/redis.module';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { EntitlementService } from '../../src/billing/services/entitlement.service';
import { QuotaCounterService } from '../../src/billing/services/quota-counter.service';
import { LlmsTxtGeneratorService } from '../../src/tools/services/llms-txt-generator.service';
import { UserRole } from '@repo/shared';

// ---------------------------------------------------------------------------
// Prisma mock (ToolsModule has BillingModule which uses Prisma for user/sub)
// ---------------------------------------------------------------------------
const prismaMock = {
  user: {
    findUnique: vi.fn().mockResolvedValue({ id: 'u', role: UserRole.USER }),
  },
  subscription: {
    findFirst: vi.fn().mockResolvedValue(null),
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
// Controllable hasFeature mock — swapped per scenario
// ---------------------------------------------------------------------------
const hasFeatureMock = vi.fn();

const entitlementMock = {
  hasFeature: hasFeatureMock,
  getEffectivePlan: vi.fn().mockResolvedValue('free'),
  isAdmin: vi.fn().mockResolvedValue(false),
  canRunGeo: vi.fn().mockResolvedValue({ allowed: true, reason: null, remainingQuota: 49 }),
  checkSiteAuditPageCount: vi.fn().mockResolvedValue({ allowed: true, code: 'OK', reason: '' }),
};

// ---------------------------------------------------------------------------
// LlmsTxtGeneratorService mock — returns deterministic markdown
// ---------------------------------------------------------------------------
const FAKE_MARKDOWN = '# Example Site\n\n> A great site\n\n## Main pages\n- [/](/)\n';
const generateMock = vi.fn().mockResolvedValue({
  url: 'https://example.com/',
  content: FAKE_MARKDOWN,
  sizeBytes: FAKE_MARKDOWN.length,
  warnings: [],
});

// ---------------------------------------------------------------------------
// Auth guard — injects fake user; role can be swapped per-scenario
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
describe('llms.txt generator E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v1/auth/google/callback';
    // Enable billing enforcement so PlanGuard actually checks features
    process.env.BILLING_FEATURE_ENABLED = 'true';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        GrpcModule,
        ToolsModule,
      ],
    })
      .overrideProvider(PrismaService).useValue(prismaMock)
      .overrideProvider(RedisService).useValue(redisMock)
      .overrideProvider(EntitlementService).useValue(entitlementMock)
      .overrideProvider(QuotaCounterService).useValue({
        consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, limit: 100, resetAt: new Date() }),
        peek: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, limit: 100, resetAt: new Date() }),
        getRemaining: vi.fn().mockResolvedValue(99),
      })
      .overrideProvider(LlmsTxtGeneratorService).useValue({ generate: generateMock })
      .overrideGuard(JwtAuthGuard).useClass(FakeJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.BILLING_FEATURE_ENABLED;
  });

  it('free user → POST /tools/llms-txt-generator → 403 FEATURE_NOT_AVAILABLE', async () => {
    // PlanGuard calls hasFeature; return denied for free user
    hasFeatureMock.mockResolvedValueOnce({ allowed: false, code: 'FEATURE_NOT_AVAILABLE', reason: 'Plan "free" lacks feature "geo_audit"' });
    fakeUser = { id: 'free-user', email: 'free@e.com', role: UserRole.USER };
    generateMock.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/v1/tools/llms-txt-generator')
      .send({ url: 'https://example.com' })
      .expect(403);

    // AllExceptionsFilter forwards the code from FeatureNotAvailableError
    expect(res.body.code).toBe('FEATURE_NOT_AVAILABLE');
    // Service must NOT be called
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('pro user + valid URL → 200 with markdown content', async () => {
    // PlanGuard allows for pro user
    hasFeatureMock.mockResolvedValueOnce({ allowed: true, code: 'OK', reason: '' });
    fakeUser = { id: 'pro-user', email: 'pro@e.com', role: UserRole.USER };
    generateMock.mockClear();

    const res = await request(app.getHttpServer())
      .post('/api/v1/tools/llms-txt-generator')
      .send({ url: 'https://example.com' })
      .expect(200);

    expect(res.body.content).toBe(FAKE_MARKDOWN);
    expect(res.body.url).toBe('https://example.com/');
    expect(generateMock).toHaveBeenCalledOnce();
    expect(generateMock).toHaveBeenCalledWith('https://example.com', undefined);
  });

  it('pro user + invalid URL string → 400 (ValidationPipe @IsUrl rejects)', async () => {
    // Even if feature is allowed, validation fails before the handler runs
    hasFeatureMock.mockResolvedValueOnce({ allowed: true, code: 'OK', reason: '' });
    fakeUser = { id: 'pro-user', email: 'pro@e.com', role: UserRole.USER };
    generateMock.mockClear();

    await request(app.getHttpServer())
      .post('/api/v1/tools/llms-txt-generator')
      .send({ url: 'not-a-valid-url' })
      .expect(400);

    // Service must NOT be called when validation fails
    expect(generateMock).not.toHaveBeenCalled();
  });
});
