/**
 * @file Synchronous gRPC client for seo-analyzer, used by the F1
 * site-wide pipeline: the per-URL worker crawls each sub-URL and then
 * asks the analyzer for a score + rule results inline (no extra
 * BullMQ hop) so hundreds of URLs don't flood the analyze queue.
 */
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';
import { PageData } from '../../domain/page-data.interface';

export interface AnalyzerRuleResult {
  ruleId: string;
  ruleName: string;
  status: string;
  score: number;
  weight?: number;
  category?: string;
  message?: string;
  suggestion?: string;
  metadata?: Record<string, string>;
}

export interface AnalyzerCategoryScore {
  category: string;
  score: number;
  totalRules: number;
  passed: number;
  warned: number;
  failed: number;
}

export interface AnalyzePageResult {
  auditId?: string;
  overallScore: number;
  ruleResults: AnalyzerRuleResult[];
  categoryScores: AnalyzerCategoryScore[];
  classification?: string;
}

interface AnalyzerStub {
  AnalyzePage(
    req: {
      auditId: string;
      pageData: PageData;
      targetKeyword?: string;
    },
    cb: (err: Error | null, res?: AnalyzePageResult) => void,
  ): void;
  HealthCheck(req: object, cb: (err: Error | null, res?: { healthy: boolean }) => void): void;
}

@Injectable()
export class AnalyzerGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AnalyzerGrpcClient.name);
  private client!: AnalyzerStub;

  constructor(
    @Inject(GrpcClientFactory) private readonly factory: GrpcClientFactory,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('ANALYZER_GRPC_URL') ?? 'localhost:50053';
    this.client = this.factory.create<AnalyzerStub>({
      protoPath: 'analyzer/v1/analyzer.proto',
      packageName: 'analyzer.v1',
      serviceName: 'SeoAnalyzerService',
      url,
    });
  }

  analyzePage(
    auditId: string,
    pageData: PageData,
    targetKeyword?: string,
  ): Promise<AnalyzePageResult> {
    return new Promise((resolve, reject) => {
      const req: { auditId: string; pageData: PageData; targetKeyword?: string } = {
        auditId,
        pageData,
      };
      if (targetKeyword !== undefined) {
        req.targetKeyword = targetKeyword;
      }
      this.client.AnalyzePage(req, (err, res) => {
        if (err) return reject(err);
        if (!res) return reject(new Error('Empty AnalyzePage response'));
        resolve({
          auditId: res.auditId,
          overallScore: res.overallScore,
          ruleResults: res.ruleResults ?? [],
          categoryScores: res.categoryScores ?? [],
          classification: res.classification,
        });
      });
    });
  }

  isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.HealthCheck({}, (err, res) => {
        if (err) {
          this.logger.warn(`Analyzer health check failed: ${err.message}`);
          return resolve(false);
        }
        resolve(res?.healthy ?? false);
      });
    });
  }
}
