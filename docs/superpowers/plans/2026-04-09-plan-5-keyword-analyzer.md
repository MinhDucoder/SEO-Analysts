# Plan 5: Keyword Analyzer Service Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow TDD where applicable — write failing tests first, then make them pass.

**Goal:** Implement the complete business logic of the Keyword Analyzer microservice: tokenizer, stopwords, term-frequency, density calculation, target-keyword verdict, gRPC controller exposing `AnalyzeKeywords` and `HealthCheck`, and a BullMQ worker that consumes `keyword.start` jobs and emits `keyword.done` events.

**Architecture:** Stateless NestJS microservice. **No database** — Redis is used only as the BullMQ broker and for emitting the `keyword.done` event on the Redis Pub/Sub bus. The service exposes a gRPC `KeywordAnalyzerService` on port `50054` (from Plan 1) and runs a BullMQ worker on the `keyword.start` queue in the same process. All analysis is CPU-only, pure in-memory functions.

**Tech Stack:** NestJS 10, TypeScript 5, gRPC (@grpc/grpc-js + @grpc/proto-loader), BullMQ 5 (worker), ioredis 5, Vitest 2.

**Reference Spec:** `docs/superpowers/specs/2026-04-09-microservices-architecture-design.md` section 8 "Core Logic — Keyword Analyzer" (pipeline), section 4.5 (keyword proto), section 3.1 (orchestration flow), section 3.3 (event bus).

**Dependencies:** Plan 1 (Foundation) must be complete. The following files must already exist:
- `apps/keyword-analyzer/src/main.ts` (gRPC bootstrap)
- `apps/keyword-analyzer/src/app.module.ts` (empty `AppModule` with `ConfigModule`)
- `apps/keyword-analyzer/package.json` (deps: `@nestjs/bullmq`, `@nestjs/microservices`, `bullmq`, `ioredis`, `@repo/shared`, `@repo/proto`)
- `packages/proto/keyword/v1/keyword.proto` (gRPC contract)
- `packages/shared/src/index.ts` (exports `BULLMQ_QUEUES`, `REDIS_KEYS`, `AuditStatus`)

---

## File Structure

After this plan completes, `apps/keyword-analyzer/` looks like:

```
apps/keyword-analyzer/
├── package.json                        # existing (Plan 1)
├── tsconfig.json                       # existing (Plan 1)
├── nest-cli.json                       # existing (Plan 1)
├── eslint.config.mjs                   # existing (Plan 1)
├── vitest.config.ts                    # NEW
├── src/
│   ├── main.ts                         # existing (Plan 1) — modified: connect BullMQ worker module
│   ├── app.module.ts                   # existing (Plan 1) — modified: import KeywordModule + BullModule
│   ├── keyword/
│   │   ├── keyword.module.ts           # NEW
│   │   ├── keyword.controller.ts       # NEW — gRPC controller (AnalyzeKeywords, HealthCheck)
│   │   ├── keyword-analyzer.service.ts # NEW — orchestrates the pipeline
│   │   ├── keyword.worker.ts           # NEW — BullMQ Processor for `keyword.start`
│   │   ├── event.publisher.ts          # NEW — Redis Pub/Sub emitter for `keyword.done`
│   │   ├── dto/
│   │   │   ├── keyword-request.dto.ts  # NEW — internal input shape
│   │   │   └── keyword-response.dto.ts # NEW — internal output shape
│   │   └── core/
│   │       ├── language-detector.ts    # NEW
│   │       ├── stopwords.ts            # NEW — EN + VI constants
│   │       ├── tokenizer.ts            # NEW
│   │       ├── term-frequency.ts       # NEW
│   │       ├── placement-checker.ts    # NEW
│   │       ├── density-calculator.ts   # NEW
│   │       └── target-verdict.ts       # NEW
│   └── __tests__/
│       ├── language-detector.spec.ts   # NEW
│       ├── tokenizer.spec.ts           # NEW
│       ├── term-frequency.spec.ts      # NEW
│       ├── placement-checker.spec.ts   # NEW
│       ├── density-calculator.spec.ts  # NEW
│       ├── target-verdict.spec.ts      # NEW
│       └── keyword-analyzer.service.spec.ts # NEW
└── test/
    └── keyword.e2e-spec.ts             # NEW — E2E gRPC integration test
```

---

## Task 1: Vitest Config & Language Detector

**Files:**
- Create: `apps/keyword-analyzer/vitest.config.ts`
- Create: `apps/keyword-analyzer/src/keyword/core/language-detector.ts`
- Create: `apps/keyword-analyzer/src/__tests__/language-detector.spec.ts`

- [ ] **Step 1: Create vitest config**

Create `apps/keyword-analyzer/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/keyword/**/*.ts'],
      exclude: ['src/keyword/**/*.spec.ts', 'src/keyword/**/*.module.ts'],
    },
    testTimeout: 10000,
  },
});
```

- [ ] **Step 2: Write failing test for language detector (TDD)**

Create `apps/keyword-analyzer/src/__tests__/language-detector.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { detectLanguage } from '../keyword/core/language-detector';

describe('detectLanguage', () => {
  it('returns "vi" when text contains Vietnamese diacritics', () => {
    expect(detectLanguage('Tôi yêu Việt Nam')).toBe('vi');
    expect(detectLanguage('Đây là một bài viết về SEO')).toBe('vi');
    expect(detectLanguage('Công nghệ phần mềm')).toBe('vi');
  });

  it('returns "en" for plain ASCII English text', () => {
    expect(detectLanguage('The quick brown fox jumps over the lazy dog')).toBe('en');
    expect(detectLanguage('SEO best practices in 2026')).toBe('en');
  });

  it('returns "en" for empty or whitespace-only text', () => {
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('   ')).toBe('en');
  });

  it('detects a single Vietnamese character mixed in English', () => {
    expect(detectLanguage('Welcome to Hà Nội city')).toBe('vi');
  });

  it('is case-insensitive for diacritics', () => {
    expect(detectLanguage('ĐẠI HỌC BÁCH KHOA')).toBe('vi');
  });
});
```

- [ ] **Step 3: Implement language detector**

Create `apps/keyword-analyzer/src/keyword/core/language-detector.ts`:

```typescript
/**
 * Detects document language using a simple heuristic:
 *   - If the text contains any Vietnamese diacritic character → 'vi'
 *   - Otherwise → 'en'
 *
 * This is intentionally simple: the platform only supports EN and VI today
 * and callers may override via the `language` field on KeywordRequest.
 */
const VIETNAMESE_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

export type LanguageCode = 'en' | 'vi';

export function detectLanguage(text: string): LanguageCode {
  if (!text) return 'en';
  return VIETNAMESE_CHARS.test(text) ? 'vi' : 'en';
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
cd apps/keyword-analyzer && npx vitest run src/__tests__/language-detector.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/keyword-analyzer/vitest.config.ts apps/keyword-analyzer/src/keyword/core/language-detector.ts apps/keyword-analyzer/src/__tests__/language-detector.spec.ts
git commit -m "feat(keyword): add language detector with EN/VI heuristic"
```

