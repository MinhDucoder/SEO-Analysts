import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AnalyzerModule } from './analyzer/analyzer.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AnalyzerModule],
})
export class AppModule {}
