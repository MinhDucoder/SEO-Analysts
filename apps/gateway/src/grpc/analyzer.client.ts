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
}

interface AnalyzerService {
  ListRules(req: object, cb: (err: Error | null, res?: { rules: SeoRuleItem[] }) => void): void;
  GetRulesByCategory(req: { category: string }, cb: (err: Error | null, res?: { rules: SeoRuleItem[] }) => void): void;
  UpdateRuleWeight(req: { ruleId: string; newWeight: number }, cb: (err: Error | null, res?: SeoRuleItem) => void): void;
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
      serviceName: 'AnalyzerService',
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
