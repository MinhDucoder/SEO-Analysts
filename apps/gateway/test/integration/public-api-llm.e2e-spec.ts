/**
 * @file HTTP-level integration test for /api/v1/public/check with
 * `enrichMode=llm`. Bootstraps only PublicApiModule + mocked externals
 * (Prisma, Redis, gRPC, Rate-limit, ApiKeyGuard) so docker services
 * are not required in CI. Asserts the full request path: guard →
 * rate-limit → controller → service → enricher → chain factory.
 */
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PublicApiModule } from '../../src/public-api/public-api.module';
import { ApiKeyGuard } from '../../src/public-api/guards/api-key.guard';
import { PublicApiRateLimitService } from '../../src/public-api/services/public-api-rate-limit.service';
import { SeoSuggestChainFactory } from '../../src/public-api/services/seo-suggest-chain.factory';
import { AnalyzerGrpcClient } from '../../src/infra/grpc/analyzer.client';
import { CrawlerGrpcClient } from '../../src/infra/grpc/crawler.client';
import { ReportGrpcClient } from '../../src/infra/grpc/report.client';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { RateLimiterService } from '../../src/infra/redis/rate-limiter.service';
import { GrpcClientFactory } from '../../src/infra/grpc/grpc-client.factory';

const analyzerResponse = {
  rule_version: '1.2.0',
  issues: [
    {
      rule_id: 'title_tag',
      status: 'warn',
      score: 50,
      category: 'meta',
      severity: 'warning',
      audiences: ['writer'],
      message: 'Title too short',
      template_suggestion: 'Write a longer title',
      evidence: { currentLength: 10 },
      doc_ref: 'https://d/r/title_tag',
    },
  ],
  content_stats: {
    word_count: 5,
    character_count: 20,
    reading_time_sec: 1,
    paragraph_count: 1,
    image_count: 0,
    internal_link_count: 0,
    external_link_count: 0,
  },
};

describe('Public API /check (LLM mode, mocked)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let factoryMock: { getOrNull: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    factoryMock = { getOrNull: vi.fn() };

    const cacheStore = new Map<string, string>();
    const redisClient = {
      get: vi.fn((k: string) => Promise.resolve(cacheStore.get(k) ?? null)),
      set: vi.fn((k: string, v: string) => {
        cacheStore.set(k, v);
        return Promise.resolve('OK');
      }),
      setex: vi.fn((k: string, _ttl: number, v: string) => {
        cacheStore.set(k, v);
        return Promise.resolve('OK');
      }),
      del: vi.fn(() => Promise.resolve(1)),
      incr: vi.fn(() => Promise.resolve(1)),
      decr: vi.fn(() => Promise.resolve(0)),
      expire: vi.fn(() => Promise.resolve(1)),
    };

    module = await Test.createTestingModule({ imports: [PublicApiModule] })
      .overrideProvider(SeoSuggestChainFactory)
      .useValue(factoryMock)
      .overrideProvider(AnalyzerGrpcClient)
      .useValue({ analyzeContent: vi.fn().mockResolvedValue(analyzerResponse) })
      .overrideProvider(CrawlerGrpcClient)
      .useValue({ liteFetch: vi.fn() })
      .overrideProvider(ReportGrpcClient)
      .useValue({})
      .overrideProvider(GrpcClientFactory)
      .useValue({ create: vi.fn() })
      .overrideProvider(PrismaService)
      .useValue({
        apiKey: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
        user: { findUnique: vi.fn() },
      })
      .overrideProvider(RedisService)
      .useValue({ client: redisClient })
      .overrideProvider(RateLimiterService)
      .useValue({
        consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, retryAfterSeconds: 0 }),
      })
      .overrideProvider(PublicApiRateLimitService)
      .useValue({
        enforce: vi.fn().mockResolvedValue({
          allowed: true,
          remaining: { minute: 19, day: 499 },
          retryAfterSeconds: 0,
          resetAt: { minute: '2026-04-23T00:00:00Z', day: '2026-04-24T00:00:00Z' },
        }),
        acquireConcurrency: vi.fn().mockResolvedValue(true),
        releaseConcurrency: vi.fn().mockResolvedValue(undefined),
      })
      .overrideGuard(ApiKeyGuard)
      .useValue({
        canActivate: (ctx: { switchToHttp: () => { getRequest: () => { apiKey: unknown } } }) => {
          const req = ctx.switchToHttp().getRequest();
          req.apiKey = { id: 'k-test', userId: 'u-test', environment: 'test' };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const baseBody = (enrichMode: 'llm' | 'template') => ({
    input: {
      type: 'html',
      html: '<html><title>Cách viết SEO</title><body>x</body></html>',
    },
    targetKeyword: 'seo 2026',
    options: { enrichMode, language: 'vi' },
  });

  it('enrichMode=llm happy path — suggestionSource="llm", degraded=false', async () => {
    factoryMock.getOrNull.mockResolvedValueOnce({
      name: 'seo-suggest',
      run: vi.fn().mockResolvedValue([
        { ruleId: 'title_tag', type: 'rewrite', text: 'LLM rewrite', rationale: 'r' },
      ]),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', 'Bearer sk_test_stub')
      .send(baseBody('llm'));

    expect(res.status).toBe(200);
    expect(res.body.meta.enrichMode).toBe('llm');
    expect(res.body.meta.suggestionSource).toBe('llm');
    expect(res.body.meta.degraded).toBe(false);
    expect(res.body.issues[0].suggestion).toMatchObject({
      type: 'rewrite',
      text: 'LLM rewrite',
    });
  });

  it('enrichMode=llm but ANTHROPIC_API_KEY missing — degrades to template, 200 degraded=true', async () => {
    factoryMock.getOrNull.mockResolvedValueOnce(null);

    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', 'Bearer sk_test_stub')
      .send({
        ...baseBody('llm'),
        input: { type: 'html', html: '<html><title>short2</title></html>' },
      });

    expect(res.status).toBe(200);
    expect(res.body.meta.suggestionSource).toBe('template');
    expect(res.body.meta.degraded).toBe(true);
  });

  it('enrichMode=llm but chain throws — degrades, 200 degraded=true', async () => {
    factoryMock.getOrNull.mockResolvedValueOnce({
      name: 'seo-suggest',
      run: vi.fn().mockRejectedValue(new Error('anthropic down')),
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', 'Bearer sk_test_stub')
      .send({
        ...baseBody('llm'),
        input: { type: 'html', html: '<html><title>short3</title></html>' },
      });

    expect(res.status).toBe(200);
    expect(res.body.meta.degraded).toBe(true);
    expect(res.body.meta.suggestionSource).toBe('template');
  });

  it('enrichMode=template is unchanged by LLM wiring', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', 'Bearer sk_test_stub')
      .send({
        ...baseBody('template'),
        input: { type: 'html', html: '<html><title>short4</title></html>' },
      });
    expect(res.status).toBe(200);
    expect(res.body.meta.suggestionSource).toBe('template');
    expect(res.body.meta.degraded).toBe(false);
  });
});
