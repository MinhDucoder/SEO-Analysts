import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
vi.mock('passport-google-oauth20', () => ({ Strategy: class { authenticate() {} } }));
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from '../../src/billing/billing.module';
import { CassoReconcilerService } from '../../src/billing/services/casso-reconciler.service';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { RedisService } from '../../src/infra/redis/redis.service';
import { RateLimiterService } from '../../src/infra/redis/rate-limiter.service';

describe('POST /webhooks/casso', () => {
  let app: INestApplication;
  const handleWebhook = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ CASSO_WEBHOOK_SECRET: 'test-secret', JWT_ACCESS_SECRET: 'test-jwt' })],
        }),
        BillingModule,
      ],
    })
      .overrideProvider(CassoReconcilerService).useValue({ handleWebhook })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(RedisService).useValue({})
      .overrideProvider(RateLimiterService).useValue({})
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => app.close());

  const payload = { tid: 'tx-1', amount: 99000, description: 'CK SEOABC23', when: '2026-05-20T12:00:00Z' };

  it('401 without Secure-Token header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/casso')
      .send(payload)
      .expect(401);
  });

  it('401 with wrong token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/casso')
      .set('Secure-Token', 'wrong')
      .send(payload)
      .expect(401);
  });

  it('200 with correct token + handler called', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/casso')
      .set('Secure-Token', 'test-secret')
      .send(payload)
      .expect(201);
    expect(handleWebhook).toHaveBeenCalledWith(expect.objectContaining({ tid: 'tx-1' }));
  });
});
