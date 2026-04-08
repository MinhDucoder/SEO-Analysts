---
name: backend-development
description: Use this skill when the user asks about "NestJS", "module", "guard", "pipe", "interceptor", "decorator", "Bull queue", "BullMQ", "job processing", "WebSocket", "Socket.IO", "gateway", "rate limiting", "microservice", "worker", or any NestJS backend patterns. Provides NestJS modular patterns, BullMQ job processing, and API design.
allowed-tools: Read, Grep, Glob, Bash(npm *), Bash(node *), Bash(npx *), Bash(pnpm *)
---

# NestJS 10 Backend Patterns

## Module Structure (Feature-Based)

Mỗi feature là 1 NestJS module độc lập, dễ tách thành microservice:

```
modules/feature/
  ├── feature.module.ts       # NestJS module declaration
  ├── feature.controller.ts   # HTTP handlers (@Controller)
  ├── feature.service.ts      # Business logic (@Injectable)
  ├── dto/                    # Request/Response DTOs (class-validator)
  │   ├── create-feature.dto.ts
  │   └── update-feature.dto.ts
  ├── entities/               # TypeScript interfaces/types
  ├── guards/                 # Custom guards (@CanActivate)
  └── feature.gateway.ts      # WebSocket gateway (optional)
```

## NestJS Module Pattern

```typescript
// modules/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditProcessor } from './audit.processor';
import { AuditGateway } from './audit.gateway';
import { CrawlerModule } from '../crawler/crawler.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'audit-queue' }),
    CrawlerModule,
    RulesModule,
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditProcessor, AuditGateway],
  exports: [AuditService],
})
export class AuditModule {}
```

## Controller Pattern

```typescript
// modules/audit/audit.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { AuditService } from './audit.service';
import { CreateAuditDto } from './dto/create-audit.dto';

@ApiTags('audits')
@Controller('audits')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @UseGuards(ThrottlerGuard, OptionalAuthGuard)
  @ApiOperation({ summary: 'Create a new SEO audit job' })
  async create(@Body() dto: CreateAuditDto, @Req() req: any) {
    const userId = req.user?.id; // nullable (guest allowed)
    return this.auditService.createAudit(dto.url, userId);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.auditService.getAuditResult(id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getHistory(@Req() req: any) {
    return this.auditService.getUserHistory(req.user.id);
  }
}
```

## DTO with class-validator

```typescript
// modules/audit/dto/create-audit.dto.ts
import { IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuditDto {
  @ApiProperty({ example: 'https://example.com' })
  @IsNotEmpty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;
}
```

## Service Pattern (DI)

```typescript
// modules/audit/audit.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('audit-queue') private readonly auditQueue: Queue,
  ) {}

  async createAudit(url: string, userId?: string) {
    // Duplicate detection: same URL within 5 minutes
    const recent = await this.prisma.auditJob.findFirst({
      where: {
        url,
        status: 'COMPLETED',
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      include: { result: true },
    });
    if (recent) return { jobId: recent.id, cached: true };

    const job = await this.prisma.auditJob.create({
      data: { url, userId, status: 'QUEUED' },
    });

    await this.auditQueue.add('seo-audit', { jobId: job.id, url, userId });
    return { jobId: job.id, status: 'queued' };
  }

  async getAuditResult(id: string) {
    const audit = await this.prisma.auditJob.findUnique({
      where: { id },
      include: { result: true, pages: true },
    });
    if (!audit) throw new NotFoundException('Audit not found');
    return audit;
  }

  async getUserHistory(userId: string) {
    return this.prisma.auditJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { result: { select: { overallScore: true } } },
    });
  }
}
```

## Guard Pattern

```typescript
// modules/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// modules/auth/guards/optional-auth.guard.ts
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Don't throw on missing/invalid token - allow guest access
    return user || null;
  }
}
```

## JWT Strategy

```typescript
// modules/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

---

## BullMQ Processor (NestJS Integration)

```typescript
// modules/audit/audit.processor.ts
import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AuditGateway } from './audit.gateway';
import { CrawlerService } from '../crawler/crawler.service';
import { RuleRegistryService } from '../rules/rule-registry.service';
import { LighthouseService } from '../lighthouse/lighthouse.service';

