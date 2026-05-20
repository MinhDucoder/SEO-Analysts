import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { GrpcModule } from './infra/grpc/grpc.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditsModule } from './audits/audits.module';
import { ScheduledAuditsModule } from './scheduled-audits/scheduled-audits.module';
import { SharedModule } from './shared/shared.module';
import { AdminModule } from './admin/admin.module';
import { BillingModule } from './billing/billing.module';
import { WebsocketModule } from './infra/websocket/websocket.module';
import { HealthModule } from './health/health.module';
import { PublicApiModule } from './public-api/public-api.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    GrpcModule,
    AuthModule,
    UsersModule,
    AuditsModule,
    ScheduledAuditsModule,
    SharedModule,
    AdminModule,
    BillingModule,
    WebsocketModule,
    HealthModule,
    PublicApiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
