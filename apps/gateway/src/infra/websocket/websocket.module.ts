import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditGateway } from './audit.gateway';
import { ProgressSubscriberService } from './progress-subscriber.service';
import { PageAuditSubscriberService } from '../../audits/services/page-audit-subscriber.service';
import { SiteCrawlSubscriberService } from '../../audits/services/site-crawl-subscriber.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [
    AuditGateway,
    ProgressSubscriberService,
    PageAuditSubscriberService,
    SiteCrawlSubscriberService,
  ],
  exports: [AuditGateway],
})
export class WebsocketModule {}