@Processor('audit-queue')
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    private readonly gateway: AuditGateway,
    private readonly crawler: CrawlerService,
    private readonly rules: RuleRegistryService,
    private readonly lighthouse: LighthouseService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('seo-audit')
  async handleAudit(job: Job<{ jobId: string; url: string; userId?: string }>) {
    const { jobId, url } = job.data;

    // Phase 1: Crawl
    await job.progress(20);
    this.gateway.emitProgress(jobId, 'crawling', 20);
    const pageData = await this.crawler.crawl(url);

    // Phase 2: Analyze
    await job.progress(50);
    this.gateway.emitProgress(jobId, 'analyzing', 50);
    const issues = this.rules.runAll(pageData);

    // Phase 3: Lighthouse
    await job.progress(70);
    this.gateway.emitProgress(jobId, 'scoring', 70);
    const lighthouseResult = await this.lighthouse.run(url);

    // Phase 4: Score + Save
    await job.progress(85);
    this.gateway.emitProgress(jobId, 'generating_report', 85);
    const score = this.rules.calculateScore(issues, lighthouseResult);

    await this.prisma.$transaction([
      this.prisma.auditResult.create({
        data: { jobId, overallScore: score.overall, categoryScores: score.categories, issues },
      }),
      this.prisma.auditJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', completedAt: new Date(), progress: 100 },
      }),
    ]);

    this.gateway.emitProgress(jobId, 'completed', 100);
    return { score: score.overall, issueCount: issues.length };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    this.gateway.emitProgress(job.data.jobId, 'failed', 0);
  }
}
```

---

## WebSocket Gateway (NestJS)

```typescript
// modules/audit/audit.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, methods: ['GET', 'POST'] },
})
export class AuditGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-audit')
  handleJoinAudit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    client.join(`audit:${data.jobId}`);
  }

  emitProgress(jobId: string, stage: string, progress: number) {
    this.server.to(`audit:${jobId}`).emit('progress', { stage, progress });
  }
}
```

---

## Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    this.logger.warn(`HTTP ${status}: ${exception.message}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Global Validation Pipe

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL });

  // Global validation pipe (auto-validate DTOs)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // Strip unknown properties
    forbidNonWhitelisted: true,
    transform: true,        // Auto-transform payloads to DTO instances
  }));

  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SEO Analysis API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
```

## App Module (Root)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { RulesModule } from './modules/rules/rules.module';
import { LighthouseModule } from './modules/lighthouse/lighthouse.module';
import { ReportModule } from './modules/report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 3600000, limit: 50 }]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PrismaModule,
    AuthModule,
    AuditModule,
    CrawlerModule,
    RulesModule,
    LighthouseModule,
    ReportModule,
  ],
})
export class AppModule {}
```

## Prisma Module (NestJS Integration)

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## Checklist

```
Architecture:
- Feature-based NestJS modules (module + controller + service + DTOs)
- Dependency Injection everywhere (@Injectable, constructor injection)
- Global module for shared services (PrismaModule)
- Barrel exports via module.exports

NestJS:
- class-validator DTOs with @ApiProperty for Swagger
- ValidationPipe global (whitelist + transform)
- Guards for auth (@UseGuards) - JwtAuthGuard, OptionalAuthGuard
- Exception filters for consistent error responses
- @nestjs/config for environment variables
- @nestjs/swagger for API documentation

BullMQ:
- @Processor decorator for job handlers
- @Process('job-name') for specific job types
- job.progress() for tracking
- @OnQueueFailed for error handling
- Retry with exponential backoff
- removeOnComplete/removeOnFail to prevent Redis bloat

WebSocket:
- @WebSocketGateway with CORS config
- @SubscribeMessage for event handlers
- Room-based isolation (audit:{jobId})
- @WebSocketServer() for server instance

Rate Limiting:
- @nestjs/throttler for global rate limiting
- ThrottlerGuard on specific routes
- Custom throttler for guest vs authenticated limits
```
