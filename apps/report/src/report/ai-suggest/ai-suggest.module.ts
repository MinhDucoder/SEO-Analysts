import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { createLLM, FileSystemPromptLoader } from '@repo/seo-ai-core';
import { AiSuggestService, PROMPT_LOADER, LLM_PROVIDER } from './services/ai-suggest.service';

// AI suggestions are generated ON DEMAND (sync gRPC ReportService.GenerateSuggestions),
// metered per-subscription at the gateway. There is no longer a report.done →
// BullMQ auto-run path; AiSuggestService is exported for the gRPC controller.
@Module({
  providers: [
    {
      provide: PROMPT_LOADER,
      useFactory: () =>
        new FileSystemPromptLoader({
          baseDir: path.join(__dirname, 'prompts'),
        }),
    },
    {
      provide: LLM_PROVIDER,
      useFactory: () => {
        // Gate ONLY on the kill switch (provider-agnostic). When enabled,
        // createLLM validates the chosen provider's key and fails fast.
        if (process.env['SEO_AI_ENABLED'] !== 'true') {
          return {
            name: 'disabled',
            providerId: 'disabled',
            model: 'disabled',
            modelId: 'disabled',
            invoke: async () => {
              throw new Error('LLM_PROVIDER stub: SEO_AI_ENABLED is off');
            },
            stream: async function* () {
              /* noop */
            },
            countTokens: async () => 0,
          } as unknown as ReturnType<typeof createLLM>;
        }
        return createLLM({
          provider: (process.env['SEO_AI_PROVIDER'] as 'anthropic' | 'gemini') ?? 'anthropic',
          model: process.env['SEO_AI_MODEL'] ?? 'claude-haiku-4-5',
        });
      },
    },
    AiSuggestService,
  ],
  exports: [AiSuggestService],
})
export class AiSuggestModule {}
