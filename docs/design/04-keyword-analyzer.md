# 04 — Keyword Analyzer Service

> **Vai trò:** Phụ bếp — tách từ, tính mật độ + vị trí keyword, phán verdict target keyword (low/optimal/high/stuffing).
>
> **Port:** 50054 (gRPC).
>
> **Database:** Không có. Stateless hoàn toàn; cache result vào Redis.

---

## 1. Mục đích & Trách nhiệm

1. **Language detection** — tự động phát hiện tiếng Việt (VI) hay tiếng Anh (EN).
2. **Tokenization** — tách chuỗi văn bản thành token có nghĩa (strip stopword, punctuation, normalize case).
3. **Term frequency + Top N** — đếm tần suất, sort giảm dần, lấy top 20.
4. **Density calculation** — `(frequency / totalWords) × 100` cho mỗi keyword.
5. **Placement analysis** — keyword xuất hiện ở title, H1, meta description, đoạn đầu không?
6. **Target keyword verdict** — nếu user cung cấp `targetKeyword`, phán verdict dựa vào density:
   - `density < 1%` → `low`
   - `1% ≤ density < 3%` → `optimal`
   - `3% ≤ density ≤ 5%` → `high`
   - `density > 5%` → `stuffing` (spam)
7. **Publish `keyword.done`** → report gom.

**Triết lý:** pure functional pipeline. Không DB, không network dependency khác ngoài Redis. Tất cả logic trong `domain/` đều là pure function — test cực nhanh.

---

## 2. Kiến trúc module

```
apps/keyword-analyzer/src/
├── main.ts                            # Bootstrap: createMicroservice (gRPC only)
├── app.module.ts                      # BullMQ + KeywordModule
└── keyword/
    ├── keyword.module.ts              # DI
    ├── controllers/
    │   ├── keyword.controller.ts      # gRPC: AnalyzeKeywords, HealthCheck
    │   └── keyword.worker.ts          # BullMQ @Processor('keyword.start')
    ├── services/
    │   ├── keyword-analyzer.service.ts # Pipeline: detect → tokenize → TF → density → placement → verdict
    │   └── event.publisher.ts          # Redis cache result + publish
    ├── domain/                        # Pure functions
    │   ├── language-detector.ts       # VI vs EN heuristic
    │   ├── tokenizer.ts               # Unicode-aware split + filter
    │   ├── stopwords.ts               # EN ~170 + VI ~180 từ
    │   ├── term-frequency.ts          # Count + top-N
    │   ├── density-calculator.ts      # Round 2 decimals
    │   ├── placement-checker.ts       # Regex whole-word
    │   └── target-verdict.ts          # Threshold mapping
    └── dto/
        ├── keyword-request.dto.ts
        └── keyword-response.dto.ts
```

---

## 3. Language detection

File: [language-detector.ts](../../apps/keyword-analyzer/src/keyword/domain/language-detector.ts).

```typescript
const VIETNAMESE_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

export function detectLanguage(text: string): 'vi' | 'en' {
  return VIETNAMESE_CHARS.test(text) ? 'vi' : 'en';
}
```

**Chiến lược:** heuristic cực đơn giản — chỉ cần 1 ký tự Việt là VI, còn lại EN.

**Hạn chế (chấp nhận):**
- Text tiếng Pháp/Đức có `é`, `à`... cũng bị nhận nhầm là VI. Không vấn đề vì scope đồ án chỉ support VI + EN.
- Text không dấu (gõ tiếng Việt không dấu) bị nhận là EN → tokenize vẫn chạy nhưng stopword filter sai. Chấp nhận vì content trả về từ SEO-ready website thường có dấu.

**Override:** Request có thể truyền `language: 'vi' | 'en'` để bypass auto-detect. Service chỉ auto-detect nếu field này rỗng hoặc không hợp lệ.

---

## 4. Tokenization

File: [tokenizer.ts](../../apps/keyword-analyzer/src/keyword/domain/tokenizer.ts).

### 4.1 Pipeline

```typescript
export function tokenize(text: string, language: 'vi' | 'en'): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')    // Bỏ punctuation, giữ Unicode letter + number
    .split(/\s+/)
    .filter(t => t.length >= 2)           // Bỏ token 1 ký tự
    .filter(t => !getStopwords(language).has(t));  // Bỏ stopword
}
```

**Regex `[^\p{L}\p{N}]+/gu`:** dùng Unicode property escape — `\p{L}` là letter (bao gồm chữ Việt có dấu), `\p{N}` là number. Không match punctuation, whitespace, emoji, symbol.

### 4.2 Tổng số từ (cho denominator density)

```typescript
export function countAllWords(text: string): number {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0)           // KHÔNG filter stopword, KHÔNG filter len≥2
    .length;
}
```

