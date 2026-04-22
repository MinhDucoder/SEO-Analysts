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

export interface AnalyzeContentIssue {
  rule_id: string;
  status: string;
  score: number;
  category: string;
  severity: string;
  audiences: string[];
  message: string;
  template_suggestion: string;
  evidence: Record<string, unknown>;
  doc_ref: string;
}

export interface AnalyzeContentResponse {
  rule_version: string;
  issues: AnalyzeContentIssue[];
  content_stats: {
    word_count: number;
    character_count: number;
    reading_time_sec: number;
    paragraph_count: number;
    image_count: number;
    internal_link_count: number;
    external_link_count: number;
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
      request_id: string;
      html: string;
      target_keyword: string;
      secondary_keywords: string[];
      language: string;
      mode: number;
      resolved_url: string;
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
          request_id: input.requestId,
          html: input.html,
          target_keyword: input.targetKeyword,
          secondary_keywords: input.secondaryKeywords ?? [],
          language: input.language ?? 'vi',
          mode: input.mode === 'full' ? 2 : 1,
          resolved_url: input.resolvedUrl ?? '',
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