---

## Task 2: Stopwords Constants (EN + VI)

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/core/stopwords.ts`

- [ ] **Step 1: Create stopwords module**

Create `apps/keyword-analyzer/src/keyword/core/stopwords.ts`:

```typescript
import type { LanguageCode } from './language-detector';

/**
 * English stopwords — common function words that carry little SEO signal.
 * Derived from the NLTK default English stoplist, trimmed to ~170 entries.
 */
export const EN_STOPWORDS: ReadonlySet<string> = new Set<string>([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an',
  'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do',
  'does', 'doing', 'done', 'down', 'during', 'each', 'either', 'else', 'every',
  'few', 'for', 'from', 'further', 'get', 'got', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'may', 'me', 'might',
  'mine', 'more', 'most', 'much', 'must', 'my', 'myself', 'neither', 'no', 'nor',
  'not', 'now', 'of', 'off', 'on', 'once', 'one', 'only', 'or', 'other', 'ought',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'quite', 'really', 'same',
  'shall', 'she', 'should', 'since', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'though', 'through', 'to', 'too', 'truly', 'under', 'until',
  'up', 'upon', 'us', 'very', 'was', 'we', 'well', 'were', 'what', 'when',
  'where', 'whether', 'which', 'while', 'who', 'whom', 'whose', 'why', 'will',
  'with', 'within', 'without', 'would', 'yet', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'll', 've', 're', 'don', 'didn', 'doesn', 'isn', 'wasn', 'weren',
  'won', 'wouldn', 'shouldn', 'couldn', 'aren', 'ain', 'hadn', 'hasn', 'haven',
  'mightn', 'mustn', 'needn', 'shan',
]);

/**
 * Vietnamese stopwords — common function words, pronouns, prepositions,
 * and temporal markers. ~180 entries covering everyday written Vietnamese.
 */
export const VI_STOPWORDS: ReadonlySet<string> = new Set<string>([
  'của', 'và', 'là', 'cho', 'các', 'được', 'có', 'đã', 'trong', 'một',
  'để', 'những', 'khi', 'với', 'như', 'này', 'đó', 'thì', 'mà', 'lại',
  'đang', 'sẽ', 'rằng', 'nhưng', 'nếu', 'tại', 'trên', 'dưới', 'về', 'từ',
  'đến', 'bằng', 'vì', 'do', 'bởi', 'sau', 'trước', 'hoặc', 'cũng', 'vẫn',
  'rất', 'nhiều', 'ít', 'hơn', 'kém', 'chỉ', 'lên', 'xuống', 'ra', 'vào',
  'qua', 'nữa', 'đi', 'tới', 'thế', 'vậy', 'đây', 'kia', 'ấy', 'nào',
  'gì', 'ai', 'sao', 'đâu', 'bao', 'mấy', 'giờ', 'lúc', 'ngày', 'tháng',
  'năm', 'sáng', 'trưa', 'chiều', 'tối', 'đêm', 'không', 'chưa', 'đừng',
  'phải', 'cần', 'nên', 'muốn', 'làm', 'việc', 'người', 'cái', 'chiếc',
  'con', 'tôi', 'tao', 'tớ', 'mình', 'bạn', 'mày', 'họ', 'chúng', 'ta',
  'anh', 'chị', 'em', 'ông', 'bà', 'cô', 'chú', 'bác', 'dì', 'mẹ',
  'cha', 'bố', 'ba', 'con', 'cháu', 'thầy', 'cậu', 'mợ', 'dượng', 'bằng',
  'theo', 'cùng', 'giữa', 'trước', 'sau', 'trong', 'ngoài', 'ở', 'tại', 'nơi',
  'chỗ', 'đâu', 'kìa', 'nọ', 'nay', 'mai', 'hôm', 'tuần', 'chứ', 'à',
  'ừ', 'ờ', 'ạ', 'nhé', 'nhỉ', 'đấy', 'thôi', 'hả', 'vâng', 'dạ',
  'không', 'chẳng', 'chả', 'cứ', 'lắm', 'thật', 'quá', 'cực', 'siêu', 'khá',
  'hơi', 'tương', 'đối', 'đủ', 'nữa', 'thêm', 'bớt', 'đều', 'cả', 'toàn',
  'từng', 'mọi', 'mỗi', 'vài', 'dăm', 'nhỡ', 'lỡ', 'tuy', 'song', 'dẫu',
]);

/**
 * Returns the appropriate stopword set for the given language code.
 */
