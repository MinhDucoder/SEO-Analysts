import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyzerGrpcClient } from '../../src/crawler/infra/grpc/analyzer-grpc-client';

type StubCallback<T> = (err: Error | null, res?: T) => void;
interface AnalyzeRes {
  auditId?: string;
  overallScore: number;
  ruleResults: Array<{ ruleId: string; ruleName: string; score: number; status: string }>;
  categoryScores?: Array<unknown>;
  classification?: string;
}
interface HealthRes { healthy: boolean }

interface AnalyzerStub {
  AnalyzePage: ReturnType<typeof vi.fn>;
  HealthCheck: ReturnType<typeof vi.fn>;
}

describe('AnalyzerGrpcClient', () => {
  let stub: AnalyzerStub;
  let factory: { create: ReturnType<typeof vi.fn> };
  let config: { get: ReturnType<typeof vi.fn> };
  let client: AnalyzerGrpcClient;

  const basePage = {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    statusCode: 200,
    responseTimeMs: 100,
    htmlSizeBytes: 1024,
    h1Tags: [],
    h2Tags: [],
    h3Tags: [],
    h4Tags: [],
    h5Tags: [],
    h6Tags: [],
    images: [],
    internalLinks: [],
    externalLinks: [],
    schemaJsonLd: [],
    openGraph: {},
    twitterCard: {},
    isHttps: true,
    redirectChain: [],
    contentEncoding: '',
    cacheControl: '',
    textContent: 'hello',
    rawHtml: '<html></html>',
  };

  beforeEach(() => {
    stub = {
      AnalyzePage: vi.fn(),
      HealthCheck: vi.fn(),
    };
    factory = { create: vi.fn().mockReturnValue(stub) };
    config = { get: vi.fn().mockReturnValue(undefined) };
    client = new AnalyzerGrpcClient(factory as never, config as never);
  });

  it('creates a gRPC client for analyzer.proto on module init', () => {
    client.onModuleInit();
    expect(factory.create).toHaveBeenCalledWith({
      protoPath: 'analyzer/v1/analyzer.proto',
      packageName: 'analyzer.v1',
      serviceName: 'SeoAnalyzerService',
      url: 'localhost:50053',
    });
  });

  it('uses ANALYZER_GRPC_URL env when provided', () => {
    config.get.mockImplementation((key: string) =>
      key === 'ANALYZER_GRPC_URL' ? 'seo-analyzer:50053' : undefined,
    );
    client.onModuleInit();
    expect(factory.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'seo-analyzer:50053' }),
    );
  });

  it('analyzePage resolves with overallScore + ruleResults from gRPC response', async () => {
    stub.AnalyzePage.mockImplementation((_req: unknown, cb: StubCallback<AnalyzeRes>) =>
      cb(null, {
        auditId: 'aud-1',
        overallScore: 78.5,
        ruleResults: [{ ruleId: 'r1', ruleName: 'meta-title', score: 80, status: 'pass' }],
        categoryScores: [],
        classification: 'good',
      }),
    );
    client.onModuleInit();

    const res = await client.analyzePage('aud-1', basePage);

    expect(res.overallScore).toBe(78.5);
    expect(res.ruleResults).toHaveLength(1);
    expect(res.ruleResults[0].ruleName).toBe('meta-title');
    expect(res.classification).toBe('good');
  });

  it('forwards auditId + pageData + targetKeyword in gRPC request', async () => {
    stub.AnalyzePage.mockImplementation((_req: unknown, cb: StubCallback<AnalyzeRes>) =>
      cb(null, { overallScore: 0, ruleResults: [], categoryScores: [] }),
    );
    client.onModuleInit();

    await client.analyzePage('aud-42', basePage, 'seo tools');

    expect(stub.AnalyzePage).toHaveBeenCalledWith(
      expect.objectContaining({
        auditId: 'aud-42',
        pageData: expect.objectContaining({ url: 'https://example.com/' }),
        targetKeyword: 'seo tools',
      }),
      expect.any(Function),
    );
  });

  it('omits targetKeyword from the request when not provided', async () => {
    stub.AnalyzePage.mockImplementation((_req: unknown, cb: StubCallback<AnalyzeRes>) =>
      cb(null, { overallScore: 0, ruleResults: [], categoryScores: [] }),
    );
    client.onModuleInit();

    await client.analyzePage('aud-9', basePage);

    const req = stub.AnalyzePage.mock.calls[0][0] as Record<string, unknown>;
    expect(req).not.toHaveProperty('targetKeyword');
  });

  it('rejects when the gRPC call returns an error', async () => {
    stub.AnalyzePage.mockImplementation((_req: unknown, cb: StubCallback<AnalyzeRes>) =>
      cb(new Error('UNAVAILABLE: connection refused')),
    );
    client.onModuleInit();

    await expect(client.analyzePage('aud-err', basePage)).rejects.toThrow(/UNAVAILABLE/);
  });

  it('rejects when the gRPC response is empty', async () => {
    stub.AnalyzePage.mockImplementation((_req: unknown, cb: StubCallback<AnalyzeRes>) =>
      cb(null, undefined),
    );
    client.onModuleInit();

    await expect(client.analyzePage('aud-empty', basePage)).rejects.toThrow(/empty/i);
  });

  it('isHealthy returns true when HealthCheck reports healthy', async () => {
    stub.HealthCheck.mockImplementation((_req: unknown, cb: StubCallback<HealthRes>) =>
      cb(null, { healthy: true }),
    );
    client.onModuleInit();

    await expect(client.isHealthy()).resolves.toBe(true);
  });

  it('isHealthy returns false when HealthCheck errors', async () => {
    stub.HealthCheck.mockImplementation((_req: unknown, cb: StubCallback<HealthRes>) =>
      cb(new Error('deadline exceeded')),
    );
    client.onModuleInit();

    await expect(client.isHealthy()).resolves.toBe(false);
  });
});
