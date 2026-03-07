import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CrawlerService } from '../crawler/crawler.service';
import { RuleRegistry } from '../seo-engine/rule-registry';
import { LighthouseService } from '../performance/lighthouse.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditGateway } from './audit.gateway';

export interface AuditJobData {
  url: string;
  userId?: string;
  isGuest: boolean;
}

@Processor('audit-queue')
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly ruleRegistry: RuleRegistry,
    private readonly lighthouseService: LighthouseService,
    private readonly prisma: PrismaService,
    private readonly gateway: AuditGateway,
  ) {
    super();
  }

  async process(job: Job<AuditJobData>): Promise<unknown> {
    const { url, isGuest } = job.data;
    const jobId = job.id!;

    try {
      // Update job status in DB
      await this.prisma.auditJob.update({
        where: { id: jobId },
        data: { status: 'crawling', progress: 0 },
      });

      // Stage 1: Crawl (0-30%)
      this.gateway.emitProgress(jobId, 'crawling', 10, 'Fetching page...');
      const crawlResult = await this.crawlerService.crawl(url);
      this.gateway.emitProgress(
        jobId,
        'crawling',
        30,
        'Page fetched successfully',
      );

      // Store page data
      await this.prisma.page.create({
        data: {
          jobId,
          url,
          htmlSize: crawlResult.htmlSize,
          responseTime: crawlResult.responseTimeMs,
          statusCode: crawlResult.statusCode,
          extractedData: crawlResult as unknown as Record<string, unknown>,
        },
      });

      // Stage 2: Analyze (30-70%)
      await this.prisma.auditJob.update({
        where: { id: jobId },
        data: { status: 'analyzing', progress: 30 },
      });
      this.gateway.emitProgress(jobId, 'analyzing', 40, 'Running SEO rules...');

      const issues = this.ruleRegistry.analyzeAll(crawlResult);
      this.gateway.emitProgress(
        jobId,
        'analyzing',
        60,
        `Found ${issues.length} issues`,
      );

      // Run Lighthouse (skip for guests to save resources)
      let lighthouseResult = null;
      if (!isGuest) {
        this.gateway.emitProgress(
          jobId,
          'analyzing',
          65,
          'Running Lighthouse...',
        );
        lighthouseResult = await this.lighthouseService.analyze(url);
      }
      this.gateway.emitProgress(jobId, 'analyzing', 70, 'Analysis complete');

      // Stage 3: Score (70-90%)
      await this.prisma.auditJob.update({
        where: { id: jobId },
        data: { status: 'scoring', progress: 70 },
      });
      this.gateway.emitProgress(jobId, 'scoring', 80, 'Calculating scores...');

      const { categoryScores } = this.ruleRegistry.calculateScores(issues);

      // Override performance score with Lighthouse if available
      if (lighthouseResult?.available === true) {
        const perfCategory = categoryScores.find(
          (c) => c.category === 'performance',
        );
        if (perfCategory) {
          perfCategory.score = lighthouseResult.performanceScore;
        }
      }

      const finalOverallScore = Math.round(
        categoryScores.reduce((sum, cs) => sum + cs.score * cs.weight, 0),
      );

      this.gateway.emitProgress(
        jobId,
        'scoring',
        90,
        `Score: ${finalOverallScore}/100`,
      );

      // Stage 4: Generate Report (90-100%)
      await this.prisma.auditJob.update({
        where: { id: jobId },
        data: { status: 'generating_report', progress: 90 },
      });
      this.gateway.emitProgress(
        jobId,
        'generating_report',
        95,
        'Generating report...',
      );

      // Store result
      if (!isGuest) {
        await this.prisma.auditResult.create({
          data: {
            jobId,
            overallScore: finalOverallScore,
            categoryScores: categoryScores as unknown as Record<
              string,
              unknown
            >[],
            issues: issues as unknown as Record<string, unknown>[],
            metadata: {
              lighthouseAvailable: lighthouseResult?.available ?? false,
              lighthouseMetrics: lighthouseResult?.metrics ?? null,
              cwvEvaluation: lighthouseResult?.cwvEvaluation ?? null,
              crawlDurationMs: crawlResult.responseTimeMs,
              url,
              auditedAt: new Date().toISOString(),
            },
          },
        });
      }

      // Mark completed
      await this.prisma.auditJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        },
      });
      this.gateway.emitProgress(jobId, 'completed', 100, 'Audit complete!');

      return {
        overallScore: finalOverallScore,
        categoryScores,
        issues,
        lighthouse: lighthouseResult,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Audit failed for ${url}: ${message}`);

      await this.prisma.auditJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: message,
        },
      });
      this.gateway.emitProgress(jobId, 'failed', 0, message);

      throw error;
    }
  }
}