**Khác biệt quan trọng:**
- `tokenize()` → dùng để đếm TF và lấy top keyword. Đã strip stopword.
- `countAllWords()` → dùng làm denominator khi tính density. **Đếm tất cả** kể cả stopword.

**Ví dụ:** text `"the cat and the dog"`:
- `tokenize('en')` → `['cat', 'dog']` (2 token)
- `countAllWords()` → `5`
- Density('cat') = `1 / 5 × 100 = 20%`

### 4.3 Stopword lists

File: [stopwords.ts](../../apps/keyword-analyzer/src/keyword/domain/stopwords.ts).

**EN** (`EN_STOPWORDS`, ~170 từ): `the, a, an, and, or, but, if, while, to, from, in, on, at, by, with, for, of, is, are, was, were, be, been, ...`

**VI** (`VI_STOPWORDS`, ~180 từ): `của, và, là, được, trong, khi, với, cho, như, từ, đến, đã, sẽ, này, đó, rằng, nếu, mà, về, theo, ...`

Cả 2 lưu dạng `ReadonlySet<string>` — lookup O(1). Pre-lowercased.

```typescript
export function getStopwords(language: 'vi' | 'en'): ReadonlySet<string> {
  return language === 'vi' ? VI_STOPWORDS : EN_STOPWORDS;
}
```

---

## 5. Term Frequency + Top N

File: [term-frequency.ts](../../apps/keyword-analyzer/src/keyword/domain/term-frequency.ts).

```typescript
export function calculateTermFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return freq;
}

export function topNKeywords(tf: Map<string, number>, n: number): Array<{ keyword, frequency }> {
  return [...tf.entries()]
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.keyword.localeCompare(b.keyword))
    .slice(0, n);
}
```

**N = 20** (hardcoded trong `KeywordAnalyzerService.analyze()` as `TOP_N`).

**Tie-break bằng alphabet** — quan trọng vì đảm bảo deterministic: cùng 1 input luôn trả cùng 1 output, test assert ổn định.

---

## 6. Density calculation

File: [density-calculator.ts](../../apps/keyword-analyzer/src/keyword/domain/density-calculator.ts).

```typescript
export function calculateDensity(frequency: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  return Math.round((frequency / totalWords) * 100 * 100) / 100;  // Round 2 decimals
}
```

**Công thức:** `density% = frequency / totalWords × 100`

**Làm tròn 2 chữ số** để UI hiển thị đẹp: `2.47%` thay vì `2.4691358024...`.

---

## 7. Placement analysis

File: [placement-checker.ts](../../apps/keyword-analyzer/src/keyword/domain/placement-checker.ts).

```typescript
export function checkPlacement(
  keyword: string,
  ctx: { title?, h1?, firstParagraph?, metaDescription? }
): PlacementResult {
  const pattern = buildWholeWordRegex(keyword);
  return {
    inTitle: pattern.test(ctx.title ?? ''),
    inH1: pattern.test(ctx.h1 ?? ''),
    inFirstParagraph: pattern.test(ctx.firstParagraph ?? ''),
    inMetaDescription: pattern.test(ctx.metaDescription ?? ''),
  };
}

function buildWholeWordRegex(keyword: string): RegExp {
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Unicode whole-word boundary
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
}
```

**Whole-word matching:** `(?<![\p{L}\p{N}])` + `(?![\p{L}\p{N}])` là lookaround Unicode-aware. Ngăn partial match: tìm `"seo"` không match trong `"season"` hay `"seoul"`.

**First paragraph:** `KeywordAnalyzerService` extract từ `textContent` — lấy 100 từ đầu tiên (không dựa vào dấu `.` vì text từ Cheerio đã strip markup).

```typescript
const firstParagraph = textContent
  .split(/\s+/)
  .slice(0, 100)
  .join(' ');
```

---

## 8. Target keyword verdict

File: [target-verdict.ts](../../apps/keyword-analyzer/src/keyword/domain/target-verdict.ts).

```typescript
export type Verdict = 'low' | 'optimal' | 'high' | 'stuffing';

export function getVerdict(density: number): Verdict {
  if (density < 1.0) return 'low';
  if (density < 3.0) return 'optimal';
  if (density <= 5.0) return 'high';
  return 'stuffing';
}

export function isStuffing(density: number): boolean {
  return getVerdict(density) === 'stuffing';
}
```

