import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CrawlerGrpcClient } from '../grpc/crawler.client';
import { AnalyzerGrpcClient } from '../grpc/analyzer.client';
import { ReportGrpcClient } from '../grpc/report.client';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly crawler: CrawlerGrpcClient,
    private readonly analyzer: AnalyzerGrpcClient,
    private readonly report: ReportGrpcClient,
  ) {}

  @Public()
  @Get()
  async check() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.client.ping(),
      this.crawler.isHealthy(),
      this.analyzer.isHealthy(),
      this.report.isHealthy(),
    ]);
    return {
      status: 'ok',
      version: process.env.npm_package_version ?? '0.0.1',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      services: {
        database: checks[0].status === 'fulfilled',
        redis: checks[1].status === 'fulfilled' && checks[1].value === 'PONG',
        crawler: checks[2].status === 'fulfilled' && checks[2].value === true,
        analyzer: checks[3].status === 'fulfilled' && checks[3].value === true,
        report: checks[4].status === 'fulfilled' && checks[4].value === true,
      },
    };
  }
}
