import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcClientFactory } from './grpc-client.factory';

interface ReportService {
  GetReport(req: { auditId: string }, cb: (err: Error | null, res?: unknown) => void): void;
  CompareReports(req: { auditId_1: string; auditId_2: string }, cb: (err: Error | null, res?: unknown) => void): void;
  CreateShareLink(req: { auditId: string; userId: string }, cb: (err: Error | null, res?: { shareToken: string; shareUrl: string }) => void): void;
  RevokeShareLink(req: { auditId: string; userId: string }, cb: (err: Error | null, res?: { revoked: boolean }) => void): void;
  GetSharedReport(req: { shareToken: string }, cb: (err: Error | null, res?: unknown) => void): void;
  GeneratePdf(
    req: { auditId: string },
    cb: (
      err: Error | null,
      res?: { pdfContent: Buffer; filename: string; sizeBytes: string | number },
    ) => void,
  ): void;
  GenerateSuggestions(
    req: { auditId: string },
    cb: (
      err: Error | null,
      res?: {
        status: string;
        count: number;
        aiSuggestions: { ruleId: string; explanation: string; actionableFix: string }[];
        aiSuggestionsGeneratedAt: string;
      },
    ) => void,
  ): void;
  HealthCheck(req: object, cb: (err: Error | null, res?: { healthy: boolean }) => void): void;
}

@Injectable()
export class ReportGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(ReportGrpcClient.name);
  private client!: ReportService;

  constructor(
    private readonly factory: GrpcClientFactory,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('REPORT_GRPC_URL') ?? 'localhost:50055';
    this.client = this.factory.create<ReportService>({
      protoPath: 'report/v1/report.proto',
      packageName: 'report.v1',
      serviceName: 'ReportService',
      url,
    });
  }

  private call<TReq, TRes>(method: keyof ReportService, req: TReq): Promise<TRes> {
    return new Promise((resolve, reject) => {
      const fn = (this.client[method] as unknown as (...args: unknown[]) => void).bind(this.client);
      fn(req, (err: Error | null, res?: TRes) => {
        if (err) {
          this.logger.warn(`Report ${String(method)} failed: ${err.message}`);
          return reject(err);
        }
        if (!res) return reject(new Error('Empty response'));
        resolve(res);
      });
    });
  }

  getReport(auditId: string) {
    return this.call<{ auditId: string }, unknown>('GetReport', { auditId });
  }
  compareReports(audit1: string, audit2: string) {
    // Proto fields are `audit_id_1`/`audit_id_2`. proto-loader's camelCase
    // (keepCase:false) only upper-cases the char after an underscore, so a
    // trailing `_<digit>` is preserved verbatim: `audit_id_1` → `auditId_1`
    // (NOT `auditId1`). Sending `auditId1` here silently drops the value off
    // the wire — the report side then receives empty/undefined. Do NOT
    // "tidy" these keys to `auditId1`/`auditId2`.
    return this.call<{ auditId_1: string; auditId_2: string }, unknown>('CompareReports', {
      auditId_1: audit1,
      auditId_2: audit2,
    });
  }
  createShareLink(auditId: string, userId: string) {
    return this.call<{ auditId: string; userId: string }, { shareToken: string; shareUrl: string }>(
      'CreateShareLink',
      { auditId, userId },
    );
  }
  revokeShareLink(auditId: string, userId: string) {
    return this.call<{ auditId: string; userId: string }, { revoked: boolean }>(
      'RevokeShareLink',
      { auditId, userId },
    );
  }
  getSharedReport(token: string) {
    // Proto field is `share_token` → camelCase `shareToken` (keepCase:false).
    // Sending `{ token }` silently drops the value off the wire and the report
    // side reads `req.shareToken === undefined` → always NotFound.
    return this.call<{ shareToken: string }, unknown>('GetSharedReport', { shareToken: token });
  }
  generatePdf(auditId: string) {
    return this.call<
      { auditId: string },
      { pdfContent: Buffer; filename: string; sizeBytes: string | number }
    >('GeneratePdf', { auditId });
  }
  generateSuggestions(auditId: string) {
    return this.call<
      { auditId: string },
      {
        status: string;
        count: number;
        aiSuggestions: { ruleId: string; explanation: string; actionableFix: string }[];
        aiSuggestionsGeneratedAt: string;
      }
    >('GenerateSuggestions', { auditId });
  }

  async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.HealthCheck({}, (err, res) => {
        if (err) {
          this.logger.warn(`Report health check failed: ${err.message}`);
          return resolve(false);
        }
        resolve(res?.healthy ?? false);
      });
    });
  }
}