**Thresholds:** chuẩn industry từ [Moz + Ahrefs guidelines](https://moz.com/learn/seo/keyword-density). Không có "công thức vàng" tuyệt đối; giá trị trên là consensus.

**Chỉ chạy khi có `targetKeyword`:**
- `KeywordAnalyzerService.analyze(input)` — nếu `input.targetKeyword` rỗng/null/undefined → `targetAnalysis = null`.
- Output chỉ có trường `targetAnalysis` khi user cung cấp.

---

## 9. Service orchestrator

File: [keyword-analyzer.service.ts](../../apps/keyword-analyzer/src/keyword/services/keyword-analyzer.service.ts).

```typescript
@Injectable()
export class KeywordAnalyzerService {
  private readonly TOP_N = 20;

  async analyze(input: KeywordAnalyzeInput): Promise<KeywordAnalyzeOutput> {
    // 1. Language
    const language = this.resolveLanguage(input);  // override > detect

    // 2. Tokenize + total
    const tokens = tokenize(input.textContent, language);
    const totalWords = countAllWords(input.textContent);

    // 3. TF + Top N
    const tf = calculateTermFrequency(tokens);
    const topKeywords = topNKeywords(tf, this.TOP_N);

    // 4. First paragraph
    const firstParagraph = input.textContent.split(/\s+/).slice(0, 100).join(' ');

    // 5. Per-keyword: density + placement
    const keywords = topKeywords.map((k, i) => ({
      keyword: k.keyword,
      frequency: k.frequency,
      densityPercent: calculateDensity(k.frequency, totalWords),
      rank: i + 1,
      ...checkPlacement(k.keyword, {
        title: input.title,
        h1: input.h1Text,
        firstParagraph,
        metaDescription: input.metaDescription,
      }),
    }));

    // 6. Target keyword analysis (nếu có)
    let targetAnalysis: TargetKeywordAnalysisDto | undefined;
    if (input.targetKeyword) {
      const targetFreq = tf.get(input.targetKeyword.toLowerCase()) ?? 0;
      const density = calculateDensity(targetFreq, totalWords);
      targetAnalysis = {
        keyword: input.targetKeyword,
        frequency: targetFreq,
        densityPercent: density,
        verdict: getVerdict(density),
        isStuffing: isStuffing(density),
        ...checkPlacement(input.targetKeyword, { ... }),
      };
    }

    return {
      auditId: input.auditId,
      keywords,
      totalWords,
      uniqueWords: tf.size,
      targetAnalysis,
    };
  }
}
```

---

## 10. BullMQ consumer: `keyword.start`

File: [keyword.worker.ts](../../apps/keyword-analyzer/src/keyword/controllers/keyword.worker.ts).

```typescript
@Processor(BULLMQ_QUEUES.KEYWORD_START, { concurrency: 4 })
export class KeywordWorker extends WorkerHost {
  async process(job: Job<KeywordStartJobData>) {
    const { auditId, ...input } = job.data;
    try {
      const result = await this.analyzer.analyze({ auditId, ...input });

      // Cache result cho report service
      await this.eventPublisher.cacheResult(auditId, result);

      // Publish done event
      await this.eventPublisher.publishDone({ auditId, status: 'success' });
    } catch (err) {
      await this.eventPublisher.publishDone({ auditId, status: 'failed', error: err.message });
      throw err;  // re-throw để BullMQ retry
    }
  }
}
```

**Concurrency = 4** — keyword analysis cực nhẹ (pure CPU, không I/O), chạy song song 4 job trên 1 worker không tốn tài nguyên.

**Input payload:**
```typescript
interface KeywordStartJobData {
  auditId: string;
  url: string;
  textContent: string;
  title?: string;
  h1Text?: string;
  metaDescription?: string;
  targetKeyword?: string;
  language?: 'vi' | 'en';
}
```

**Crucial:** worker **luôn publish `keyword.done`** kể cả khi fail — với `status: 'failed'`. Lý do: nếu không publish, `WaitForBothService` counter trong report service sẽ không đủ 2/2 và audit đứng đó mãi.

---

## 11. gRPC exposed RPCs

Proto: `packages/proto/keyword/v1/keyword.proto`.

| RPC | Request | Response | Mục đích |
|---|---|---|---|
| `AnalyzeKeywords` | `{ audit_id, text_content, url, title?, h1_text?, meta_description?, target_keyword?, language? }` | `{ audit_id, keywords[], total_words, unique_words, target_analysis? }` | Sync analyze (admin / test) |
| `HealthCheck` | `{}` | `{ healthy, version }` | Liveness |

Gateway **không gọi** service này qua gRPC trong production flow — tất cả đi qua queue. RPC chỉ dùng cho:
- Admin tool debug keyword chất lượng.
- E2E test.

---

## 12. Redis pub/sub & caching

### Publish

| Channel | Payload | Consumer |
|---|---|---|
| `keyword.done` | `{ auditId, status: 'success'\|'failed', error? }` | Report (`KeywordDoneListener`) |

### Cache

| Key | TTL | Mục đích |
|---|---|---|
| `audit:{id}:keyword_result` | 3600s | Full KeywordAnalyzeOutput để report service gom |

### Completed steps

| Key | Mục đích |
|---|---|
| `audit:{id}:completed_steps` | Set chứa `'keyword'` — report fan-in counter |

---

## 13. Khởi động

File: [apps/keyword-analyzer/src/main.ts](../../apps/keyword-analyzer/src/main.ts).

```typescript
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: ['keyword.v1'],
      protoPath: [join(PROTO_ROOT, 'keyword/v1/keyword.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50054}`,
      loader: { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [PROTO_ROOT] },
    },
  });
  await app.listen();
}
```

**Khác với crawler/analyzer:** dùng `createMicroservice` trực tiếp (không cần hybrid app) — vì không có HTTP server.

**BullMQ** vẫn chạy được trong microservice mode vì worker là NestJS provider ở tầng DI, không phải transport riêng.

---

## 14. File tham chiếu quan trọng

| File | Mục đích |
|---|---|
| [src/main.ts](../../apps/keyword-analyzer/src/main.ts) | Bootstrap |
| [app.module.ts](../../apps/keyword-analyzer/src/app.module.ts) | BullMQ config |
| [keyword/keyword.module.ts](../../apps/keyword-analyzer/src/keyword/keyword.module.ts) | DI |
| [keyword/controllers/keyword.controller.ts](../../apps/keyword-analyzer/src/keyword/controllers/keyword.controller.ts) | gRPC RPCs |
| [keyword/controllers/keyword.worker.ts](../../apps/keyword-analyzer/src/keyword/controllers/keyword.worker.ts) | BullMQ consumer |
| [keyword/services/keyword-analyzer.service.ts](../../apps/keyword-analyzer/src/keyword/services/keyword-analyzer.service.ts) | Pipeline orchestrator |
| [keyword/services/event.publisher.ts](../../apps/keyword-analyzer/src/keyword/services/event.publisher.ts) | Redis cache + pub |
| [keyword/domain/language-detector.ts](../../apps/keyword-analyzer/src/keyword/domain/language-detector.ts) | VI/EN heuristic |
| [keyword/domain/tokenizer.ts](../../apps/keyword-analyzer/src/keyword/domain/tokenizer.ts) | Split + filter |
| [keyword/domain/stopwords.ts](../../apps/keyword-analyzer/src/keyword/domain/stopwords.ts) | EN + VI list |
| [keyword/domain/term-frequency.ts](../../apps/keyword-analyzer/src/keyword/domain/term-frequency.ts) | TF + top-N |
| [keyword/domain/density-calculator.ts](../../apps/keyword-analyzer/src/keyword/domain/density-calculator.ts) | % density |
| [keyword/domain/placement-checker.ts](../../apps/keyword-analyzer/src/keyword/domain/placement-checker.ts) | Whole-word regex |
| [keyword/domain/target-verdict.ts](../../apps/keyword-analyzer/src/keyword/domain/target-verdict.ts) | Threshold mapping |
| [packages/proto/keyword/v1/keyword.proto](../../packages/proto/keyword/v1/keyword.proto) | gRPC contract |

---

## 15. Điểm nâng cấp khả dĩ

- **Vietnamese word segmentation**: hiện tokenize theo whitespace. Tiếng Việt có bigram/trigram thực sự ý nghĩa (vd `"tối ưu hoá"` là 1 cụm). Có thể tích hợp [vntk](https://github.com/vntk/vntk) hoặc [underthesea](https://github.com/undertheseanlp/underthesea) để word segment chính xác hơn.
- **N-gram extraction**: hiện chỉ unigram. Bigram (`"seo tool"`, `"search engine"`) có thể hữu ích hơn cho SEO keyword research.
- **TF-IDF thay vì TF**: với 1 page thì TF-IDF không đo được (cần corpus). Nhưng nếu mở rộng sang compare toàn site, TF-IDF chỉ ra keyword thực sự unique.
- **Stemming / lemmatization**: `running`, `runs`, `ran` hiện coi là 3 keyword khác nhau. Porter stemmer cho EN sẽ gộp thành 1.
- **Readability** (đã có trong analyzer rule): có thể move sang keyword service để dùng chung tokenization.
- **Content quality signals**: paragraph length, sentence length, subheading coverage... có thể thêm vào service này thay vì analyzer.

---

## 16. Đi tiếp

- Xem report gộp keyword với analyzer → [05-report.md](05-report.md)
- Xem queue flow → [22-job-pipeline.md](22-job-pipeline.md)
- Xem gRPC proto reference → [21-api-contracts.md §3](21-api-contracts.md)
