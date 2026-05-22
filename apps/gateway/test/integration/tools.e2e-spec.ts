import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GooglePreviewController } from '../../src/tools/controllers/google-preview.controller';
import { GooglePreviewService } from '../../src/tools/services/google-preview.service';
import { LiteFetcherService } from '../../src/tools/services/lite-fetcher.service';
import { ToolsQuotaService } from '../../src/tools/services/tools-quota.service';

/**
 * Hermetic controller-level integration test: mounts the tool controllers with
 * mocked LiteFetcher + ToolsQuota (no DB/Redis/network), exercising HTTP
 * routing, the global ValidationPipe, and controller orchestration.
 */
describe('Tools — Google preview (E2E)', () => {
  let app: INestApplication;
  const fetcher = { get: vi.fn() };
  const quota = { checkAndIncrement: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GooglePreviewController],
      providers: [
        GooglePreviewService,
        { provide: LiteFetcherService, useValue: fetcher },
        { provide: ToolsQuotaService, useValue: quota },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('manual mode — returns computed warnings (200)', async () => {
    const r = await request(app.getHttpServer())
      .post('/tools/google-preview')
      .send({
        mode: 'manual',
        url: 'https://example.com/x',
        title: 'A reasonable title here',
        description: 'd'.repeat(100),
      });
    expect(r.status).toBe(200);
    expect(r.body.data.title).toBe('A reasonable title here');
    expect(r.body.warnings).toBeInstanceOf(Array);
    expect(quota.checkAndIncrement).not.toHaveBeenCalled();
  });

  it('url mode — charges quota and returns parsed preview', async () => {
    quota.checkAndIncrement.mockResolvedValue({ used: 1, remaining: 9 });
    fetcher.get.mockResolvedValue({
      url: 'https://example.com/',
      body: '<title>Hello</title><meta name="description" content="' + 'x'.repeat(90) + '">',
      status: 200,
      headers: {},
      cached: false,
    });
    const r = await request(app.getHttpServer())
      .post('/tools/google-preview')
      .send({ mode: 'url', fetchUrl: 'https://example.com/' });
    expect(r.status).toBe(200);
    expect(r.body.data.title).toBe('Hello');
    expect(r.body.meta).toMatchObject({ quotaUsed: 1, quotaLeft: 9, cached: false });
    expect(quota.checkAndIncrement).toHaveBeenCalled();
  });

  it('rejects invalid DTO (400)', async () => {
    const r = await request(app.getHttpServer())
      .post('/tools/google-preview')
      .send({ mode: 'banana' });
    expect(r.status).toBe(400);
  });
});
