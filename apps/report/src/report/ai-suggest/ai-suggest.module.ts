import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BULLMQ_QUEUES } from '@repo/shared';
import { createLLM, FileSystemPromptLoader } from '@repo/seo-ai-core';
import { AiSuggestService, PROMPT_LOADER, LLM_PROVIDER } from './services/ai-suggest.service';
import { AiSuggestListener } from './controllers/ai-suggest.listener';
import { AiSuggestWorker } from './controllers/ai-suggest.worker';

@Module({
  imports: [
    // Mirror ReportModule's BullMQ root config (codebase convention: each
    // feature module declares forRootAsync + registerQueue together).
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const parsed = new URL(url);
        return {
          connection: {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            password: parsed.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.AI_SUGGEST_START }),
  ],
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
    AiSuggestListener,
    AiSuggestWorker,
  ],
})
export class AiSuggestModule {}
