import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CoreWebVitals } from '@repo/shared';
import { ReportRepository } from './report.repository';
import { ReportAggregator } from './report.aggregator';
import { WaitForBothService } from './wait-for-both.service';
import { RedisService } from '../redis/redis.service';
import { AnalyzeResult } from './interfaces/analyze-result.interface';
import { KeywordResult } from './interfaces/keyword-result.interface';

export interface GenerateFromPipelineInput {
  auditId: string;
  url: string;
  domain: string;
  cwv: CoreWebVitals;
}

export interface GenerateDirectInput {
  auditId: string;
  url: string;
  domain: string;
  analyze: AnalyzeResult;
  keywords: KeywordResult;
  cwv: CoreWebVitals;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly repo: ReportRepository,
    private readonly aggregator: ReportAggregator,
    private readonly waitSvc: WaitForBothService,
    private readonly redis: RedisService,
  ) {}

  async generateFromPipeline(input: GenerateFromPipelineInput) {
    const { analyze, keywords } = await this.waitSvc.readBoth(input.auditId);
    const result = await this.persistAndPublish({
      auditId: input.auditId,
      url: input.url,
      domain: input.domain,
      analyze: analyze as AnalyzeResult,
      keywords: keywords as KeywordResult,
      cwv: input.cwv,
    });
    await this.waitSvc.cleanup(input.auditId);
    return result;
  }

  async generateDirect(input: GenerateDirectInput) {
    return this.persistAndPublish(input);
  }

  private async persistAndPublish(input: GenerateDirectInput) {
    const aggregated = this.aggregator.aggregate({
      auditId: input.auditId,
      url: input.url,
      domain: input.domain,
      analyze: input.analyze,
      keywords: input.keywords,
      cwv: input.cwv,
    });

    const report = await this.repo.createFullReport({
      auditId: input.auditId,
      aggregated,
      keywords: input.keywords.keywords,
      cwv: input.cwv,
    });

    const event = {
      auditId: input.auditId,
      reportId: report.id,
      finalScore: aggregated.finalScore,
      classification: aggregated.classification,
    };
    await this.redis.client().publish('report.done', JSON.stringify(event));
    this.logger.log(`report.done published for ${input.auditId} (reportId=${report.id})`);

    return report;
  }

  async getReport(auditId: string) {
    const report = await this.repo.findByAuditId(auditId);
    if (!report) {
      throw new NotFoundException(`Report not found for audit ${auditId}`);
    }
    return report;
  }

  async getTwo(auditIdA: string, auditIdB: string) {
    const both = await this.repo.findManyByAuditIds([auditIdA, auditIdB]);
    if (both.length !== 2) {
      throw new NotFoundException(`Both reports must exist (found ${both.length})`);
    }
    const a = both.find((r) => r.auditId === auditIdA)!;
    const b = both.find((r) => r.auditId === auditIdB)!;
    return { before: a, after: b };
  }
}
