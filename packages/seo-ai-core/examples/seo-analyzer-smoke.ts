import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  createRagChain,
  FileSystemPromptLoader,
  MemoryRetriever,
  type IChain,
  type ILLMProvider,
  type LLMRequest,
  type LLMResponse,
  type LLMChunk,
} from '@repo/seo-ai-core';

// --- Schema for the chain's output ---------------------------------------
export const ReviewSchema = z.object({
  summary: z.string(),
  issues: z.array(
    z.object({
      rule: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      line: z.number().int().nonnegative(),
      suggestion: z.string(),
      patch: z.string().nullable(),
    }),
  ),
});
export type Review = z.infer<typeof ReviewSchema>;

// --- Fake LLM adapter (smoke runs offline) -------------------------------
class CannedReviewLLM implements ILLMProvider {
  readonly name = 'fake';
  readonly model = 'fake-review-model-v1';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async invoke(_req: LLMRequest): Promise<LLMResponse> {
    const canned: Review = {
      summary:
        'File implements the open-graph rule. 1 minor issue: og:image dimension warning is not surfaced.',
      issues: [
        {
          rule: 'open-graph',
          severity: 'low',
          line: 42,
          suggestion: 'Add og:image:width / og:image:height for richer previews.',
          patch: null,
        },
      ],
    };
    return {
      content: JSON.stringify(canned),
      usage: { prompt: 200, completion: 80, total: 280 },
      model: this.model,
      finishReason: 'stop',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *stream(_req: LLMRequest): AsyncIterable<LLMChunk> {
    yield { delta: '' };
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }
}

// --- Wire the smoke -------------------------------------------------------
// fileURLToPath decodes percent-encoded chars in paths (e.g. spaces → %20)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const RULES_DIR = path.join(REPO_ROOT, 'apps', 'seo-analyzer', 'src', 'analyzer', 'domain', 'rules', 'meta');
const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'prompt', 'templates');

export async function runSmoke(): Promise<Review> {
  const ruleFiles = ['title-tag.rule.ts', 'meta-description.rule.ts', 'open-graph.rule.ts'];
  const ruleDocs = await Promise.all(
    ruleFiles.map(async (f) => ({
      id: f,
      content: await fs.readFile(path.join(RULES_DIR, f), 'utf-8'),
      metadata: { source: 'seo-analyzer/rules/meta', filename: f },
    })),
  );

  const targetFile = path.join(RULES_DIR, 'open-graph.rule.ts');
  const targetContent = await fs.readFile(targetFile, 'utf-8');

  const chain: IChain<
    { query: string; filePath: string; fileContent: string; rules: string },
    Review
  > = createRagChain({
    name: 'seo-analyzer-smoke',
    promptId: 'code-review',
    promptVersion: '^1.0.0',
    retriever: new MemoryRetriever(ruleDocs),
    llm: new CannedReviewLLM(),
    promptLoader: new FileSystemPromptLoader({ baseDir: TEMPLATES_DIR }),
    outputSchema: ReviewSchema,
    buildVariables: (input, contextDocs) => ({
      filePath: input.filePath,
      fileContent: input.fileContent,
      rules: input.rules,
      contextDocs,
    }),
    topK: 3,
  });

  const review = await chain.invoke({
    query: 'Review the open-graph rule implementation against project conventions',
    filePath: 'apps/seo-analyzer/src/analyzer/domain/rules/meta/open-graph.rule.ts',
    fileContent: targetContent,
    rules: ruleFiles.join(', '),
  });

  return review;
}

// Allow running standalone: `node --loader tsx examples/seo-analyzer-smoke.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmoke()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      console.error('Smoke failed:', err);
      process.exit(1);
    });
}
