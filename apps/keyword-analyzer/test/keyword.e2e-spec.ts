import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { Transport, ClientProxyFactory, ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom, Observable } from 'rxjs';
import { KeywordController } from '../src/keyword/keyword.controller';
import { KeywordAnalyzerService } from '../src/keyword/keyword-analyzer.service';

interface KeywordGrpcClient {
  analyzeKeywords(data: Record<string, unknown>): Observable<{
    auditId: string;
    keywords: Array<{ keyword: string; frequency: number; rank: number }>;
    totalWords: number;
    uniqueWords: number;
    targetAnalysis?: { verdict: string; frequency: number };
  }>;
  healthCheck(data: Record<string, never>): Observable<{ healthy: boolean; version: string }>;
}

const GRPC_URL = '127.0.0.1:55054';
const PROTO_PATH = join(__dirname, '../../..', 'packages/proto/keyword/v1/keyword.proto');
const PROTO_DIR = join(__dirname, '../../..', 'packages/proto');

describe('KeywordAnalyzer (e2e)', () => {
  let app: INestMicroservice;
  let client: KeywordGrpcClient;

  beforeAll(async () => {
    // Build a minimal test module with only the controller and its direct
    // dependency (KeywordAnalyzerService). Worker and EventPublisher are
    // omitted — they require live Redis/BullMQ connections.
    const moduleRef = await Test.createTestingModule({
      controllers: [KeywordController],
      providers: [KeywordAnalyzerService],
    }).compile();

    app = moduleRef.createNestMicroservice({
      transport: Transport.GRPC,
      options: {
        package: ['keyword.v1'],
        protoPath: [PROTO_PATH],
        url: GRPC_URL,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs: [PROTO_DIR],
        },
      },
    });

    await app.listen();

    const proxy = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: ['keyword.v1'],
        protoPath: [PROTO_PATH],
        url: GRPC_URL,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs: [PROTO_DIR],
        },
      },
    }) as unknown as ClientGrpc;

    client = proxy.getService<KeywordGrpcClient>('KeywordAnalyzerService');
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('HealthCheck returns healthy', async () => {
    const resp = await firstValueFrom(client.healthCheck({}));
    expect(resp.healthy).toBe(true);
    expect(resp.version).toBe('0.0.1');
  });

  it('AnalyzeKeywords returns ranked keywords for English document', async () => {
    const resp = await firstValueFrom(
      client.analyzeKeywords({
        auditId: '00000000-0000-0000-0000-000000000001',
        url: 'https://example.com/seo-guide',
        title: 'Complete SEO Audit Guide 2026',
        h1Text: 'SEO Audit Guide',
        metaDescription: 'Learn how to perform a complete SEO audit.',
        textContent:
          'A complete SEO audit is essential for ranking. SEO audits help identify issues ' +
          'with meta tags, headings, images, and content. This SEO audit guide walks through ' +
          'every step of a professional audit. Running an audit regularly catches problems early. ' +
          'An audit checklist covers technical SEO, on-page SEO, and off-page signals.',
        targetKeyword: 'seo audit',
        language: 'en',
      }),
    );

    expect(resp.auditId).toBe('00000000-0000-0000-0000-000000000001');
    expect(resp.totalWords).toBeGreaterThan(0);
    expect(resp.uniqueWords).toBeGreaterThan(0);
    expect(resp.keywords.length).toBeGreaterThan(0);
    expect(resp.keywords[0]?.rank).toBe(1);

    // target should be present with a verdict
    expect(resp.targetAnalysis).toBeDefined();
    expect(['low', 'optimal', 'high', 'stuffing']).toContain(resp.targetAnalysis!.verdict);
    expect(resp.targetAnalysis!.frequency).toBeGreaterThanOrEqual(1);
  }, 15_000);

  it('AnalyzeKeywords handles Vietnamese document with auto-detected language', async () => {
    const resp = await firstValueFrom(
      client.analyzeKeywords({
        auditId: '00000000-0000-0000-0000-000000000002',
        url: 'https://example.vn',
        title: 'Công nghệ phần mềm',
        h1Text: 'Học công nghệ phần mềm',
        metaDescription: 'Khóa học công nghệ phần mềm trực tuyến.',
        textContent:
          'Công nghệ phần mềm là một ngành học rất phát triển hiện nay. ' +
          'Học công nghệ phần mềm mở ra nhiều cơ hội việc làm hấp dẫn. ' +
          'Công nghệ phần mềm đang thay đổi cách chúng ta làm việc và sống.',
        targetKeyword: 'công nghệ',
        language: '', // empty → auto-detect
      }),
    );

    expect(resp.keywords.length).toBeGreaterThan(0);
    expect(resp.targetAnalysis).toBeDefined();
    expect(resp.targetAnalysis!.frequency).toBeGreaterThanOrEqual(1);
  }, 15_000);
});
