import { Module } from '@nestjs/common';
import { SEO_ANALYZER } from './analyzer.interface';
import { RuleRegistry } from './rule-registry';
import { TECHNICAL_ANALYZERS } from './rules/technical';
import { ON_PAGE_ANALYZERS } from './rules/on-page';
import { PERFORMANCE_ANALYZERS } from './rules/performance';

const allAnalyzers = [
  ...TECHNICAL_ANALYZERS,
  ...ON_PAGE_ANALYZERS,
  ...PERFORMANCE_ANALYZERS,
];

@Module({
  providers: [
    ...allAnalyzers,
    {
      provide: SEO_ANALYZER,
      useFactory: (...analyzers: any[]) => analyzers,
      inject: allAnalyzers,
    },
    RuleRegistry,
  ],
  exports: [RuleRegistry],
})
export class SeoEngineModule {}
