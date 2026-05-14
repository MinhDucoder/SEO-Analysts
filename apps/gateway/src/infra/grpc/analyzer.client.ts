import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';

export interface SeoRuleItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  weight: number;
  isEnabled: boolean;
  // Public-API metadata (extended in proto fields 10-13)
  severity?: string;
  audiences?: string[];
  docRef?: string;
  availableIn?: 'content_only' | 'full' | string;
}

// Wire format is camelCase: proto-loader is configured with `keepCase: false`
// in grpc-client.factory.ts. Snake_case keys are silently dropped on both
// serialize and deserialize, so all interfaces below MUST use camelCase.
export interface AnalyzeContentIssue {
  ruleId: string;
  status: string;
  score: number;
  category: string;
  severity: string;
  audiences: string[];
  message: string;
  templateSuggestion: string;
  evidence: Record<string, unknown>;
  docRef: string;
}

export interface AnalyzeContentResponse {
  ruleVersion: string;
  issues: AnalyzeContentIssue[];
  contentStats: {
    wordCount: number;
    characterCount: number;
    readingTimeSec: number;
    paragraphCount: number;
    imageCount: number;
    internalLinkCount: number;
    externalLinkCount: number;
  };
}

interface AnalyzerService {
  ListRules(
    req: object,
    cb: (err: Error | null, res?: { rules: Array<SeoRuleItem & { display_name?: string; is_enabled?: boolean; doc_ref?: string; available_in?: string }> }) => void,
  ): void;
  GetRulesByCategory(req: { category: string }, cb: (err: Error | null, res?: { rules: SeoRuleItem[] }) => void): void;
  UpdateRuleWeight(req: { ruleId: string; newWeight: number }, cb: (err: Error | null, res?: SeoRuleItem) => void): void;
  AnalyzeContent(
    req: {
      requestId: string;
      html: string;
      targetKeyword: string;
      secondaryKeywords: string[];
      language: string;
      mode: number;
      resolvedUrl: string;
    },
    cb: (err: Error | null, res?: AnalyzeContentResponse) => void,
  ): void;
  HealthCheck(req: object, cb: (err: Error | null, res?: { healthy: boolean }) => void): void;
}

@Injectable()
export class AnalyzerGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(AnalyzerGrpcClient.name);
  private client!: AnalyzerService;

  constructor(
    private readonly factory: GrpcClientFactory,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('ANALYZER_GRPC_URL') ?? 'localhost:50053';
    this.client = this.factory.create<AnalyzerService>({
      protoPath: 'analyzer/v1/analyzer.proto',
      packageName: 'analyzer.v1',
      serviceName: 'SeoAnalyzerService',
      url,
    });
  }

  listRules(): Promise<SeoRuleItem[]> {
    return new Promise((resolve, reject) => {
      this.client.ListRules({}, (err, res) => {
        if (err) return reject(err);
        resolve(res?.rules ?? []);
      });
    });
  }

  getRulesByCategory(category: string): Promise<SeoRuleItem[]> {
    return new Promise((resolve, reject) => {
      this.client.GetRulesByCategory({ category }, (err, res) => {
        if (err) return reject(err);
        resolve(res?.rules ?? []);
      });
    });
  }

  updateRuleWeight(ruleId: string, newWeight: number): Promise<SeoRuleItem> {
    return new Promise((resolve, reject) => {
      this.client.UpdateRuleWeight({ ruleId, newWeight }, (err, res) => {
        if (err) return reject(err);
        if (!res) return reject(new Error('Empty response'));
        resolve(res);
      });
    });
  }

  analyzeContent(input: {
    requestId: string;
    html: string;
    targetKeyword: string;
    secondaryKeywords?: string[];
    language?: string;
    mode?: 'content_only' | 'full';
    resolvedUrl?: string;
  }): Promise<AnalyzeContentResponse> {
    return new Promise((resolve, reject) => {
      this.client.AnalyzeContent(
        {
          requestId: input.requestId,
          html: input.html,
          targetKeyword: input.targetKeyword,
          secondaryKeywords: input.secondaryKeywords ?? [],
          language: input.language ?? 'vi',
          mode: input.mode === 'full' ? 2 : 1,
          resolvedUrl: input.resolvedUrl ?? '',
        },
        (err, res) => {
          if (err) return reject(err);
          if (!res) return reject(new Error('Empty AnalyzeContent response'));
          resolve(res);
        },
      );
    });
  }

  async isHealthy(): Promise<boolean> {
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