export function getStopwords(language: LanguageCode): ReadonlySet<string> {
  return language === 'vi' ? VI_STOPWORDS : EN_STOPWORDS;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/core/stopwords.ts
git commit -m "feat(keyword): add English and Vietnamese stopword lists"
```

---

## Task 3: Tokenizer

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/core/tokenizer.ts`
- Create: `apps/keyword-analyzer/src/__tests__/tokenizer.spec.ts`

- [ ] **Step 1: Write failing tokenizer tests**

Create `apps/keyword-analyzer/src/__tests__/tokenizer.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { tokenize } from '../keyword/core/tokenizer';

describe('tokenize', () => {
  it('lowercases all tokens', () => {
    const result = tokenize('Hello WORLD Foo', 'en');
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('foo');
  });

  it('removes punctuation', () => {
    const result = tokenize('hello, world! foo. bar? baz;', 'en');
    expect(result).toEqual(expect.arrayContaining(['hello', 'world', 'foo', 'bar', 'baz']));
    expect(result.join(' ')).not.toMatch(/[,.!?;]/);
  });

  it('filters out tokens shorter than 2 characters', () => {
    const result = tokenize('a big car I own now', 'en');
    expect(result).not.toContain('a');
    expect(result).not.toContain('i');
    expect(result).toContain('big');
    expect(result).toContain('car');
    expect(result).toContain('own');
    expect(result).toContain('now');
  });

  it('removes English stopwords', () => {
    const result = tokenize('the quick brown fox jumps over the lazy dog', 'en');
    expect(result).not.toContain('the');
    expect(result).not.toContain('over');
    expect(result).toEqual(['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog']);
  });

  it('removes Vietnamese stopwords', () => {
    const result = tokenize('tôi đang học lập trình web', 'vi');
    expect(result).not.toContain('tôi');
    expect(result).not.toContain('đang');
    expect(result).toContain('học');
    expect(result).toContain('lập');
    expect(result).toContain('trình');
    expect(result).toContain('web');
  });

  it('preserves Vietnamese diacritics during tokenization', () => {
    const result = tokenize('Công nghệ phần mềm', 'vi');
    expect(result).toEqual(['công', 'nghệ', 'phần', 'mềm']);
  });

  it('handles multiple whitespace types', () => {
    const result = tokenize('hello\tworld\nfoo   bar', 'en');
    expect(result).toEqual(['hello', 'world', 'foo', 'bar']);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('', 'en')).toEqual([]);
    expect(tokenize('   ', 'en')).toEqual([]);
  });

  it('strips HTML-like leftovers (numbers retained)', () => {
    const result = tokenize('Top 10 SEO tips for 2026', 'en');
    expect(result).toContain('top');
    expect(result).toContain('10');
    expect(result).toContain('seo');
    expect(result).toContain('tips');
    expect(result).toContain('2026');
  });
});
```

- [ ] **Step 2: Implement tokenizer**

Create `apps/keyword-analyzer/src/keyword/core/tokenizer.ts`:

```typescript
import type { LanguageCode } from './language-detector';
import { getStopwords } from './stopwords';

/**
 * Tokenizes a block of text into normalized keyword candidates.
 *
 * Steps:
 *   1. Lowercase
 *   2. Replace any non-letter / non-digit / non-Vietnamese-diacritic character with a space
 *   3. Split on whitespace
 *   4. Drop tokens shorter than 2 characters
 *   5. Drop stopwords for the given language
 *
 * Unicode-letter class `\p{L}` is required to keep Vietnamese diacritics
 * intact — `\w` would strip them.
 */
const NON_WORD = /[^\p{L}\p{N}]+/gu;

export function tokenize(text: string, language: LanguageCode): string[] {
  if (!text) return [];

  const stopwords = getStopwords(language);
  const lower = text.toLowerCase();
  const cleaned = lower.replace(NON_WORD, ' ');

  return cleaned
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !stopwords.has(token));
}

/**
 * Lightweight total-word counter used for density calculation.
 * Counts ALL words (including stopwords) after basic normalization — this is
 * the denominator spec: "density = frequency / total_words * 100".
 */
export function countTotalWords(text: string): number {
  if (!text) return 0;
  return text
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0).length;
}
```

- [ ] **Step 3: Run tests — must pass**

```bash
cd apps/keyword-analyzer && npx vitest run src/__tests__/tokenizer.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/core/tokenizer.ts apps/keyword-analyzer/src/__tests__/tokenizer.spec.ts
git commit -m "feat(keyword): add tokenizer with stopword removal and unicode support"
```

---

## Task 4: Term Frequency Calculator

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/core/term-frequency.ts`
- Create: `apps/keyword-analyzer/src/__tests__/term-frequency.spec.ts`

- [ ] **Step 1: Write failing TF tests**

Create `apps/keyword-analyzer/src/__tests__/term-frequency.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { calculateTermFrequency, topNKeywords } from '../keyword/core/term-frequency';

describe('calculateTermFrequency', () => {
  it('counts occurrences of each token', () => {
    const tf = calculateTermFrequency(['seo', 'audit', 'seo', 'tool', 'seo', 'audit']);
    expect(tf.get('seo')).toBe(3);
    expect(tf.get('audit')).toBe(2);
    expect(tf.get('tool')).toBe(1);
  });

  it('returns empty map for empty token list', () => {
    expect(calculateTermFrequency([]).size).toBe(0);
  });

  it('is case-sensitive at this stage (tokenizer lowercases upstream)', () => {
    const tf = calculateTermFrequency(['SEO', 'seo']);
    expect(tf.size).toBe(2);
  });
});

describe('topNKeywords', () => {
  it('returns keywords sorted by frequency descending', () => {
    const tf = new Map<string, number>([
      ['seo', 5],
      ['audit', 2],
      ['tool', 8],
      ['meta', 1],
    ]);
    const top = topNKeywords(tf, 3);
    expect(top).toEqual([
      { keyword: 'tool', frequency: 8 },
      { keyword: 'seo', frequency: 5 },
      { keyword: 'audit', frequency: 2 },
    ]);
  });

  it('caps result at the requested limit', () => {
    const tf = new Map<string, number>();
    for (let i = 0; i < 50; i++) tf.set(`word${i}`, i);
    expect(topNKeywords(tf, 20).length).toBe(20);
  });

  it('breaks ties alphabetically for stable ordering', () => {
    const tf = new Map<string, number>([
      ['banana', 3],
      ['apple', 3],
      ['cherry', 3],
    ]);
    const top = topNKeywords(tf, 3);
    expect(top.map((t) => t.keyword)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('returns empty array when map is empty', () => {
    expect(topNKeywords(new Map(), 20)).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement TF calculator**

Create `apps/keyword-analyzer/src/keyword/core/term-frequency.ts`:

```typescript
export interface KeywordCount {
  keyword: string;
  frequency: number;
}

/**
 * Counts occurrences of each token in the provided list.
 * Input is expected to already be lowercased + stopword-filtered.
 */
export function calculateTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

/**
 * Returns the top-N keywords sorted by frequency descending.
 * Ties are broken alphabetically to ensure deterministic output
 * (critical for snapshot tests and report reproducibility).
 */
export function topNKeywords(tf: Map<string, number>, n: number): KeywordCount[] {
  return Array.from(tf.entries())
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.keyword.localeCompare(b.keyword);
    })
    .slice(0, n);
}
```

- [ ] **Step 3: Run tests — must pass**

```bash
cd apps/keyword-analyzer && npx vitest run src/__tests__/term-frequency.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/core/term-frequency.ts apps/keyword-analyzer/src/__tests__/term-frequency.spec.ts
git commit -m "feat(keyword): add term frequency counter and top-N selector"
```

---

## Task 5: Keyword Placement Checker

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/core/placement-checker.ts`
- Create: `apps/keyword-analyzer/src/__tests__/placement-checker.spec.ts`

- [ ] **Step 1: Write failing placement tests**

Create `apps/keyword-analyzer/src/__tests__/placement-checker.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { checkPlacement, extractFirstParagraph } from '../keyword/core/placement-checker';

describe('extractFirstParagraph', () => {
  it('returns the first 100 words of the text', () => {
    const text = Array.from({ length: 250 }, (_, i) => `word${i}`).join(' ');
    const fp = extractFirstParagraph(text);
    expect(fp.split(/\s+/).length).toBe(100);
    expect(fp.startsWith('word0')).toBe(true);
    expect(fp.endsWith('word99')).toBe(true);
  });

  it('returns the whole text when shorter than 100 words', () => {
    expect(extractFirstParagraph('only a few words here')).toBe('only a few words here');
  });

  it('returns empty string for empty input', () => {
    expect(extractFirstParagraph('')).toBe('');
  });
});

describe('checkPlacement', () => {
  const ctx = {
    title: 'Best SEO Audit Tools',
    h1: 'SEO Audit Guide',
    firstParagraph: 'An seo audit is the process of evaluating a website.',
    metaDescription: 'A comprehensive guide to SEO audits and website analysis.',
  };

  it('detects keyword in title (case-insensitive)', () => {
    const p = checkPlacement('seo', ctx);
    expect(p.inTitle).toBe(true);
  });

  it('detects keyword in h1', () => {
    const p = checkPlacement('audit', ctx);
    expect(p.inH1).toBe(true);
  });

  it('detects keyword in first paragraph', () => {
    const p = checkPlacement('process', ctx);
    expect(p.inFirstParagraph).toBe(true);
  });

  it('detects keyword in meta description', () => {
    const p = checkPlacement('comprehensive', ctx);
    expect(p.inMetaDescription).toBe(true);
  });

  it('returns all-false when keyword appears nowhere', () => {
    const p = checkPlacement('elephant', ctx);
    expect(p).toEqual({
      inTitle: false,
      inH1: false,
      inFirstParagraph: false,
      inMetaDescription: false,
    });
  });

  it('handles missing optional fields gracefully', () => {
    const p = checkPlacement('seo', {
      title: undefined,
      h1: undefined,
      firstParagraph: 'seo is important',
      metaDescription: undefined,
    });
    expect(p.inTitle).toBe(false);
    expect(p.inH1).toBe(false);
    expect(p.inFirstParagraph).toBe(true);
    expect(p.inMetaDescription).toBe(false);
  });

  it('matches whole-word only (does not match "seo" inside "season")', () => {
    const p = checkPlacement('seo', {
      title: 'Summer season tips',
      h1: undefined,
      firstParagraph: undefined,
      metaDescription: undefined,
    });
    expect(p.inTitle).toBe(false);
  });
});
```

- [ ] **Step 2: Implement placement checker**

Create `apps/keyword-analyzer/src/keyword/core/placement-checker.ts`:

```typescript
export interface PlacementContext {
  title?: string;
  h1?: string;
  firstParagraph?: string;
  metaDescription?: string;
}

export interface PlacementResult {
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
}

const FIRST_PARAGRAPH_WORD_LIMIT = 100;

/**
 * Pulls the "first paragraph" of the body — defined here as the first
 * 100 whitespace-delimited words. Using a word count (rather than \n\n)
 * is resilient to crawled content where paragraph tags have already been
 * stripped to plain text.
 */
export function extractFirstParagraph(text: string): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  return words.slice(0, FIRST_PARAGRAPH_WORD_LIMIT).join(' ');
}

/**
 * Escapes regex metacharacters so a keyword can be safely embedded
 * in a dynamically-built RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a case-insensitive, Unicode-aware whole-word regex for a keyword.
 * Using `(?<![\\p{L}\\p{N}])` and `(?![\\p{L}\\p{N}])` instead of `\b` so
 * that Vietnamese diacritics count as word characters.
 */
function wordRegex(keyword: string): RegExp {
  const escaped = escapeRegex(keyword);
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
}

/**
 * Returns a flag-set indicating where in the document the keyword appears.
 * Whole-word, case-insensitive match.
 */
export function checkPlacement(keyword: string, ctx: PlacementContext): PlacementResult {
  const re = wordRegex(keyword);
  return {
    inTitle: !!ctx.title && re.test(ctx.title),
    inH1: !!ctx.h1 && re.test(ctx.h1),
    inFirstParagraph: !!ctx.firstParagraph && re.test(ctx.firstParagraph),
    inMetaDescription: !!ctx.metaDescription && re.test(ctx.metaDescription),
  };
}
```

- [ ] **Step 3: Run tests — must pass**

```bash
cd apps/keyword-analyzer && npx vitest run src/__tests__/placement-checker.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/core/placement-checker.ts apps/keyword-analyzer/src/__tests__/placement-checker.spec.ts
git commit -m "feat(keyword): add placement checker with unicode-aware whole-word matching"
```

---

## Task 6: Density Calculator & Target Verdict

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/core/density-calculator.ts`
- Create: `apps/keyword-analyzer/src/keyword/core/target-verdict.ts`
- Create: `apps/keyword-analyzer/src/__tests__/density-calculator.spec.ts`
- Create: `apps/keyword-analyzer/src/__tests__/target-verdict.spec.ts`

- [ ] **Step 1: Write density tests**

Create `apps/keyword-analyzer/src/__tests__/density-calculator.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { calculateDensity } from '../keyword/core/density-calculator';

describe('calculateDensity', () => {
  it('computes (frequency / totalWords) * 100', () => {
    expect(calculateDensity(5, 100)).toBe(5);
    expect(calculateDensity(1, 200)).toBe(0.5);
    expect(calculateDensity(3, 150)).toBe(2);
  });

  it('returns 0 when totalWords is 0 (guard against divide-by-zero)', () => {
    expect(calculateDensity(0, 0)).toBe(0);
    expect(calculateDensity(5, 0)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateDensity(1, 333)).toBe(0.3);
    expect(calculateDensity(7, 999)).toBe(0.7);
  });
});
```

- [ ] **Step 2: Implement density calculator**

Create `apps/keyword-analyzer/src/keyword/core/density-calculator.ts`:

```typescript
/**
 * Keyword density expressed as a percentage, rounded to 2 decimal places.
 * Protected against divide-by-zero (returns 0 if totalWords <= 0).
 */
export function calculateDensity(frequency: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  const raw = (frequency / totalWords) * 100;
  return Math.round(raw * 100) / 100;
}
```

- [ ] **Step 3: Write target-verdict tests**

Create `apps/keyword-analyzer/src/__tests__/target-verdict.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getVerdict } from '../keyword/core/target-verdict';

describe('getVerdict', () => {
  it('returns "low" when density < 1%', () => {
    expect(getVerdict(0)).toBe('low');
    expect(getVerdict(0.5)).toBe('low');
    expect(getVerdict(0.99)).toBe('low');
  });

  it('returns "optimal" when density in [1%, 3%)', () => {
    expect(getVerdict(1)).toBe('optimal');
    expect(getVerdict(2)).toBe('optimal');
    expect(getVerdict(2.99)).toBe('optimal');
  });

  it('returns "high" when density in [3%, 5%]', () => {
    expect(getVerdict(3)).toBe('high');
    expect(getVerdict(4.5)).toBe('high');
    expect(getVerdict(5)).toBe('high');
  });

  it('returns "stuffing" when density > 5%', () => {
    expect(getVerdict(5.01)).toBe('stuffing');
    expect(getVerdict(10)).toBe('stuffing');
  });

  it('isStuffing flag is true iff verdict is "stuffing"', () => {
    const { isStuffing: low } = { isStuffing: getVerdict(0.5) === 'stuffing' };
    expect(low).toBe(false);
    const { isStuffing: stuff } = { isStuffing: getVerdict(6) === 'stuffing' };
    expect(stuff).toBe(true);
  });
});
```

- [ ] **Step 4: Implement target verdict**

Create `apps/keyword-analyzer/src/keyword/core/target-verdict.ts`:

```typescript
export type Verdict = 'low' | 'optimal' | 'high' | 'stuffing';

/**
 * Maps a density percentage to a human-readable verdict following
 * the thresholds from `specs/microservices-architecture-design.md` §8.1:
 *
 *    density < 1.0%   → 'low'
 *    1.0% ≤ d < 3.0%  → 'optimal'
 *    3.0% ≤ d ≤ 5.0%  → 'high'
 *    density > 5.0%   → 'stuffing'
 */
export function getVerdict(densityPercent: number): Verdict {
  if (densityPercent < 1) return 'low';
  if (densityPercent < 3) return 'optimal';
  if (densityPercent <= 5) return 'high';
  return 'stuffing';
}

export function isStuffing(densityPercent: number): boolean {
  return getVerdict(densityPercent) === 'stuffing';
}
```

- [ ] **Step 5: Run tests — must pass**

```bash
cd apps/keyword-analyzer && npx vitest run src/__tests__/density-calculator.spec.ts src/__tests__/target-verdict.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/core/density-calculator.ts apps/keyword-analyzer/src/keyword/core/target-verdict.ts apps/keyword-analyzer/src/__tests__/density-calculator.spec.ts apps/keyword-analyzer/src/__tests__/target-verdict.spec.ts
git commit -m "feat(keyword): add density calculator and target keyword verdict logic"
```

---

## Task 7: KeywordAnalyzerService Orchestrator

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/dto/keyword-request.dto.ts`
- Create: `apps/keyword-analyzer/src/keyword/dto/keyword-response.dto.ts`
- Create: `apps/keyword-analyzer/src/keyword/keyword-analyzer.service.ts`
- Create: `apps/keyword-analyzer/src/__tests__/keyword-analyzer.service.spec.ts`

- [ ] **Step 1: Create DTO shapes**

Create `apps/keyword-analyzer/src/keyword/dto/keyword-request.dto.ts`:

```typescript
export interface KeywordAnalyzeInput {
  auditId: string;
  textContent: string;
  url: string;
  title?: string;
  h1Text?: string;
  metaDescription?: string;
  targetKeyword?: string;
  language?: string; // if omitted/empty → auto-detect
}
```

Create `apps/keyword-analyzer/src/keyword/dto/keyword-response.dto.ts`:

```typescript
export interface KeywordResultDto {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  rank: number;
}

export interface TargetKeywordAnalysisDto {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  isStuffing: boolean;
  verdict: string;
}

export interface KeywordAnalyzeOutput {
  auditId: string;
  keywords: KeywordResultDto[];
  totalWords: number;
  uniqueWords: number;
  targetAnalysis?: TargetKeywordAnalysisDto;
}
```

- [ ] **Step 2: Write orchestrator test**

Create `apps/keyword-analyzer/src/__tests__/keyword-analyzer.service.spec.ts`:

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import { KeywordAnalyzerService } from '../keyword/keyword-analyzer.service';

describe('KeywordAnalyzerService', () => {
  let service: KeywordAnalyzerService;

  beforeEach(() => {
    service = new KeywordAnalyzerService();
  });

  it('analyzes an English document end-to-end', async () => {
    const result = await service.analyze({
      auditId: 'audit-1',
      url: 'https://example.com',
      title: 'Best SEO Audit Tools for 2026',
      h1Text: 'Top SEO Audit Tools',
      metaDescription: 'Compare the best SEO audit tools of 2026.',
      textContent:
        'SEO audit tools help websites rank better. A good SEO audit identifies issues with meta tags, ' +
        'headings, and content. This seo audit guide covers the essential tools for 2026. ' +
        'Running an seo audit regularly is key to ranking success. Audit tools analyze hundreds of signals.',
      targetKeyword: 'seo audit',
      language: 'en',
    });

    expect(result.auditId).toBe('audit-1');
    expect(result.totalWords).toBeGreaterThan(0);
    expect(result.uniqueWords).toBeGreaterThan(0);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.keywords.length).toBeLessThanOrEqual(20);

    // keywords must be rank-ordered starting at 1
    expect(result.keywords[0].rank).toBe(1);
    for (let i = 1; i < result.keywords.length; i++) {
      expect(result.keywords[i].frequency).toBeLessThanOrEqual(result.keywords[i - 1].frequency);
    }

    // 'audit' should be a top keyword
    const auditKw = result.keywords.find((k) => k.keyword === 'audit');
    expect(auditKw).toBeDefined();
    expect(auditKw!.inTitle).toBe(true);
    expect(auditKw!.inH1).toBe(true);
  });

  it('auto-detects Vietnamese when language not provided', async () => {
    const result = await service.analyze({
      auditId: 'audit-2',
      url: 'https://example.vn',
      textContent:
        'Công nghệ phần mềm là một ngành rất phát triển. ' +
        'Học công nghệ phần mềm giúp bạn có nhiều cơ hội. ' +
        'Công nghệ phần mềm đang thay đổi thế giới.',
      title: 'Công nghệ phần mềm',
      h1Text: 'Học công nghệ phần mềm',
    });

    expect(result.keywords.length).toBeGreaterThan(0);
    const kw = result.keywords.find((k) => k.keyword === 'công');
    expect(kw).toBeDefined();
    expect(kw!.inTitle).toBe(true);
  });

  it('returns targetAnalysis with correct verdict', async () => {
    const body = Array.from({ length: 100 }, () => 'filler').join(' ') + ' pizza pizza pizza';
    const result = await service.analyze({
      auditId: 'audit-3',
      url: 'https://example.com',
      textContent: body,
      title: 'Best Pizza',
      targetKeyword: 'pizza',
      language: 'en',
    });

    expect(result.targetAnalysis).toBeDefined();
    expect(result.targetAnalysis!.keyword).toBe('pizza');
    expect(result.targetAnalysis!.frequency).toBe(3);
    expect(result.targetAnalysis!.inTitle).toBe(true);
    expect(['low', 'optimal', 'high', 'stuffing']).toContain(result.targetAnalysis!.verdict);
  });

  it('omits targetAnalysis when targetKeyword not provided', async () => {
    const result = await service.analyze({
      auditId: 'audit-4',
      url: 'https://example.com',
      textContent: 'some content about nothing in particular',
      language: 'en',
    });
    expect(result.targetAnalysis).toBeUndefined();
  });

  it('flags high-repetition target keyword as stuffing', async () => {
    const result = await service.analyze({
      auditId: 'audit-5',
      url: 'https://example.com',
      textContent: 'spam '.repeat(20) + 'other words here to make up total',
      targetKeyword: 'spam',
      language: 'en',
    });
    expect(result.targetAnalysis!.isStuffing).toBe(true);
    expect(result.targetAnalysis!.verdict).toBe('stuffing');
  });
});
```

- [ ] **Step 3: Implement the orchestrator**

Create `apps/keyword-analyzer/src/keyword/keyword-analyzer.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { detectLanguage, type LanguageCode } from './core/language-detector';
import { tokenize, countTotalWords } from './core/tokenizer';
import { calculateTermFrequency, topNKeywords } from './core/term-frequency';
import { checkPlacement, extractFirstParagraph } from './core/placement-checker';
import { calculateDensity } from './core/density-calculator';
import { getVerdict, isStuffing } from './core/target-verdict';
import type { KeywordAnalyzeInput } from './dto/keyword-request.dto';
import type {
  KeywordAnalyzeOutput,
  KeywordResultDto,
  TargetKeywordAnalysisDto,
} from './dto/keyword-response.dto';

const TOP_N = 20;

@Injectable()
export class KeywordAnalyzerService {
  private readonly logger = new Logger(KeywordAnalyzerService.name);

  async analyze(input: KeywordAnalyzeInput): Promise<KeywordAnalyzeOutput> {
    const start = Date.now();

    // 1. Detect language (respect caller override if provided & valid)
    const language: LanguageCode =
      input.language === 'vi' || input.language === 'en'
        ? (input.language as LanguageCode)
        : detectLanguage(input.textContent);

    // 2-3. Tokenize + stopword removal
    const tokens = tokenize(input.textContent, language);

    // Total words for density (count BEFORE stopword removal)
    const totalWords = countTotalWords(input.textContent);

    // 4. Term frequency
    const tf = calculateTermFrequency(tokens);

    // 5. Top-N
    const top = topNKeywords(tf, TOP_N);

    // Placement context — computed once, reused per keyword
    const firstParagraph = extractFirstParagraph(input.textContent);
    const ctx = {
      title: input.title,
      h1: input.h1Text,
      firstParagraph,
      metaDescription: input.metaDescription,
    };

    // 6. For each keyword: density + placement
    const keywords: KeywordResultDto[] = top.map((row, idx) => {
      const placement = checkPlacement(row.keyword, ctx);
      return {
        keyword: row.keyword,
        frequency: row.frequency,
        densityPercent: calculateDensity(row.frequency, totalWords),
        inTitle: placement.inTitle,
        inH1: placement.inH1,
        inFirstParagraph: placement.inFirstParagraph,
        inMetaDescription: placement.inMetaDescription,
        rank: idx + 1,
      };
    });

    // 7. Target keyword analysis (optional)
    let targetAnalysis: TargetKeywordAnalysisDto | undefined;
    if (input.targetKeyword && input.targetKeyword.trim().length > 0) {
      const target = input.targetKeyword.trim().toLowerCase();
      // Count occurrences in RAW lowercased text using the same whole-word rule
      const frequency = this.countOccurrences(input.textContent, target);
      const density = calculateDensity(frequency, totalWords);
      const placement = checkPlacement(target, ctx);
      targetAnalysis = {
        keyword: target,
        frequency,
        densityPercent: density,
        inTitle: placement.inTitle,
        inH1: placement.inH1,
        inFirstParagraph: placement.inFirstParagraph,
        inMetaDescription: placement.inMetaDescription,
        isStuffing: isStuffing(density),
        verdict: getVerdict(density),
      };
    }

    const output: KeywordAnalyzeOutput = {
      auditId: input.auditId,
      keywords,
      totalWords,
      uniqueWords: tf.size,
      targetAnalysis,
    };

    this.logger.log(
      `Analyzed audit=${input.auditId} lang=${language} totalWords=${totalWords} unique=${tf.size} top=${keywords.length} durationMs=${Date.now() - start}`,
    );
    return output;
  }

  /**
   * Whole-word, case-insensitive, unicode-aware count. Supports multi-word
   * target keywords (e.g. "seo audit") by escaping the phrase as-is.
   */
  private countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu');
    const matches = haystack.match(re);
    return matches ? matches.length : 0;
  }
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
cd apps/keyword-analyzer && npx vitest run src/__tests__/keyword-analyzer.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/dto apps/keyword-analyzer/src/keyword/keyword-analyzer.service.ts apps/keyword-analyzer/src/__tests__/keyword-analyzer.service.spec.ts
git commit -m "feat(keyword): add KeywordAnalyzerService orchestrating the full pipeline"
```

---

## Task 8: gRPC Controller (AnalyzeKeywords, HealthCheck)

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/keyword.controller.ts`
- Create: `apps/keyword-analyzer/src/keyword/keyword.module.ts`
- Modify: `apps/keyword-analyzer/src/app.module.ts`

- [ ] **Step 1: Create the gRPC controller**

Create `apps/keyword-analyzer/src/keyword/keyword.controller.ts`:

```typescript
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { KeywordAnalyzerService } from './keyword-analyzer.service';

/**
 * Proto request shape (camelCase because main.ts configures
 * loader `keepCase: false`).
 */
interface KeywordRequestProto {
  auditId: string;
  textContent: string;
  url: string;
  title?: string;
  h1Text?: string;
  metaDescription?: string;
  targetKeyword?: string;
  language: string;
}

interface KeywordResponseProto {
  auditId: string;
  keywords: Array<{
    keyword: string;
    frequency: number;
    densityPercent: number;
    inTitle: boolean;
    inH1: boolean;
    inFirstParagraph: boolean;
    inMetaDescription: boolean;
    rank: number;
  }>;
  totalWords: number;
  uniqueWords: number;
  targetAnalysis?: {
    keyword: string;
    frequency: number;
    densityPercent: number;
    inTitle: boolean;
    inH1: boolean;
    inFirstParagraph: boolean;
    inMetaDescription: boolean;
    isStuffing: boolean;
    verdict: string;
  };
}

@Controller()
export class KeywordController {
  private readonly logger = new Logger(KeywordController.name);

  constructor(private readonly analyzer: KeywordAnalyzerService) {}

  @GrpcMethod('KeywordAnalyzerService', 'AnalyzeKeywords')
  async analyzeKeywords(req: KeywordRequestProto): Promise<KeywordResponseProto> {
    this.logger.log(`gRPC AnalyzeKeywords audit=${req.auditId} url=${req.url}`);
    const result = await this.analyzer.analyze({
      auditId: req.auditId,
      textContent: req.textContent,
      url: req.url,
      title: req.title || undefined,
      h1Text: req.h1Text || undefined,
      metaDescription: req.metaDescription || undefined,
      targetKeyword: req.targetKeyword || undefined,
      language: req.language,
    });
    return {
      auditId: result.auditId,
      keywords: result.keywords,
      totalWords: result.totalWords,
      uniqueWords: result.uniqueWords,
      targetAnalysis: result.targetAnalysis,
    };
  }

  @GrpcMethod('KeywordAnalyzerService', 'HealthCheck')
  healthCheck(): { healthy: boolean; version: string } {
    return { healthy: true, version: '0.0.1' };
  }
}
```

- [ ] **Step 2: Create the keyword module**

Create `apps/keyword-analyzer/src/keyword/keyword.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { KeywordController } from './keyword.controller';
import { KeywordAnalyzerService } from './keyword-analyzer.service';
import { KeywordWorker } from './keyword.worker';
import { EventPublisher } from './event.publisher';

@Module({
  controllers: [KeywordController],
  providers: [KeywordAnalyzerService, KeywordWorker, EventPublisher],
  exports: [KeywordAnalyzerService],
})
export class KeywordModule {}
```

> Note: `KeywordWorker` and `EventPublisher` files are created in Task 9. This task leaves the module import list complete so Task 9 only adds the files.

- [ ] **Step 3: Wire KeywordModule into AppModule**

Replace `apps/keyword-analyzer/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { KeywordModule } from './keyword/keyword.module';
import { BULLMQ_QUEUES } from '@repo/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: BULLMQ_QUEUES.KEYWORD_START }),
    KeywordModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/keyword.controller.ts apps/keyword-analyzer/src/keyword/keyword.module.ts apps/keyword-analyzer/src/app.module.ts
git commit -m "feat(keyword): add gRPC controller and wire KeywordModule into AppModule"
```

---

## Task 9: BullMQ Worker & Event Publisher

**Files:**
- Create: `apps/keyword-analyzer/src/keyword/event.publisher.ts`
- Create: `apps/keyword-analyzer/src/keyword/keyword.worker.ts`

**Context:** Per spec §3.1, the Gateway dispatches `analyze.start` and `keyword.start` jobs in parallel after the crawler completes. The keyword analyzer consumes `keyword.start`, runs the analysis, caches the result in Redis under `audit:{id}:keyword_result`, and publishes `keyword.done` on the Redis Pub/Sub bus so the Gateway knows the keyword branch of the "wait for both" pattern is complete.

- [ ] **Step 1: Create the event publisher (Redis Pub/Sub wrapper)**

Create `apps/keyword-analyzer/src/keyword/event.publisher.ts`:

```typescript
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_KEYS } from '@repo/shared';

export interface KeywordDoneEvent {
  auditId: string;
  status: 'success' | 'failed';
  error?: string;
}

@Injectable()
export class EventPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventPublisher.name);
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /**
   * Caches the keyword result as JSON under `audit:{id}:keyword_result`
   * with a 1-hour TTL so Report service can read it later.
   */
  async cacheResult(auditId: string, payload: unknown): Promise<void> {
    const key = REDIS_KEYS.auditKeywordResult(auditId);
    await this.client.set(key, JSON.stringify(payload), 'EX', 3600);
  }

  /**
   * Publishes the `keyword.done` event on the `events` Pub/Sub channel.
   */
  async publishDone(event: KeywordDoneEvent): Promise<void> {
    const message = JSON.stringify({ type: 'keyword.done', ...event });
    const subs = await this.client.publish('events', message);
    this.logger.log(`Published keyword.done audit=${event.auditId} status=${event.status} subscribers=${subs}`);
  }
}
```

- [ ] **Step 2: Create the BullMQ worker**

Create `apps/keyword-analyzer/src/keyword/keyword.worker.ts`:

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BULLMQ_QUEUES } from '@repo/shared';
import { KeywordAnalyzerService } from './keyword-analyzer.service';
import { EventPublisher } from './event.publisher';
import type { KeywordAnalyzeInput } from './dto/keyword-request.dto';

/**
 * Job payload is produced by the Gateway when it fans out after the
 * crawler completes. Shape mirrors KeywordRequest proto + carries the
 * raw text extracted by the crawler.
 */
interface KeywordStartJobData {
  auditId: string;
  url: string;
  textContent: string;
  title?: string;
  h1Text?: string;
  metaDescription?: string;
  targetKeyword?: string;
  language?: string;
}

@Processor(BULLMQ_QUEUES.KEYWORD_START, { concurrency: 4 })
export class KeywordWorker extends WorkerHost {
  private readonly logger = new Logger(KeywordWorker.name);

  constructor(
    private readonly analyzer: KeywordAnalyzerService,
    private readonly events: EventPublisher,
  ) {
    super();
  }

  async process(job: Job<KeywordStartJobData>): Promise<void> {
    const { auditId } = job.data;
    this.logger.log(`Processing keyword.start audit=${auditId} jobId=${job.id}`);

    try {
      const input: KeywordAnalyzeInput = {
        auditId: job.data.auditId,
        url: job.data.url,
        textContent: job.data.textContent,
        title: job.data.title,
        h1Text: job.data.h1Text,
        metaDescription: job.data.metaDescription,
        targetKeyword: job.data.targetKeyword,
        language: job.data.language,
      };
      const result = await this.analyzer.analyze(input);
      await this.events.cacheResult(auditId, result);
      await this.events.publishDone({ auditId, status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Keyword analysis failed audit=${auditId}: ${message}`);
      await this.events.publishDone({ auditId, status: 'failed', error: message });
      throw err; // let BullMQ record the failure for retries
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<KeywordStartJobData>) {
    this.logger.log(`Completed audit=${job.data.auditId} jobId=${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<KeywordStartJobData>, err: Error) {
    this.logger.error(`Failed audit=${job.data.auditId} jobId=${job.id}: ${err.message}`);
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd apps/keyword-analyzer && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/keyword-analyzer/src/keyword/event.publisher.ts apps/keyword-analyzer/src/keyword/keyword.worker.ts
git commit -m "feat(keyword): add BullMQ worker and Redis event publisher for keyword.done"
```

---

## Task 10: E2E Integration Test (gRPC Round-Trip)

**Files:**
- Create: `apps/keyword-analyzer/test/keyword.e2e-spec.ts`

- [ ] **Step 1: Write the E2E test**

This spins up the full NestJS gRPC microservice in memory, connects a gRPC client to it, and calls `AnalyzeKeywords` with a realistic sample document. Redis-dependent providers (`EventPublisher`, BullMQ) are mocked so the test is fully hermetic.

Create `apps/keyword-analyzer/test/keyword.e2e-spec.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { Transport, ClientProxyFactory, ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom, Observable } from 'rxjs';
import { KeywordModule } from '../src/keyword/keyword.module';
import { EventPublisher } from '../src/keyword/event.publisher';
import { KeywordWorker } from '../src/keyword/keyword.worker';

interface KeywordGrpcClient {
  analyzeKeywords(data: Record<string, unknown>): Observable<{
    auditId: string;
    keywords: Array<{ keyword: string; frequency: number; rank: number }>;
    totalWords: number;
    uniqueWords: number;
    targetAnalysis?: { verdict: string; frequency: number };
  }>;
  healthCheck(data: Record<string, never>): Observable<{ healthy: boolean; version: string }>;
}

const GRPC_URL = '127.0.0.1:55054';
const PROTO_PATH = join(__dirname, '../../..', 'packages/proto/keyword/v1/keyword.proto');
const PROTO_DIR = join(__dirname, '../../..', 'packages/proto');

describe('KeywordAnalyzer (e2e)', () => {
  let app: INestMicroservice;
  let client: KeywordGrpcClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [KeywordModule],
    })
      // EventPublisher requires a live Redis — mock it for E2E
      .overrideProvider(EventPublisher)
      .useValue({
        onModuleInit: () => {},
        onModuleDestroy: async () => {},
        cacheResult: async () => {},
        publishDone: async () => {},
      })
      // KeywordWorker extends WorkerHost which requires BullMQ connection — stub it
      .overrideProvider(KeywordWorker)
      .useValue({ process: async () => {} })
      .compile();

    app = moduleRef.createNestMicroservice({
      transport: Transport.GRPC,
      options: {
        package: ['keyword.v1'],
        protoPath: [PROTO_PATH],
        url: GRPC_URL,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs: [PROTO_DIR],
        },
      },
    });

    await app.listen();

    const proxy = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: ['keyword.v1'],
        protoPath: [PROTO_PATH],
        url: GRPC_URL,
        loader: {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs: [PROTO_DIR],
        },
      },
    }) as unknown as ClientGrpc;

    client = proxy.getService<KeywordGrpcClient>('KeywordAnalyzerService');
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('HealthCheck returns healthy', async () => {
    const resp = await firstValueFrom(client.healthCheck({}));
    expect(resp.healthy).toBe(true);
    expect(resp.version).toBe('0.0.1');
  });

  it('AnalyzeKeywords returns ranked keywords for English document', async () => {
    const resp = await firstValueFrom(
      client.analyzeKeywords({
        auditId: '00000000-0000-0000-0000-000000000001',
        url: 'https://example.com/seo-guide',
        title: 'Complete SEO Audit Guide 2026',
        h1Text: 'SEO Audit Guide',
        metaDescription: 'Learn how to perform a complete SEO audit.',
        textContent:
          'A complete SEO audit is essential for ranking. SEO audits help identify issues ' +
          'with meta tags, headings, images, and content. This SEO audit guide walks through ' +
          'every step of a professional audit. Running an audit regularly catches problems early. ' +
          'An audit checklist covers technical SEO, on-page SEO, and off-page signals.',
        targetKeyword: 'seo audit',
        language: 'en',
      }),
    );

    expect(resp.auditId).toBe('00000000-0000-0000-0000-000000000001');
    expect(resp.totalWords).toBeGreaterThan(0);
    expect(resp.uniqueWords).toBeGreaterThan(0);
    expect(resp.keywords.length).toBeGreaterThan(0);
    expect(resp.keywords[0].rank).toBe(1);

    // target should be present with a verdict
    expect(resp.targetAnalysis).toBeDefined();
    expect(['low', 'optimal', 'high', 'stuffing']).toContain(resp.targetAnalysis!.verdict);
    expect(resp.targetAnalysis!.frequency).toBeGreaterThanOrEqual(1);
  }, 15_000);

  it('AnalyzeKeywords handles Vietnamese document with auto-detected language', async () => {
    const resp = await firstValueFrom(
      client.analyzeKeywords({
        auditId: '00000000-0000-0000-0000-000000000002',
        url: 'https://example.vn',
        title: 'Công nghệ phần mềm',
        h1Text: 'Học công nghệ phần mềm',
        metaDescription: 'Khóa học công nghệ phần mềm trực tuyến.',
        textContent:
          'Công nghệ phần mềm là một ngành học rất phát triển hiện nay. ' +
          'Học công nghệ phần mềm mở ra nhiều cơ hội việc làm hấp dẫn. ' +
          'Công nghệ phần mềm đang thay đổi cách chúng ta làm việc và sống.',
        targetKeyword: 'công nghệ',
        language: '', // empty → auto-detect
      }),
    );

    expect(resp.keywords.length).toBeGreaterThan(0);
    expect(resp.targetAnalysis).toBeDefined();
    expect(resp.targetAnalysis!.frequency).toBeGreaterThanOrEqual(1);
  }, 15_000);
});
```

- [ ] **Step 2: Run the E2E test**

```bash
cd apps/keyword-analyzer && npx vitest run test/keyword.e2e-spec.ts
```

Expected: 3 tests pass (HealthCheck, English analysis, Vietnamese analysis).

- [ ] **Step 3: Run the full suite to confirm nothing regressed**

```bash
cd apps/keyword-analyzer && npx vitest run
```

Expected: all unit + e2e specs green.

- [ ] **Step 4: Commit**

```bash
git add apps/keyword-analyzer/test/keyword.e2e-spec.ts
git commit -m "test(keyword): add E2E gRPC integration test for AnalyzeKeywords and HealthCheck"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `cd apps/keyword-analyzer && npx tsc --noEmit` — zero TypeScript errors
- [ ] `cd apps/keyword-analyzer && npx vitest run` — all unit + E2E tests pass
- [ ] `cd apps/keyword-analyzer && npm run build` — `dist/` produced without errors
- [ ] `cd apps/keyword-analyzer && npm run dev` starts with two log lines:
  - `Keyword Analyzer gRPC service running on port 50054`
  - BullMQ worker log indicating the `keyword.start` queue is being consumed
- [ ] `grpcurl -plaintext localhost:50054 keyword.v1.KeywordAnalyzerService/HealthCheck` returns `{"healthy": true, "version": "0.0.1"}`
- [ ] Manual BullMQ smoke test: push a sample job into `keyword.start` (via Gateway or `redis-cli`) and verify:
  - Worker log shows `Processing keyword.start audit=...`
  - `redis-cli GET audit:{id}:keyword_result` returns the cached JSON
  - A `keyword.done` message is published on the `events` channel (`redis-cli SUBSCRIBE events`)
- [ ] `apps/keyword-analyzer/src/keyword/core/` contains 7 pure modules (language-detector, stopwords, tokenizer, term-frequency, placement-checker, density-calculator, target-verdict), each with a matching `.spec.ts` in `src/__tests__/`
- [ ] No Prisma code anywhere under `apps/keyword-analyzer/` (this service is stateless by design)
- [ ] Code coverage of `src/keyword/core/**` is ≥ 90% per the vitest coverage report

---

## What Comes Next

This plan produces a **fully functional, testable Keyword Analyzer microservice**. The following plans integrate it into the platform:

| Next Plan | What it adds on top of Plan 5 |
|-----------|------------------------------|
| Plan 6: Report Service | Reads the cached `audit:{id}:keyword_result` from Redis, persists keywords + target analysis into `report_keywords` table, renders them in the PDF and UI payloads |
| Plan 7: Integration | Gateway pushes `keyword.start` jobs after crawler finishes, subscribes to `keyword.done` as part of the "wait for both" pattern, full E2E pipeline tests (crawl → analyze+keyword → report), production docker-compose with the keyword-analyzer container |

Known limitations intentionally left out of this plan (captured for later):
- No TF-IDF or n-gram support — only single-token frequency. Bi-gram support can be added as a follow-up enhancement.
- Language detection is a heuristic; for multi-language pages the caller should pass `language` explicitly.
- Stopword lists are static TypeScript constants. A follow-up plan may externalize them into JSON files and add a "custom stopwords per audit" feature.
- The worker's BullMQ concurrency is hardcoded at 4. Tuning is deferred to Plan 7 (Integration) where load-testing happens.
