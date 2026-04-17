/**
 * @file gRPC entrypoint for the keyword-analyzer service.
 * Proto: `packages/proto/keyword/v1/keyword.proto`.
 */
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { KeywordAnalyzerService } from '../services/keyword-analyzer.service';

/**
 * Proto request shape (camelCase because main.ts configures
 * loader `keepCase: false`).
 */
interface KeywordRequestProto {
  auditId: string;
  textContent: string;
  url: string;
  title?: string;
  h1Text?: string;
  metaDescription?: string;
  targetKeyword?: string;
  language: string;
}

interface KeywordResponseProto {
  auditId: string;
  keywords: Array<{
    keyword: string;
    frequency: number;
    densityPercent: number;
    inTitle: boolean;
    inH1: boolean;
    inFirstParagraph: boolean;
    inMetaDescription: boolean;
    rank: number;
  }>;
  totalWords: number;
  uniqueWords: number;
  targetAnalysis?: {
    keyword: string;
    frequency: number;
    densityPercent: number;
    inTitle: boolean;
    inH1: boolean;
    inFirstParagraph: boolean;
    inMetaDescription: boolean;
    isStuffing: boolean;
    verdict: string;
  };
}

/**
 * Sync gRPC surface for on-demand keyword analysis (used by admin tooling
 * and E2E tests). The production async path goes through `KeywordWorker`.
 */
@Controller()
export class KeywordController {
  private readonly logger = new Logger(KeywordController.name);

  constructor(private readonly analyzer: KeywordAnalyzerService) {}

  /** Run analysis synchronously and return the full result. */
  @GrpcMethod('KeywordAnalyzerService', 'AnalyzeKeywords')
  async analyzeKeywords(req: KeywordRequestProto): Promise<KeywordResponseProto> {
    this.logger.log(`gRPC AnalyzeKeywords audit=${req.auditId} url=${req.url}`);
    const result = await this.analyzer.analyze({
      auditId: req.auditId,
      textContent: req.textContent,
      url: req.url,
      title: req.title || undefined,
      h1Text: req.h1Text || undefined,
      metaDescription: req.metaDescription || undefined,
      targetKeyword: req.targetKeyword || undefined,
      language: req.language,
    });
    return {
      auditId: result.auditId,
      keywords: result.keywords,
      totalWords: result.totalWords,
      uniqueWords: result.uniqueWords,
      targetAnalysis: result.targetAnalysis,
    };
  }

  /** Liveness probe used by Docker healthcheck and Gateway /health. */
  @GrpcMethod('KeywordAnalyzerService', 'HealthCheck')
  healthCheck(): { healthy: boolean; version: string } {
    return { healthy: true, version: '0.0.1' };
  }
}
