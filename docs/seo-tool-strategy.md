# V. ĐỀ XUẤT CHIẾN LƯỢC PHÁT TRIỂN WEB SEO TOOL

> **Phiên bản**: 1.0
> **Ngày lập**: 17/03/2026
> **Phân loại**: Tài liệu đề xuất kiến trúc — Đồ án tốt nghiệp
> **Tham chiếu**: Phân tích codebase Avada SEO Suite v1.45.12 (43 controllers, 47 repositories, 60+ pages, 40+ PubSub subscribers)

---

## Mục lục

1. [Tổng quan chiến lược](#1-tổng-quan-chiến-lược)
2. [Kiến trúc tổng thể hệ thống](#2-kiến-trúc-tổng-thể-hệ-thống)
3. [Phase 1 — Rút lõi kiến trúc (1-2 tuần)](#3-phase-1--rút-lõi-kiến-trúc-1-2-tuần)
4. [Phase 2 — Thay thế Platform Layer (2-4 tuần)](#4-phase-2--thay-thế-platform-layer-2-4-tuần)
5. [Phase 3 — Rebuild SEO Features (4-8 tuần)](#5-phase-3--rebuild-seo-features-4-8-tuần)
6. [Roadmap tổng thể](#6-roadmap-tổng-thể)
7. [Đánh giá rủi ro & hướng mở rộng](#7-đánh-giá-rủi-ro--hướng-mở-rộng)

---

## 1. Tổng quan chiến lược

### 1.1 Mục tiêu hệ thống

Xây dựng một **Web SEO Tool tổng quát** — một nền tảng SaaS cho phép người dùng phân tích, tối ưu hóa và giám sát hiệu suất SEO của bất kỳ website nào, không giới hạn ở một nền tảng e-commerce cụ thể (Shopify, WordPress, Webflow, v.v.).

**Mục tiêu cụ thể:**

| Mục tiêu | Mô tả | Chỉ số đo lường |
|-----------|--------|------------------|
| **Phân tích On-page SEO** | Crawl và đánh giá meta tags, headings, images, internal links | SEO Score 0-100 cho mỗi trang |
| **Structured Data Validation** | Kiểm tra JSON-LD, Rich Results eligibility | Số lỗi schema / trang |
| **Site Speed Analysis** | Đo lường Core Web Vitals qua Lighthouse API | LCP, FID, CLS metrics |
| **AI SEO Recommendations** | Đề xuất tối ưu tự động bằng LLM | Số recommendations / audit |
| **Keyword Research** | Phân tích keyword density, gợi ý keyword liên quan | Keyword suggestions / query |
| **Sitemap Management** | Tạo, validate và submit XML sitemap | Số URL indexed / submitted |

### 1.2 Định hướng phát triển

Hệ thống được xây dựng theo triết lý **"Crawl → Analyze → Recommend"**:

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   CRAWL     │────►│   ANALYZE    │────►│  RECOMMEND     │
│             │     │              │     │                │
│ - HTML      │     │ - Meta tags  │     │ - AI suggestions│
│ - CSS/JS    │     │ - Headings   │     │ - Fix guides   │
│ - Images    │     │ - Schema     │     │ - Priority list│
│ - Links     │     │ - Speed      │     │ - Auto-fix     │
│ - Sitemap   │     │ - Keywords   │     │ - Reports      │
└─────────────┘     └──────────────┘     └────────────────┘
```

Ba giai đoạn này tương ứng với ba module lõi của hệ thống, mỗi module có thể hoạt động độc lập và scale riêng.

### 1.3 Tại sao chọn hướng Web SEO Tool tổng quát

**Lý do kỹ thuật:**

Sau khi phân tích toàn bộ codebase Avada SEO Suite, nhận thấy ~60-70% code gắn chặt với Shopify ecosystem (Liquid compilation, Theme Assets, Metafields, Shopify OAuth, Shopify Webhooks). Việc fork trực tiếp để build tool SEO tổng quát sẽ tốn nhiều công strip Shopify code hơn là build lại với cùng pattern.

Tuy nhiên, **30-35% còn lại chứa các pattern kiến trúc cực kỳ giá trị**:

| Pattern từ Avada SEO | Giá trị tái sử dụng | Mức độ |
|----------------------|---------------------|--------|
| Controller → Service → Repository | Toàn bộ backend architecture | Cao |
| useFetchApi / useCreateApi / useEditApi / useDeleteApi | API hook abstraction | Cao |
| PubSub chunked processing | Background job pattern | Cao |
| LangGraph StateGraph + SSE streaming | AI Agent architecture | Rất cao |
| Condition-based Rule Engine | Automation engine | Cao |
| Multi-layer Fallback Chain | Config resolution | Trung bình |
| Credit system (Firestore transactions) | Usage billing | Trung bình |

**Lý do thị trường:**

- Thị trường SEO tools (Ahrefs, SEMrush, Moz) có giá trị $1.2B+ (2025), tăng trưởng 15% YoY
- Các công cụ hiện tại chủ yếu phục vụ off-page SEO (backlinks, rankings). Mảng **on-page SEO analysis + AI recommendations** vẫn còn khoảng trống
- Xu hướng 2026: AI-first SEO — Google AI Overviews ưu tiên trang có structured data rõ ràng + content chất lượng cao

**Lý do học thuật:**

Đề tài này cho phép trình bày đầy đủ các khía cạnh kỹ thuật của một hệ thống SaaS hiện đại:
- Kiến trúc microservice / modular monolith
- Web crawling và data processing pipeline
- AI/LLM integration (LangChain, streaming)
- Real-time communication (SSE/WebSocket)
- Authentication, authorization, subscription billing
- Background job processing, cron scheduling
- Database design, caching, performance optimization

---

## 2. Kiến trúc tổng thể hệ thống

### 2.1 Mô hình hệ thống: Modular Monolith

Lựa chọn **Modular Monolith** thay vì Microservice thuần túy vì:

| Tiêu chí | Microservice | Modular Monolith | Lý do chọn |
|-----------|-------------|-------------------|-------------|
| Độ phức tạp triển khai | Cao (K8s, service mesh) | Thấp (1 process) | Phù hợp team nhỏ, đồ án |
| Latency giữa modules | Cao (network call) | Thấp (in-process) | SEO analysis cần nhiều module phối hợp |
| Khả năng tách sau | Có | Có (nếu thiết kế đúng) | Có thể tách thành microservice khi scale |
| Monitoring | Phức tạp (distributed tracing) | Đơn giản | Phù hợp giai đoạn MVP |
| Database | Mỗi service 1 DB | Shared DB, schema tách biệt | Đơn giản hóa transactions |

**Nguyên tắc thiết kế Modular Monolith:**
- Mỗi module có `controllers/`, `services/`, `repositories/` riêng
- Module giao tiếp qua **interface rõ ràng** (exported functions), không truy cập trực tiếp DB của module khác
- Shared kernel: chỉ chứa types, constants, utils chung
- Background jobs giao tiếp qua message queue (BullMQ) — giống PubSub pattern của Avada

### 2.2 Luồng dữ liệu: Crawl → Analyze → Recommend

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (React SPA)                              │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────────────────┐ │
│  │Dashboard │ │SEO Analyzer  │ │Sitemap   │ │AI Chat (SSE Stream)    │ │
│  │          │ │              │ │Generator │ │                        │ │
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘ └───────────┬────────────┘ │
│       │              │              │                    │              │
├───────┼──────────────┼──────────────┼────────────────────┼──────────────┤
│       ▼              ▼              ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    API GATEWAY (Fastify)                          │   │
│  │  ┌───────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────────┐  │   │
│  │  │Auth       │ │Rate Limit  │ │CORS      │ │Request Logger   │  │   │
│  │  │Middleware  │ │Middleware  │ │Middleware │ │Middleware       │  │   │
│  │  └───────────┘ └────────────┘ └──────────┘ └─────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│       │              │              │                    │              │
│  ┌────┼──────────────┼──────────────┼────────────────────┼──────────┐   │
│  │    ▼              ▼              ▼                    ▼          │   │
│  │  MODULES                                                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │   │
│  │  │ Crawler     │ │ Analyzer    │ │ AI Agent    │               │   │
│  │  │ Module      │ │ Module      │ │ Module      │               │   │
│  │  │             │ │             │ │             │               │   │
│  │  │ controller  │ │ controller  │ │ controller  │               │   │
│  │  │ service     │ │ service     │ │ service     │               │   │
│  │  │ repository  │ │ repository  │ │ repository  │               │   │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │   │
│  │         │               │               │                      │   │
│  │  ┌──────┼───────────────┼───────────────┼──────────────────┐   │   │
│  │  │      ▼               ▼               ▼                  │   │   │
│  │  │           SHARED INFRASTRUCTURE                         │   │   │
│  │  │  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │   │
│  │  │  │PostgreSQL │ │Redis     │ │BullMQ    │ │S3/Minio  │  │   │   │
│  │  │  │(primary)  │ │(cache +  │ │(job      │ │(storage) │  │   │   │
│  │  │  │           │ │ session) │ │ queue)   │ │          │  │   │   │
│  │  │  └───────────┘ └──────────┘ └──────────┘ └──────────┘  │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │              EXTERNAL SERVICES                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │Google    │ │Lighthouse│ │OpenAI /  │ │DataForSEO /      │  │   │
│  │  │Search    │ │API       │ │Claude API│ │Tavily Search     │  │   │
│  │  │Console   │ │          │ │          │ │                  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Mô tả luồng dữ liệu chính

**Luồng 1: Crawl & Analyze một website**

```
User nhập URL website
    │
    ▼
[API] POST /api/projects/:id/crawl
    │
    ▼
[Controller] Validate URL, check quota
    │
    ▼
[Service] Tạo CrawlJob trong DB (status: "pending")
    │
    ▼
[BullMQ] Enqueue job → crawl-queue
    │
    ▼
[Worker] Dequeue job
    ├── Playwright: fetch HTML (render JS nếu SPA)
    ├── Parse HTML: extract meta, headings, images, links, schema
    ├── Store raw data → PostgreSQL (pages table)
    ├── Analyze: tính SEO score, detect issues
    ├── Store analysis → PostgreSQL (audits table)
    └── Update CrawlJob status: "completed"
    │
    ▼
[SSE / Polling] Frontend nhận kết quả real-time
    │
    ▼
User thấy SEO report với score + issues + recommendations
```

**Luồng 2: AI SEO Recommendation (streaming)**

```
User chọn một page đã crawl → click "AI Analyze"
    │
    ▼
[API] POST /api/ai-agent/analyze (SSE connection)
    │
    ▼
[Controller] Fetch page data + audit data từ DB
    │
    ▼
[LangGraph Agent] Nhận context (page HTML, meta, scores)
    │
    ├── Tool: analyzeMetaTags() → đánh giá title/description
    ├── Tool: analyzeHeadings() → kiểm tra H1-H6 hierarchy
    ├── Tool: analyzeImages() → kiểm tra alt text, size
    ├── Tool: searchKeywords() → Tavily search cho keyword ideas
    ├── Tool: checkCompetitors() → so sánh với top 10 SERP
    │
    ▼
[SSE Stream] Gửi từng token recommendation về frontend
    │
    ▼
User thấy AI suggestions xuất hiện real-time
```

---

## 3. Phase 1 — Rút lõi kiến trúc (1-2 tuần)

Giai đoạn này tập trung vào việc **extract các design pattern** từ Avada SEO Suite và thiết lập **project skeleton** cho hệ thống mới. Không viết feature nào — chỉ dựng khung.

### 3.1 Backend Architecture Pattern: Controller → Service → Repository

#### 3.1.1 Lý do chọn pattern

Pattern **Controller → Service → Repository** (còn gọi là 3-tier / layered architecture) được Avada SEO áp dụng rất triệt để với 43 controllers, hàng chục services, và 47 repositories. Đây là pattern phổ biến nhất trong enterprise backend vì:

| Lợi ích | Giải thích |
|---------|------------|
| **Separation of Concerns** | Mỗi layer có trách nhiệm rõ ràng, không chồng chéo |
| **Testability** | Service có thể test độc lập bằng cách mock repository |
| **Replaceability** | Thay đổi DB (Firestore → PostgreSQL) chỉ cần sửa repository layer |
| **Team scalability** | Nhiều developer có thể làm việc song song trên các layer khác nhau |
| **Code review clarity** | Reviewer biết chính xác nên expect gì ở mỗi layer |

#### 3.1.2 Quy tắc cho từng layer

**Controller Layer** — Điểm vào của HTTP request:
- Chỉ làm 3 việc: (1) extract dữ liệu từ request, (2) gọi service, (3) trả response
- KHÔNG chứa business logic
- KHÔNG truy cập database trực tiếp
- PHẢI có error handling (try/catch → proper HTTP status code)

**Service Layer** — Trung tâm business logic:
- Chứa toàn bộ logic nghiệp vụ
- Gọi một hoặc nhiều repository
- Có thể gọi external services (API bên thứ 3)
- KHÔNG biết về HTTP context (request/response objects)
- KHÔNG truy cập database trực tiếp

**Repository Layer** — Data access abstraction:
- Là nơi DUY NHẤT giao tiếp với database
- Mỗi repository tương ứng 1 database table/collection
- Naming convention: `getById()`, `getByField()`, `create()`, `update()`, `delete()`
- Return plain objects, không return database-specific objects

#### 3.1.3 Ví dụ flow request: Tạo SEO Audit cho một URL

```
POST /api/audits
Body: { url: "https://example.com", projectId: "proj_123" }

┌─────────────────────────────────────────────────────────────────┐
│ auditController.create(req, res)                                 │
│                                                                  │
│   const userId = req.user.id;                                    │
│   const { url, projectId } = req.body;                           │
│                                                                  │
│   // Validate input                                              │
│   if (!url || !projectId) return res.status(400).json({...});    │
│                                                                  │
│   // Delegate to service                                         │
│   const audit = await auditService.createAudit(userId, {         │
│     url, projectId                                               │
│   });                                                            │
│                                                                  │
│   return res.status(201).json({ success: true, data: audit });   │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ auditService.createAudit(userId, { url, projectId })             │
│                                                                  │
│   // Ownership check                                             │
│   const project = await projectRepo.getById(projectId);          │
│   if (!project || project.userId !== userId) {                   │
│     throw new ForbiddenError('Not authorized');                  │
│   }                                                              │
│                                                                  │
│   // Check quota                                                 │
│   const user = await userRepo.getById(userId);                   │
│   if (user.auditCount >= user.plan.auditLimit) {                 │
│     throw new QuotaExceededError('Audit limit reached');         │
│   }                                                              │
│                                                                  │
│   // Create audit record                                         │
│   const audit = await auditRepo.create({                         │
│     url, projectId, userId, status: 'pending',                   │
│     createdAt: new Date()                                        │
│   });                                                            │
│                                                                  │
│   // Enqueue background crawl job                                │
│   await crawlQueue.add('crawl-page', {                           │
│     auditId: audit.id, url                                       │
│   });                                                            │
│                                                                  │
│   // Increment usage counter                                     │
│   await userRepo.incrementAuditCount(userId);                    │
│                                                                  │
│   return audit;                                                  │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ auditRepo.create(data)                                           │
│                                                                  │
│   const [audit] = await db('audits')                             │
│     .insert(data)                                                │
│     .returning('*');                                             │
│   return audit;                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 API Hook System (Frontend)

#### 3.2.1 Cơ chế hoạt động

Avada SEO sử dụng 4 custom hooks chính cho CRUD operations: `useFetchApi`, `useCreateApi`, `useEditApi`, `useDeleteApi`. Đây là abstraction layer giữa UI components và HTTP calls, mang lại:

- **Tự động quản lý loading state** — component chỉ cần `{loading}` để hiện spinner
- **Tự động hiển thị toast** — success/error messages được handle ở hook level
- **Consistent error handling** — mọi API error đều đi qua cùng 1 flow
- **Reusable** — mọi page đều dùng cùng pattern, giảm boilerplate

#### 3.2.2 Thiết kế hệ thống hooks cho project mới

Sử dụng **TanStack Query v5** làm nền tảng thay vì tự build (Avada dùng cách tự build vì lý do legacy). TanStack Query cung cấp sẵn caching, background refetching, optimistic updates.

```
┌─────────────────────────────────────────────────────────┐
│                    Hook Architecture                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Page Component (e.g. AuditPage)                  │    │
│  │                                                  │    │
│  │  const { data, isLoading } = useAudits(projectId)│    │
│  │  const { mutate: createAudit } = useCreateAudit()│    │
│  └────────────────────┬─────────────────────────────┘    │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────────┐    │
│  │ Feature Hook (e.g. useAudits, useCreateAudit)     │    │
│  │                                                   │    │
│  │  return useQuery({                                │    │
│  │    queryKey: ['audits', projectId],               │    │
│  │    queryFn: () => apiClient.get(`/audits?...`)    │    │
│  │  })                                               │    │
│  └────────────────────┬──────────────────────────────┘    │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────────┐    │
│  │ API Client (axios instance with interceptors)     │    │
│  │                                                   │    │
│  │  - Base URL config                                │    │
│  │  - Auth token injection (request interceptor)     │    │
│  │  - Error normalization (response interceptor)     │    │
│  │  - Token refresh on 401                           │    │
│  └───────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

#### 3.2.3 Ví dụ use case: Page SEO Audit

```typescript
// hooks/useAudits.ts — Feature hook
export function useAudits(projectId: string) {
  return useQuery({
    queryKey: ['audits', projectId],
    queryFn: () => apiClient.get(`/audits?projectId=${projectId}`),
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}

export function useCreateAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; projectId: string }) =>
      apiClient.post('/audits', data),
    onSuccess: (_, variables) => {
      // Tự động refetch danh sách audits
      queryClient.invalidateQueries({
        queryKey: ['audits', variables.projectId]
      });
      toast.success('Audit đã được tạo, đang crawl...');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Sử dụng trong component
function AuditPage({ projectId }) {
  const { data: audits, isLoading } = useAudits(projectId);
  const { mutate: createAudit, isPending } = useCreateAudit();

  return (
    <Page title="SEO Audits">
      <Button loading={isPending} onClick={() => createAudit({ url, projectId })}>
        New Audit
      </Button>
      {isLoading ? <Skeleton /> : <AuditList audits={audits} />}
    </Page>
  );
}
```

### 3.3 PubSub Pattern (Background Jobs)

#### 3.3.1 Tại sao cần Background Jobs

SEO analysis liên quan đến nhiều tác vụ **nặng và chậm**:

| Tác vụ | Thời gian trung bình | Lý do nặng |
|--------|----------------------|------------|
| Crawl 1 page (Playwright) | 3-10 giây | Cần render JS, chờ network idle |
| Crawl full site (100 pages) | 5-15 phút | Sequential/parallel crawl |
| Lighthouse audit | 15-30 giây | Full page load + metric collection |
| AI content analysis | 5-15 giây | LLM inference + streaming |
| Sitemap generation (1000 URLs) | 10-30 giây | Fetch + validate + XML build |

Không thể xử lý trong HTTP request cycle (timeout 30s). Cần **queue system** để:
- Tách biệt request handling và heavy processing
- Retry khi fail (network error, timeout)
- Giới hạn concurrency (không DDoS target website)
- Priority scheduling (paid users ưu tiên)

#### 3.3.2 Lựa chọn: BullMQ + Redis

| Tiêu chí | GCP Pub/Sub (Avada dùng) | BullMQ + Redis | RabbitMQ |
|-----------|-------------------------|----------------|----------|
| Setup | Cần GCP account | `docker run redis` | Cần Erlang runtime |
| Retry logic | Cần tự implement | Built-in (exponential backoff) | Built-in |
| Priority queues | Không native | Built-in | Built-in |
| Rate limiting | Không native | Built-in (`limiter`) | Plugin |
| Dashboard | Không có | Bull Board (UI) | RabbitMQ Management |
| Delayed jobs | Không native | Built-in | Plugin |
| Vendor lock-in | GCP only | Portable (any Redis) | Portable |
| Cost (dev) | Free tier | Free (self-hosted) | Free (self-hosted) |

**Kết luận**: BullMQ + Redis là lựa chọn tốt nhất cho project mới vì đơn giản, nhiều tính năng built-in, không vendor lock-in, và có dashboard monitoring.

#### 3.3.3 Thiết kế Queue System

```
┌────────────────────────────────────────────────────────────────┐
│                    QUEUE SYSTEM DESIGN                          │
│                                                                │
│  ┌──────────────┐                                              │
│  │ API Server   │                                              │
│  │ (Producer)   │                                              │
│  └──────┬───────┘                                              │
│         │ add job                                              │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                    REDIS                              │      │
│  │                                                      │      │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │      │
│  │  │ crawl-queue  │ │ analyze-queue│ │ ai-queue     │ │      │
│  │  │              │ │              │ │              │ │      │
│  │  │ priority: 1  │ │ priority: 1  │ │ priority: 1  │ │      │
│  │  │ concurrency: │ │ concurrency: │ │ concurrency: │ │      │
│  │  │ 5            │ │ 10           │ │ 3            │ │      │
│  │  │ rate: 10/min │ │ rate: 50/min │ │ rate: 20/min │ │      │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ │      │
│  └──────────────────────────────────────────────────────┘      │
│         │                │                │                    │
│         ▼                ▼                ▼                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ Crawl Worker │ │Analyze Worker│ │ AI Worker    │           │
│  │              │ │              │ │              │           │
│  │ - Playwright │ │ - Meta check │ │ - LangChain  │           │
│  │ - HTML parse │ │ - Schema val │ │ - SSE stream │           │
│  │ - Link extract│ │ - Score calc │ │ - Tool calls │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

#### 3.3.4 Xử lý Retry và Failure

```typescript
// queues/crawlQueue.ts
import { Queue, Worker } from 'bullmq';
import { connection } from '../config/redis';

export const crawlQueue = new Queue('crawl', {
  connection,
  defaultJobOptions: {
    attempts: 3,                      // Retry tối đa 3 lần
    backoff: {
      type: 'exponential',           // 1s → 2s → 4s
      delay: 1000,
    },
    removeOnComplete: { count: 1000 }, // Giữ 1000 jobs gần nhất
    removeOnFail: { count: 5000 },     // Giữ 5000 failed jobs để debug
  },
});

// workers/crawlWorker.ts
const worker = new Worker('crawl', async (job) => {
  const { auditId, url } = job.data;

  // Update progress
  await job.updateProgress(10);

  // Crawl page
  const html = await crawlPage(url);
  await job.updateProgress(50);

  // Parse và lưu kết quả
  const pageData = parseHTML(html);
  await pageRepo.create({ auditId, ...pageData });
  await job.updateProgress(80);

  // Enqueue analysis job (chain)
  await analyzeQueue.add('analyze-page', {
    auditId,
    pageId: pageData.id,
  });

  await job.updateProgress(100);
  return { pageId: pageData.id, status: 'crawled' };

}, {
  connection,
  concurrency: 5,           // Tối đa 5 crawls đồng thời
  limiter: {
    max: 10,                 // Tối đa 10 jobs
    duration: 60_000,        // mỗi phút (tránh rate limit target site)
  },
});

// Error handling
worker.on('failed', (job, error) => {
  logger.error(`Crawl job ${job.id} failed: ${error.message}`, {
    url: job.data.url,
    attempt: job.attemptsMade,
  });

  // Nếu đã hết retry → update audit status
  if (job.attemptsMade >= job.opts.attempts) {
    auditRepo.update(job.data.auditId, { status: 'failed' });
  }
});
```

### 3.4 AI Agent Skeleton (LangChain + LangGraph)

#### 3.4.1 Tại sao chọn LangChain + LangGraph

Avada SEO sử dụng LangGraph StateGraph cho AI Audit Agent — đây là kiến trúc tiên tiến nhất hiện tại cho AI agents:

| Tiêu chí | Prompt đơn giản | LangChain Chain | LangGraph Agent |
|-----------|-----------------|-----------------|-----------------|
| Multi-turn conversation | Không | Có (memory) | Có (persistent state) |
| Tool calling | Không | Có | Có (conditional routing) |
| State management | Không | Trong memory | MongoDB/Redis checkpoint |
| Branching logic | Không | Limited | Full graph control |
| Streaming | Có | Có | Có (per-node) |
| Resumability | Không | Không | Có (checkpoint restore) |

#### 3.4.2 Thiết kế AI Agent cho SEO Tool

```
┌──────────────────────────────────────────────────────────────────┐
│                    SEO AI AGENT (LangGraph)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ State Schema (Zod)                                        │    │
│  │                                                          │    │
│  │  messages: Message[]      // Conversation history         │    │
│  │  pageData: PageData       // Crawled page content         │    │
│  │  auditResult: AuditResult // SEO score + issues           │    │
│  │  recommendations: Rec[]   // Generated recommendations    │    │
│  │  actions: Action[]        // Pending user actions         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Graph Flow                                                │    │
│  │                                                          │    │
│  │  START                                                    │    │
│  │    │                                                      │    │
│  │    ▼                                                      │    │
│  │  [prepareContext] ── load pageData + auditResult          │    │
│  │    │                                                      │    │
│  │    ▼                                                      │    │
│  │  [llmCall] ── GPT-4 / Claude with tools bound            │    │
│  │    │                                                      │    │
│  │    ├── hasToolCalls? ──► [toolNode] ── execute tool       │    │
│  │    │                         │                            │    │
│  │    │                         ├── analyzeMetaTags          │    │
│  │    │                         ├── analyzeHeadings          │    │
│  │    │                         ├── analyzeImages            │    │
│  │    │                         ├── checkStructuredData      │    │
│  │    │                         ├── searchKeywords (Tavily)  │    │
│  │    │                         ├── generateMetaTitle        │    │
│  │    │                         └── generateMetaDescription  │    │
│  │    │                         │                            │    │
│  │    │                    ◄────┘ (loop back to llmCall)      │    │
│  │    │                                                      │    │
│  │    └── noToolCalls? ──► [END] ── stream final response    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Checkpoint: MongoDB (thread_id = audit_id)                │    │
│  │ Streaming: SSE (text/event-stream)                        │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.4.3 SSE Streaming Implementation

SSE (Server-Sent Events) cho phép stream AI response từng token về frontend — user experience tương tự ChatGPT.

```typescript
// controllers/aiAgentController.ts
export async function streamAnalyze(req: Request, res: Response) {
  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const { auditId, message } = req.body;
  const userId = req.user.id;

  try {
    // Load context
    const audit = await auditRepo.getById(auditId);
    const pageData = await pageRepo.getByAuditId(auditId);

    // Stream from LangGraph
    const stream = await seoAgent.stream(
      { messages: [{ role: 'user', content: message }], pageData },
      { configurable: { thread_id: auditId } }
    );

    for await (const event of stream) {
      if (event.type === 'token') {
        res.write(`event: delta\ndata: ${JSON.stringify({
          content: event.content
        })}\n\n`);
      }

      if (event.type === 'tool_start') {
        res.write(`event: tool_calling\ndata: ${JSON.stringify({
          tool: event.name
        })}\n\n`);
      }

      if (event.type === 'tool_end') {
        res.write(`event: tool_result\ndata: ${JSON.stringify({
          tool: event.name,
          result: event.output
        })}\n\n`);
      }
    }

    res.write('event: done\ndata: {}\n\n');
    res.end();

  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({
      message: error.message
    })}\n\n`);
    res.end();
  }
}
```

#### 3.4.4 Use case: SEO Recommendation Flow

```
User: "Phân tích SEO cho trang sản phẩm này"

Agent nhận context:
  - Page URL: https://example.com/product/shoes-nike-air-max
  - Current meta title: "Shoes" (quá ngắn, thiếu keyword)
  - H1: Không có (missing)
  - Images: 5 images, 3 thiếu alt text
  - Schema: Không có ProductSchema

Agent suy nghĩ (tool calls):
  1. analyzeMetaTags() → "Title quá ngắn (5 chars), cần 50-60 chars"
  2. analyzeHeadings() → "Missing H1, chỉ có H3"
  3. checkStructuredData() → "Không có Product schema"
  4. searchKeywords("nike air max") → ["nike air max 90", "nike air max review"]

Agent response (streamed):
  "Trang sản phẩm này có 4 vấn đề SEO cần khắc phục:

   1. **Meta Title quá ngắn** (5/60 ký tự)
      Đề xuất: 'Nike Air Max 90 - Giày Thể Thao Chính Hãng | YourShop'

   2. **Thiếu thẻ H1**
      Đề xuất thêm: <h1>Nike Air Max 90 - Giày Thể Thao Nam/Nữ</h1>

   3. **3/5 hình ảnh thiếu alt text**
      Đề xuất thêm alt text mô tả sản phẩm cho mỗi ảnh

   4. **Thiếu Product Schema (JSON-LD)**
      Đề xuất thêm ProductSchema với price, availability, brand..."
```

---

## 4. Phase 2 — Thay thế Platform Layer (2-4 tuần)

Giai đoạn này thay thế toàn bộ Shopify-specific components bằng **platform-agnostic alternatives**.

### 4.1 Web Crawler: Thay Shopify API bằng Playwright

#### 4.1.1 Tại sao Playwright thay vì Puppeteer

| Tiêu chí | Puppeteer | Playwright | Cheerio (HTTP only) |
|-----------|-----------|------------|---------------------|
| JS rendering | Chromium only | Chromium + Firefox + WebKit | Không |
| Headless mode | Có | Có | N/A |
| Auto-wait | Cần tự config | Built-in smart wait | N/A |
| Parallel browsers | Cần tự manage | Built-in browser contexts | N/A |
| Mobile emulation | Có | Có (device descriptors) | Không |
| Network interception | Có | Có (route API) | Không |
| Maintainer | Google | Microsoft | Community |
| Bundle size | ~170MB | ~120MB per browser | ~1MB |
| SPA support | Có | Có | Không |

**Kết luận**: Playwright vì hỗ trợ multi-browser (quan trọng cho cross-browser SEO testing), smart wait (ít flaky tests), và browser contexts (hiệu quả hơn cho parallel crawling).

**Cheerio** dùng cho **static HTML sites** (nhanh hơn 10-50x vì không cần browser) — fallback khi detect site không cần JS rendering.

#### 4.1.2 Crawl Strategy

```
┌───────────────────────────────────────────────────────────────┐
│                    CRAWL STRATEGY                              │
│                                                               │
│  Input: URL (e.g., https://example.com)                       │
│                                                               │
│  Step 1: Quick Check (HTTP HEAD)                              │
│    ├── Status code, redirect chain                            │
│    ├── Content-Type (HTML vs PDF vs other)                    │
│    └── Response headers (cache, security)                     │
│                                                               │
│  Step 2: Fetch HTML                                           │
│    ├── Try Cheerio first (HTTP GET + parse)                   │
│    ├── Check if page needs JS rendering:                      │
│    │   - <noscript> tags present?                             │
│    │   - Bundle.js references but empty <body>?               │
│    │   - Meta tag: <meta name="fragment" content="!">         │
│    └── If JS needed → fallback to Playwright                  │
│                                                               │
│  Step 3: Extract Data                                         │
│    ├── Meta tags: title, description, robots, canonical       │
│    ├── Headings: H1-H6 hierarchy                              │
│    ├── Images: src, alt, dimensions, lazy-load                │
│    ├── Links: internal, external, broken                      │
│    ├── Structured data: JSON-LD, Microdata                    │
│    ├── Open Graph + Twitter Card tags                         │
│    ├── Hreflang tags                                          │
│    ├── Page speed hints: resource sizes, render-blocking      │
│    └── Content: word count, keyword density                   │
│                                                               │
│  Step 4: Store & Continue                                     │
│    ├── Save page data to PostgreSQL                           │
│    ├── Extract internal links                                 │
│    ├── Enqueue un-crawled links (BFS/DFS with depth limit)    │
│    └── Respect robots.txt + crawl-delay                       │
└───────────────────────────────────────────────────────────────┘
```

#### 4.1.3 Handling Dynamic Content (SPA/CSR)

Nhiều website hiện đại sử dụng React, Vue, Angular — content render bằng JavaScript. Crawler cần:

```typescript
// services/crawler/playwrightCrawler.ts
async function crawlWithPlaywright(url: string): Promise<PageData> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'SEOToolBot/1.0 (+https://yourtool.com/bot)',
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Block unnecessary resources để tăng tốc
  await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route =>
    route.abort()
  );

  // Navigate và chờ network idle
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });

  // Chờ thêm cho lazy-loaded content
  await page.waitForTimeout(2000);

  // Extract all SEO-relevant data
  const data = await page.evaluate(() => {
    return {
      title: document.title,
      metaDescription: document.querySelector(
        'meta[name="description"]'
      )?.getAttribute('content'),
      canonical: document.querySelector(
        'link[rel="canonical"]'
      )?.getAttribute('href'),
      h1: Array.from(document.querySelectorAll('h1'))
        .map(el => el.textContent?.trim()),
      h2: Array.from(document.querySelectorAll('h2'))
        .map(el => el.textContent?.trim()),
      images: Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })),
      jsonLd: Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      ).map(s => s.textContent),
      html: document.documentElement.outerHTML,
      wordCount: document.body?.innerText?.split(/\s+/).length || 0,
    };
  });

  await browser.close();
  return data;
}
```

### 4.2 UI Framework: Shadcn/UI + Tailwind CSS

#### 4.2.1 So sánh Shadcn/UI vs Ant Design

| Tiêu chí | Polaris (Avada dùng) | Shadcn/UI | Ant Design |
|-----------|---------------------|-----------|------------|
| **Bundle size** | ~150KB | ~0KB (copy-paste) | ~350KB |
| **Customization** | Limited (Shopify brand) | Full control | Theme tokens |
| **Lock-in** | Shopify ecosystem | Không (own your code) | Ant ecosystem |
| **Styling** | CSS Modules | Tailwind CSS | CSS-in-JS / Less |
| **TypeScript** | Partial | Native | Native |
| **Community** | Shopify devs | 50K+ GitHub stars | 90K+ GitHub stars |
| **Learning curve** | Trung bình | Thấp | Trung bình |
| **Dark mode** | Có | Có (class-based) | Có |
| **Accessibility** | Cao (Radix) | Cao (Radix) | Trung bình |
| **Server Components** | Không | Có | Partial |

**Lựa chọn: Shadcn/UI + Tailwind CSS** vì:

1. **Không vendor lock-in** — bạn own toàn bộ component code, không phụ thuộc vào library updates
2. **Bundle size tối ưu** — chỉ include components bạn dùng (tree-shaking hoàn hảo vì code nằm trong project)
3. **Tailwind CSS** — utility-first approach, consistent styling, dễ responsive
4. **Radix Primitives** — accessibility built-in, headless components
5. **Next.js compatible** — hỗ trợ Server Components, streaming SSR

### 4.3 Database Layer: PostgreSQL

#### 4.3.1 So sánh PostgreSQL vs MongoDB

| Tiêu chí | Firestore (Avada dùng) | PostgreSQL | MongoDB |
|-----------|----------------------|------------|---------|
| **Data model** | Document (NoSQL) | Relational (SQL) | Document (NoSQL) |
| **Schema** | Schemaless | Strict schema + migrations | Flexible schema |
| **Joins** | Không native | Native (performant) | $lookup (chậm) |
| **Transactions** | Limited | Full ACID | Multi-doc ACID |
| **Full-text search** | Không | Built-in (tsvector) | Atlas Search |
| **JSON support** | Native | JSONB (indexed, queryable) | Native |
| **Aggregation** | Không | Window functions, CTE | Aggregation pipeline |
| **Vendor lock-in** | Google Cloud only | Không | MongoDB Inc. |
| **Cost tại scale** | Đắt (per-read pricing) | Predictable (per-instance) | Predictable |
| **ORM ecosystem** | firebase-admin | Prisma, Drizzle, Knex | Mongoose, Prisma |

**Lựa chọn: PostgreSQL + Prisma ORM** vì:

1. **SEO data có nhiều relationships** — pages thuộc audits, audits thuộc projects, projects thuộc users. SQL joins hiệu quả hơn NoSQL denormalization.
2. **Aggregation queries phức tạp** — "Trung bình SEO score theo project", "Top 10 issues phổ biến" → SQL window functions mạnh hơn.
3. **Full-text search built-in** — tìm kiếm trong nội dung page đã crawl mà không cần Elasticsearch.
4. **JSONB cho flexible data** — structured data (JSON-LD) lưu dưới JSONB, vừa flexible vừa queryable.
5. **Prisma ORM** — type-safe queries, auto-generated types, migration system.

#### 4.3.2 Thiết kế Schema cơ bản

```sql
-- Users & Authentication
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    name          VARCHAR(255),
    password_hash VARCHAR(255),           -- null nếu OAuth login
    avatar_url    TEXT,
    plan          VARCHAR(50) DEFAULT 'free',
    ai_credits    INTEGER DEFAULT 100,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (mỗi website = 1 project)
CREATE TABLE projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    domain        VARCHAR(255) NOT NULL,    -- example.com
    settings      JSONB DEFAULT '{}',       -- crawl settings, notification prefs
    last_crawl_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, domain)
);

-- Audits (mỗi lần scan = 1 audit)
CREATE TABLE audits (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status        VARCHAR(20) DEFAULT 'pending',  -- pending, crawling, analyzing, completed, failed
    total_pages   INTEGER DEFAULT 0,
    crawled_pages INTEGER DEFAULT 0,
    seo_score     DECIMAL(5,2),                    -- 0.00 - 100.00
    summary       JSONB,                           -- { critical: 5, warning: 12, info: 3 }
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Pages (mỗi URL crawled)
CREATE TABLE pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    status_code     INTEGER,
    redirect_url    TEXT,                         -- null nếu không redirect
    title           TEXT,
    meta_description TEXT,
    canonical_url   TEXT,
    html_content    TEXT,                         -- raw HTML (compressed)
    word_count      INTEGER,
    load_time_ms    INTEGER,                      -- page load time

    -- SEO metrics
    seo_score       DECIMAL(5,2),
    headings        JSONB,     -- { h1: ["..."], h2: ["..."], ... }
    images          JSONB,     -- [{ src, alt, width, height }]
    links           JSONB,     -- { internal: [...], external: [...] }
    structured_data JSONB,     -- parsed JSON-LD objects
    og_tags         JSONB,     -- { title, description, image }
    meta_robots     VARCHAR(100),

    crawled_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(audit_id, url)
);

CREATE INDEX idx_pages_audit_id ON pages(audit_id);
CREATE INDEX idx_pages_seo_score ON pages(seo_score);

-- SEO Issues (detected problems)
CREATE TABLE issues (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id       UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    audit_id      UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    category      VARCHAR(50) NOT NULL,   -- meta, heading, image, schema, speed, link
    severity      VARCHAR(20) NOT NULL,   -- critical, warning, info
    rule_code     VARCHAR(100) NOT NULL,  -- e.g., 'META_TITLE_TOO_SHORT'
    message       TEXT NOT NULL,           -- Human-readable description
    details       JSONB,                  -- { current: "Shoes", recommended: "Nike Air Max..." }
    is_fixed      BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issues_audit_id ON issues(audit_id);
CREATE INDEX idx_issues_severity ON issues(severity);
CREATE INDEX idx_issues_category ON issues(category);

-- AI Chat Threads (conversation history)
CREATE TABLE ai_threads (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id      UUID REFERENCES audits(id),
    page_id       UUID REFERENCES pages(id),
    user_id       UUID NOT NULL REFERENCES users(id),
    messages      JSONB DEFAULT '[]',     -- LangGraph message history
    metadata      JSONB DEFAULT '{}',     -- agent state snapshot
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sitemaps (generated XML sitemaps)
CREATE TABLE sitemaps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename      VARCHAR(255) NOT NULL,  -- sitemap.xml, sitemap-1.xml
    url_count     INTEGER DEFAULT 0,
    content       TEXT,                   -- XML content
    last_generated TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Credit History (AI usage tracking)
CREATE TABLE credit_history (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id),
    action        VARCHAR(100) NOT NULL,  -- 'ai_meta_generation', 'ai_audit', 'ai_chat'
    credits_used  INTEGER NOT NULL,
    metadata      JSONB,                  -- { auditId, pageUrl, ... }
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_history_user ON credit_history(user_id, created_at DESC);
```

### 4.4 Authentication: NextAuth.js (Auth.js v5)

#### 4.4.1 Lý do lựa chọn

Avada SEO dùng 2 hệ thống auth song song: Shopify OAuth (embedded) + Firebase Auth (standalone). Cho web SEO tool tổng quát, cần hệ thống auth đơn giản hơn nhưng linh hoạt.

| Tiêu chí | Firebase Auth (Avada dùng) | NextAuth.js v5 | Auth0 | Clerk |
|-----------|--------------------------|----------------|-------|-------|
| **Cost** | Free (50K MAU) | Free (self-hosted) | Free (7K MAU) | Free (10K MAU) |
| **Vendor lock-in** | Google | Không | Auth0 | Clerk |
| **OAuth providers** | Google, GitHub, etc. | 80+ providers | 30+ | 20+ |
| **Session management** | JWT (client-side) | JWT hoặc Database sessions | JWT | JWT |
| **Next.js integration** | Cần adapter | Native | Adapter | Native |
| **Customization** | Limited | Full control | Limited | Limited |
| **Self-hosted** | Không | Có | Không | Không |

**Lựa chọn: NextAuth.js v5 (Auth.js)** vì: free, không vendor lock-in, native Next.js integration, hỗ trợ 80+ OAuth providers, có thể self-host.

#### 4.4.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Option 1: Email/Password                                  │   │
│  │                                                          │   │
│  │  User nhập email + password                               │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  NextAuth CredentialsProvider                             │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  Verify password (bcrypt) against PostgreSQL              │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  Create JWT session → Set HttpOnly cookie                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Option 2: Google OAuth                                    │   │
│  │                                                          │   │
│  │  User click "Sign in with Google"                         │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  Redirect to Google consent screen                        │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  Google callback → NextAuth GoogleProvider                │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  Create/update user in PostgreSQL                         │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  Create JWT session → Set HttpOnly cookie                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ API Request Authentication                                │   │
│  │                                                          │   │
│  │  Every API request:                                       │   │
│  │    1. Read JWT from HttpOnly cookie                       │   │
│  │    2. Verify JWT signature                                │   │
│  │    3. Extract user.id from payload                        │   │
│  │    4. Attach to req.user                                  │   │
│  │    5. Proceed to route handler                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Backend Runtime: Fastify + Node.js trên VPS

#### 4.5.1 So sánh Express vs Fastify

| Tiêu chí | Koa (Avada dùng) | Express | Fastify |
|-----------|-----------------|---------|---------|
| **Performance** | Trung bình | Thấp nhất | Cao nhất (~2x Express) |
| **JSON serialization** | Koa-bodyparser | body-parser | fast-json-stringify (auto) |
| **Schema validation** | Không built-in | Không built-in | Ajv built-in |
| **TypeScript** | Cần config | Cần config | Native support |
| **Plugin system** | Middleware chain | Middleware chain | Encapsulated plugins |
| **Logging** | Cần thêm lib | Morgan | Pino (zero-overhead) |
| **HTTP/2** | Cần thêm | Cần thêm | Built-in |
| **OpenAPI/Swagger** | Cần thêm | swagger-jsdoc | @fastify/swagger (auto) |

**Lựa chọn: Fastify** vì performance cao hơn Express ~2x, schema validation built-in (giảm boilerplate), tự generate OpenAPI docs, Pino logger zero-overhead.

#### 4.5.2 Serverless vs VPS

| Tiêu chí | Firebase Functions (Avada dùng) | Serverless (AWS Lambda) | VPS (DigitalOcean/Hetzner) |
|-----------|-------------------------------|------------------------|---------------------------|
| **Cold start** | 2-8 giây | 0.5-3 giây | Không có |
| **Max execution** | 9 phút (v1) / 60 phút (v2) | 15 phút | Unlimited |
| **Memory** | Tối đa 8GB | Tối đa 10GB | Tùy instance |
| **Cost (low traffic)** | Rẻ (pay-per-invocation) | Rẻ | ~$5-20/tháng |
| **Cost (high traffic)** | Đắt | Đắt | Rẻ hơn |
| **Playwright/Puppeteer** | Khó (binary size limit) | Khó (layer limit) | Dễ (install thoải mái) |
| **Long-running jobs** | Cần PubSub | Cần SQS + Lambda | Native (BullMQ workers) |
| **WebSocket/SSE** | Không support | API Gateway timeout | Native support |
| **Scaling** | Auto | Auto | Manual / K8s |

**Lựa chọn: VPS** (DigitalOcean Droplet hoặc Hetzner) vì:

1. **Playwright cần full browser binary** — không fit trong serverless function size limits
2. **SSE streaming** cần persistent connection — serverless có timeout
3. **BullMQ workers** cần long-running process — serverless không phù hợp
4. **Cost predictable** — $20/tháng cho 4GB RAM, 2 vCPU, đủ cho MVP với vài trăm users
5. **Flexibility** — cài đặt bất kỳ software nào (Redis, Playwright, ffmpeg, etc.)

**Architecture triển khai:**

```
┌─────────────────────────────────────────────────────┐
│              VPS (4GB RAM, 2 vCPU)                   │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Fastify API │  │ BullMQ       │  │ Cron       │  │
│  │ (port 3000) │  │ Workers (x3) │  │ Scheduler  │  │
│  └──────┬──────┘  └──────────────┘  └───────────┘  │
│         │                                           │
│  ┌──────┼──────────────────────────────────────┐    │
│  │      ▼                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │PostgreSQL│  │  Redis   │  │ Minio    │  │    │
│  │  │(port 5432│  │(port 6379│  │(port 9000│  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  │    │
│  │           Docker Compose                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Nginx (reverse proxy + SSL + static files)  │    │
│  │ port 80/443 → localhost:3000                │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Next.js Frontend (port 3001) — SSR + Static │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 5. Phase 3 — Rebuild SEO Features (4-8 tuần)

### 5.1 On-page SEO Analyzer

#### 5.1.1 Mô tả chức năng

Module lõi của hệ thống — crawl một trang web và đánh giá toàn diện các yếu tố SEO on-page, cho ra SEO Score (0-100) cùng danh sách issues cụ thể.

#### 5.1.2 Các quy tắc SEO kiểm tra

| # | Quy tắc | Severity | Điều kiện fail |
|---|---------|----------|----------------|
| 1 | **META_TITLE_MISSING** | Critical | Không có `<title>` tag |
| 2 | **META_TITLE_TOO_SHORT** | Warning | Title < 30 ký tự |
| 3 | **META_TITLE_TOO_LONG** | Warning | Title > 60 ký tự |
| 4 | **META_TITLE_DUPLICATE** | Critical | Nhiều pages cùng title trong 1 audit |
| 5 | **META_DESC_MISSING** | Critical | Không có `<meta name="description">` |
| 6 | **META_DESC_TOO_SHORT** | Warning | Description < 70 ký tự |
| 7 | **META_DESC_TOO_LONG** | Warning | Description > 160 ký tự |
| 8 | **H1_MISSING** | Critical | Không có `<h1>` tag |
| 9 | **H1_MULTIPLE** | Warning | Nhiều hơn 1 `<h1>` tag |
| 10 | **H1_TOO_LONG** | Info | H1 > 70 ký tự |
| 11 | **HEADING_HIERARCHY_BROKEN** | Warning | H3 xuất hiện trước H2, etc. |
| 12 | **IMG_ALT_MISSING** | Warning | `<img>` không có `alt` attribute |
| 13 | **IMG_ALT_EMPTY** | Warning | `alt=""` (empty string) |
| 14 | **IMG_TOO_LARGE** | Warning | Image > 200KB (không optimize) |
| 15 | **CANONICAL_MISSING** | Warning | Không có `<link rel="canonical">` |
| 16 | **CANONICAL_MISMATCH** | Critical | Canonical URL khác current URL |
| 17 | **ROBOTS_NOINDEX** | Info | `<meta name="robots" content="noindex">` |
| 18 | **INTERNAL_LINK_BROKEN** | Critical | Internal link trả về 404 |
| 19 | **EXTERNAL_LINK_BROKEN** | Warning | External link trả về 404/5xx |
| 20 | **NO_HTTPS** | Critical | Page không dùng HTTPS |
| 21 | **WORD_COUNT_LOW** | Warning | Content < 300 từ |
| 22 | **SCHEMA_MISSING** | Info | Không có JSON-LD structured data |
| 23 | **OG_TAGS_MISSING** | Warning | Không có Open Graph tags |
| 24 | **VIEWPORT_MISSING** | Critical | Không có `<meta name="viewport">` |

#### 5.1.3 SEO Scoring Algorithm

```
SEO Score = Σ (category_weight × category_score)

Categories & Weights:
  - Meta Tags (title, description, canonical): 25%
  - Content (headings, word count, keywords):  25%
  - Images (alt text, size optimization):      15%
  - Links (internal, external, broken):        15%
  - Technical (HTTPS, viewport, robots):       10%
  - Structured Data (JSON-LD, OG tags):        10%

Category Score Calculation:
  score = 100 - Σ(penalty_per_issue)

  Penalties:
    - Critical issue: -25 points
    - Warning issue:  -10 points
    - Info issue:     -3 points

  Minimum score per category: 0
  Maximum score per category: 100
```

#### 5.1.4 Pseudo-code: Analyze Engine

```typescript
// services/analyzer/seoAnalyzer.ts
export async function analyzePage(pageData: PageData): Promise<AnalysisResult> {
  const issues: Issue[] = [];

  // --- META TAGS ---
  if (!pageData.title) {
    issues.push({ code: 'META_TITLE_MISSING', severity: 'critical',
      category: 'meta', message: 'Page is missing a title tag' });
  } else {
    if (pageData.title.length < 30) {
      issues.push({ code: 'META_TITLE_TOO_SHORT', severity: 'warning',
        category: 'meta',
        message: `Title is ${pageData.title.length} chars (recommended: 30-60)`,
        details: { current: pageData.title.length, min: 30, max: 60 }
      });
    }
    if (pageData.title.length > 60) {
      issues.push({ code: 'META_TITLE_TOO_LONG', severity: 'warning',
        category: 'meta',
        message: `Title is ${pageData.title.length} chars (recommended: 30-60)`,
        details: { current: pageData.title.length, min: 30, max: 60 }
      });
    }
  }

  // --- HEADINGS ---
  if (pageData.h1.length === 0) {
    issues.push({ code: 'H1_MISSING', severity: 'critical',
      category: 'content', message: 'Page is missing an H1 heading' });
  }
  if (pageData.h1.length > 1) {
    issues.push({ code: 'H1_MULTIPLE', severity: 'warning',
      category: 'content',
      message: `Page has ${pageData.h1.length} H1 headings (recommended: 1)` });
  }

  // --- IMAGES ---
  const imagesWithoutAlt = pageData.images.filter(img => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push({ code: 'IMG_ALT_MISSING', severity: 'warning',
      category: 'image',
      message: `${imagesWithoutAlt.length}/${pageData.images.length} images missing alt text`,
      details: { images: imagesWithoutAlt.map(i => i.src) }
    });
  }

  // --- STRUCTURED DATA ---
  if (pageData.jsonLd.length === 0) {
    issues.push({ code: 'SCHEMA_MISSING', severity: 'info',
      category: 'schema', message: 'No JSON-LD structured data found' });
  }

  // Calculate scores
  const score = calculateScore(issues);

  return { issues, score, summary: summarizeIssues(issues) };
}
```

### 5.2 Structured Data Validator

#### 5.2.1 Chức năng

Kiểm tra và validate JSON-LD structured data trên page, đánh giá khả năng đạt Google Rich Results.

#### 5.2.2 Schema Types hỗ trợ

| Schema Type | Rich Result | Validation Rules |
|-------------|-------------|-----------------|
| **Product** | Product snippets (price, rating, availability) | Bắt buộc: name, image, offers. Khuyến nghị: brand, sku, review |
| **Article** | Article snippets (author, date) | Bắt buộc: headline, image, author, datePublished |
| **BreadcrumbList** | Breadcrumb trail | Bắt buộc: itemListElement[].name, item |
| **FAQPage** | FAQ accordion | Bắt buộc: mainEntity[].name, acceptedAnswer |
| **LocalBusiness** | Business panel | Bắt buộc: name, address, telephone |
| **Organization** | Knowledge panel | Bắt buộc: name, url, logo |
| **WebSite** | Sitelinks searchbox | Bắt buộc: name, url, potentialAction |
| **Review** | Review stars | Bắt buộc: itemReviewed, reviewRating, author |
| **HowTo** | How-to steps | Bắt buộc: name, step[].text |
| **Event** | Event listing | Bắt buộc: name, startDate, location |

#### 5.2.3 Validation Flow

```
Input: JSON-LD string từ page crawl
    │
    ▼
Step 1: Parse JSON
    ├── Valid JSON? → tiếp tục
    └── Invalid JSON? → Error: SCHEMA_INVALID_JSON
    │
    ▼
Step 2: Validate @context
    ├── "https://schema.org" ? → tiếp tục
    └── Thiếu hoặc sai? → Error: SCHEMA_INVALID_CONTEXT
    │
    ▼
Step 3: Detect @type
    ├── Supported type? → tiếp tục
    └── Unknown type? → Warning: SCHEMA_UNKNOWN_TYPE
    │
    ▼
Step 4: Validate required fields (theo type)
    ├── Product: name, image, offers required
    ├── Article: headline, image, author required
    └── ... (theo bảng trên)
    │
    ▼
Step 5: Validate field formats
    ├── URL fields: valid URL format?
    ├── Date fields: ISO 8601 format?
    ├── Price: valid number + currency?
    └── Image: accessible URL?
    │
    ▼
Step 6: Rich Results eligibility check
    ├── Đủ required fields → "Eligible for Rich Results"
    ├── Thiếu recommended fields → "Partial eligibility"
    └── Thiếu required fields → "Not eligible"
    │
    ▼
Output: ValidationResult {
    isValid: boolean,
    schemaType: string,
    richResultEligible: boolean,
    errors: SchemaError[],
    warnings: SchemaWarning[],
    suggestions: string[]
}
```

### 5.3 Sitemap Generator

#### 5.3.1 Chức năng

Tự động tạo XML sitemap từ dữ liệu crawl, cho phép customize và submit lên Google Search Console.

#### 5.3.2 Sitemap Types

| Type | File | Mô tả |
|------|------|--------|
| **URL Sitemap** | `sitemap.xml` | Danh sách tất cả URLs của site |
| **Image Sitemap** | `sitemap-images.xml` | URLs kèm image metadata |
| **Sitemap Index** | `sitemap-index.xml` | Khi > 50,000 URLs, chia thành nhiều files |

#### 5.3.3 Generation Flow

```typescript
// services/sitemap/sitemapGenerator.ts
export async function generateSitemap(projectId: string): Promise<string> {
  // Fetch all crawled pages
  const pages = await pageRepo.getByProjectId(projectId, {
    status: 200,          // Chỉ lấy pages trả về 200
    noindex: false,       // Bỏ qua noindex pages
    orderBy: 'updatedAt', // Mới nhất trước
  });

  // Validate: sitemap tối đa 50,000 URLs và 50MB
  if (pages.length > 50_000) {
    return generateSitemapIndex(projectId, pages);
  }

  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of pages) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(page.url)}</loc>\n`;
    xml += `    <lastmod>${page.crawledAt.toISOString()}</lastmod>\n`;
    xml += `    <changefreq>${detectChangeFreq(page)}</changefreq>\n`;
    xml += `    <priority>${calculatePriority(page)}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  // Save to storage
  await sitemapRepo.upsert(projectId, {
    filename: 'sitemap.xml',
    content: xml,
    urlCount: pages.length,
    lastGenerated: new Date(),
  });

  return xml;
}

function calculatePriority(page: Page): string {
  // Homepage = 1.0, main sections = 0.8, content = 0.6, other = 0.4
  const depth = new URL(page.url).pathname.split('/').filter(Boolean).length;
  if (depth === 0) return '1.0';
  if (depth === 1) return '0.8';
  if (depth === 2) return '0.6';
  return '0.4';
}
```

### 5.4 Site Speed Analyzer

#### 5.4.1 Tích hợp Google Lighthouse API

Google cung cấp **PageSpeed Insights API** (miễn phí, 25,000 queries/ngày) chạy Lighthouse phía server — không cần chạy Lighthouse locally.

#### 5.4.2 Metrics thu thập

| Metric | Mô tả | Tốt | Cần cải thiện | Kém |
|--------|--------|-----|---------------|-----|
| **LCP** (Largest Contentful Paint) | Thời gian render element lớn nhất | ≤2.5s | 2.5-4s | >4s |
| **FID** (First Input Delay) | Thời gian phản hồi tương tác đầu tiên | ≤100ms | 100-300ms | >300ms |
| **CLS** (Cumulative Layout Shift) | Mức độ layout dịch chuyển | ≤0.1 | 0.1-0.25 | >0.25 |
| **FCP** (First Contentful Paint) | Thời gian render content đầu tiên | ≤1.8s | 1.8-3s | >3s |
| **TTFB** (Time to First Byte) | Thời gian server phản hồi | ≤200ms | 200-500ms | >500ms |
| **TBT** (Total Blocking Time) | Tổng thời gian main thread bị block | ≤200ms | 200-600ms | >600ms |
| **Speed Index** | Tốc độ hiển thị visual content | ≤3.4s | 3.4-5.8s | >5.8s |
| **Performance Score** | Điểm tổng hợp của Lighthouse | 90-100 | 50-89 | 0-49 |

#### 5.4.3 Integration Flow

```typescript
// services/speed/speedAnalyzer.ts
const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export async function analyzeSpeed(url: string): Promise<SpeedResult> {
  // Chạy cả mobile và desktop
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeed(url, 'mobile'),
    fetchPageSpeed(url, 'desktop'),
  ]);

  return {
    mobile: {
      score: mobile.lighthouseResult.categories.performance.score * 100,
      lcp: mobile.lighthouseResult.audits['largest-contentful-paint'].numericValue,
      fid: mobile.lighthouseResult.audits['max-potential-fid'].numericValue,
      cls: mobile.lighthouseResult.audits['cumulative-layout-shift'].numericValue,
      fcp: mobile.lighthouseResult.audits['first-contentful-paint'].numericValue,
      ttfb: mobile.lighthouseResult.audits['server-response-time'].numericValue,
      tbt: mobile.lighthouseResult.audits['total-blocking-time'].numericValue,
      opportunities: extractOpportunities(mobile),
    },
    desktop: {
      score: desktop.lighthouseResult.categories.performance.score * 100,
      // ... same metrics
    },
  };
}

async function fetchPageSpeed(url: string, strategy: string) {
  const params = new URLSearchParams({
    url,
    strategy,
    key: process.env.GOOGLE_API_KEY,
    category: 'performance',
  });

  const response = await fetch(`${PAGESPEED_API}?${params}`);
  return response.json();
}
```

### 5.5 AI SEO Recommendations

#### 5.5.1 Kiến trúc AI Agent

Sử dụng LangGraph StateGraph (như phân tích ở Phase 1, mục 3.4), tích hợp các tools chuyên biệt cho SEO analysis.

#### 5.5.2 Tools của AI Agent

| Tool | Input | Output | Use case |
|------|-------|--------|----------|
| `analyzeMetaTags` | Page meta data | Issues + suggestions | "Title quá ngắn, đề xuất: ..." |
| `analyzeContent` | Page text content | Keyword density, readability | "Content có 150 từ, cần thêm 150 từ" |
| `generateMetaTitle` | Page content + keywords | Optimized title (50-60 chars) | AI-generated meta title |
| `generateMetaDescription` | Page content + keywords | Optimized description (150-160 chars) | AI-generated meta description |
| `searchKeywords` | Seed keyword | Related keywords + search volume | Keyword research từ Tavily/DataForSEO |
| `checkCompetitors` | URL + keyword | Top 10 SERP analysis | So sánh với đối thủ |
| `generateFAQs` | Page content | 5-10 FAQ items (question/answer) | Auto-generate FAQ schema |
| `suggestInternalLinks` | Page content + site pages | Relevant internal link suggestions | Cải thiện internal linking |

#### 5.5.3 Prompt Engineering cho SEO Agent

```
System Prompt:
"Bạn là chuyên gia SEO với 10+ năm kinh nghiệm. Nhiệm vụ của bạn là phân tích
trang web và đưa ra recommendations cụ thể, actionable.

Quy tắc:
1. Luôn đưa ra lý do WHY cho mỗi recommendation
2. Ưu tiên issues theo impact: Critical > Warning > Info
3. Cung cấp ví dụ cụ thể (không nói chung chung)
4. Đề xuất phải fit trong giới hạn (title ≤60 chars, desc ≤160 chars)
5. Dùng dữ liệu từ tools để back up recommendations
6. Trả lời bằng tiếng Việt nếu user hỏi bằng tiếng Việt

Bạn có access đến các tools sau:
- analyzeMetaTags: phân tích meta tags hiện tại
- searchKeywords: tìm keyword liên quan
- generateMetaTitle: tạo meta title tối ưu
- generateMetaDescription: tạo meta description tối ưu
- checkCompetitors: so sánh với top 10 SERP
..."
```

### 5.6 Keyword Research

#### 5.6.1 Nguồn dữ liệu keyword

| API | Dữ liệu | Cost | Rate Limit |
|-----|----------|------|------------|
| **DataForSEO** | Search volume, CPC, competition, SERP | $0.075/1000 tasks | 2000 req/min |
| **Tavily Search** | Related search results, content | $5/1000 searches | 1000 req/min |
| **Google Autocomplete** | Suggestion keywords | Free | Rate limited |
| **Google Trends** | Trend data | Free | Rate limited |
| **People Also Ask** | Question-based keywords | Via SERP scraping | Varies |

#### 5.6.2 Keyword Analysis Features

```
Input: Seed keyword (e.g., "giày nike")
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                  KEYWORD RESEARCH PIPELINE                   │
│                                                             │
│  Step 1: Expand keywords                                    │
│    ├── Google Autocomplete → ["giày nike air max",          │
│    │   "giày nike chính hãng", "giày nike nữ", ...]        │
│    ├── DataForSEO Related → ["giày adidas", "giày thể      │
│    │   thao", "mua giày nike", ...]                         │
│    └── People Also Ask → ["giày nike bao nhiêu tiền?",     │
│        "mua giày nike ở đâu?", ...]                         │
│                                                             │
│  Step 2: Enrich data (DataForSEO)                           │
│    ├── Search Volume: 12,100/tháng                          │
│    ├── CPC: $0.45                                           │
│    ├── Competition: 0.67 (Medium)                           │
│    ├── Keyword Difficulty: 45/100                           │
│    └── SERP Features: Shopping, Images, PAA                 │
│                                                             │
│  Step 3: Analyze & Rank                                     │
│    ├── Keyword Difficulty Score                              │
│    ├── Opportunity Score = Volume / Difficulty               │
│    └── Intent Classification: informational / transactional │
│                                                             │
│  Step 4: Present results                                    │
│    ├── Bảng keyword với metrics                              │
│    ├── Keyword grouping (by intent, topic)                  │
│    └── Export CSV                                            │
└─────────────────────────────────────────────────────────────┘
```

#### 5.6.3 Keyword Density Checker

Tính toán mật độ keyword trong nội dung trang:

```typescript
// services/keyword/densityChecker.ts
export function analyzeKeywordDensity(text: string, targetKeyword: string) {
  const words = text.toLowerCase().split(/\s+/);
  const totalWords = words.length;

  // Exact match count
  const keywordWords = targetKeyword.toLowerCase().split(/\s+/);
  let exactCount = 0;

  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const phrase = words.slice(i, i + keywordWords.length).join(' ');
    if (phrase === targetKeyword.toLowerCase()) exactCount++;
  }

  const density = (exactCount / totalWords) * 100;

  // SEO recommendation: keyword density 1-3% là lý tưởng
  let recommendation: 'low' | 'optimal' | 'high';
  if (density < 0.5) recommendation = 'low';
  else if (density <= 3.0) recommendation = 'optimal';
  else recommendation = 'high';

  return {
    keyword: targetKeyword,
    count: exactCount,
    totalWords,
    density: Math.round(density * 100) / 100,
    recommendation,
    message: recommendation === 'low'
      ? `Keyword "${targetKeyword}" xuất hiện ${exactCount} lần (${density}%). Nên thêm keyword vào content.`
      : recommendation === 'optimal'
      ? `Keyword "${targetKeyword}" có mật độ tối ưu (${density}%).`
      : `Keyword "${targetKeyword}" xuất hiện quá nhiều (${density}%). Giảm bớt để tránh keyword stuffing.`,
  };
}
```

---

## 6. Roadmap tổng thể

### 6.1 Timeline chi tiết

```
Week 1-2: Phase 1 — Foundation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
W1  ████████████████  Project setup, Docker Compose, CI/CD skeleton
    ├── Init monorepo (Turborepo/pnpm workspaces)
    ├── Setup Fastify + Prisma + PostgreSQL
    ├── Setup Next.js + Shadcn/UI
    ├── Docker Compose (PG + Redis + Minio)
    └── GitHub Actions CI (lint + type-check)

W2  ████████████████  Core patterns implementation
    ├── Controller/Service/Repository boilerplate
    ├── BullMQ queue setup (crawl, analyze, ai)
    ├── API hooks (TanStack Query wrappers)
    ├── NextAuth.js integration
    └── AI Agent skeleton (LangGraph + SSE)

Week 3-6: Phase 2 — Platform Layer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
W3  ████████████████  Crawler module
    ├── Playwright crawler service
    ├── Cheerio fallback for static sites
    ├── HTML parser (meta, headings, images, links)
    └── Crawl queue worker

W4  ████████████████  Database & Auth
    ├── Prisma schema (users, projects, audits, pages, issues)
    ├── Migration system
    ├── NextAuth (Google OAuth + credentials)
    └── User dashboard page

W5  ████████████████  Core UI pages
    ├── Project management (CRUD)
    ├── Audit trigger + status tracking
    ├── SEO report page (score, issues list)
    └── Page detail view

W6  ████████████████  Integration & polish
    ├── Fastify API routes finalization
    ├── API error handling, validation (Zod)
    ├── Frontend error boundaries
    └── Loading states, skeletons, empty states

Week 7-14: Phase 3 — SEO Features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
W7  ████████████████  On-page SEO Analyzer
    ├── 24 SEO rules implementation
    ├── Scoring algorithm
    ├── Issue detail views
    └── Fix suggestions

W8  ████████████████  Structured Data + Sitemap
    ├── JSON-LD validator (10 schema types)
    ├── Rich Results eligibility checker
    ├── XML sitemap generator
    └── Sitemap manager UI

W9  ████████████████  Site Speed Analyzer
    ├── PageSpeed Insights API integration
    ├── Core Web Vitals dashboard
    ├── Performance history chart
    └── Speed optimization suggestions

W10 ████████████████  AI SEO Agent
    ├── LangGraph agent with 8 tools
    ├── SSE streaming to frontend
    ├── MongoDB checkpoint (conversation state)
    └── Credit system

W11 ████████████████  Keyword Research
    ├── DataForSEO / Tavily integration
    ├── Keyword density checker
    ├── Related keywords explorer
    └── SERP analysis view

W12 ████████████████  Advanced Features
    ├── Bulk audit (full site crawl)
    ├── Scheduled re-audits (cron)
    ├── Email notifications (audit complete, issues found)
    └── Export reports (PDF/CSV)

W13 ████████████████  Testing & Optimization
    ├── Unit tests (Vitest) — services, analyzers
    ├── Integration tests — API endpoints
    ├── E2E tests (Playwright) — critical flows
    └── Performance optimization (DB queries, caching)

W14 ████████████████  Deployment & Launch
    ├── VPS setup (Docker Compose production)
    ├── Nginx + SSL (Let's Encrypt)
    ├── Monitoring (Sentry + Prometheus + Grafana)
    ├── Documentation
    └── Beta launch
```

### 6.2 Milestones

| Milestone | Tuần | Deliverable | Tiêu chí hoàn thành |
|-----------|------|-------------|----------------------|
| **M1: Foundation** | W2 | Project skeleton chạy được | API server + DB + Queue + Frontend chạy local |
| **M2: Crawl MVP** | W4 | Crawl được 1 page, hiện kết quả | User nhập URL → thấy HTML parsed data |
| **M3: SEO Report** | W7 | Full SEO audit report | SEO Score + 24 issues check + fix suggestions |
| **M4: AI Agent** | W10 | AI chat cho SEO recommendations | User hỏi → AI trả lời streaming với tool calls |
| **M5: Full Feature** | W12 | Đầy đủ tính năng SEO | Sitemap + Speed + Keywords + Scheduled audits |
| **M6: Production** | W14 | Deploy lên production | Accessible qua domain, monitoring hoạt động |

---

## 7. Đánh giá rủi ro & hướng mở rộng

### 7.1 Technical Risks

| Rủi ro | Xác suất | Impact | Mitigation |
|--------|----------|--------|------------|
| **Target website block crawler** | Cao | Trung bình | Rotate User-Agent, respect robots.txt, rate limiting, residential proxies |
| **Playwright memory leak** | Trung bình | Cao | Browser context pool, auto-restart workers, memory monitoring |
| **AI API cost vượt budget** | Trung bình | Cao | Credit system, cache responses, dùng smaller models cho simple tasks |
| **Database performance tại scale** | Thấp (giai đoạn đầu) | Cao | Proper indexing, connection pooling, read replicas khi cần |
| **SERP data accuracy** | Trung bình | Trung bình | Multiple data sources, cross-validation, cache results |
| **SSE connection stability** | Thấp | Trung bình | Reconnection logic, message buffering, fallback to polling |
| **Third-party API downtime** | Thấp | Trung bình | Circuit breaker pattern, fallback responses, queue retry |

### 7.2 Scaling Strategy

**Giai đoạn 1: Single VPS (0-500 users)**

```
1 VPS (4GB RAM, 2 vCPU) — ~$20/tháng
  ├── Fastify API (1 process)
  ├── BullMQ Workers (3 workers)
  ├── PostgreSQL
  ├── Redis
  └── Next.js (SSR)
```

**Giai đoạn 2: Horizontal Scale (500-5,000 users)**

```
Load Balancer (Nginx/HAProxy)
  ├── API Server 1 (4GB)
  ├── API Server 2 (4GB)
  │
  ├── Worker Server 1 (8GB) — Crawl workers + Playwright
  ├── Worker Server 2 (8GB) — Crawl workers + Playwright
  │
  ├── DB Server (8GB) — PostgreSQL Primary
  ├── DB Replica (4GB) — Read replica
  │
  └── Redis Server (2GB) — BullMQ + Cache
```

**Giai đoạn 3: Cloud Native (5,000+ users)**

```
Kubernetes Cluster
  ├── API Pods (auto-scale 2-10)
  ├── Worker Pods (auto-scale 2-20)
  ├── Managed PostgreSQL (RDS/Cloud SQL)
  ├── Managed Redis (ElastiCache/Memorystore)
  ├── Object Storage (S3/GCS)
  └── CDN (CloudFront/Cloudflare)
```

### 7.3 Future Features (Post-MVP)

| Feature | Mô tả | Priority | Effort |
|---------|--------|----------|--------|
| **Competitor Analysis** | So sánh SEO metrics với đối thủ cạnh tranh | Cao | 2-3 tuần |
| **Rank Tracking** | Theo dõi vị trí keyword trên SERP hàng ngày | Cao | 2-3 tuần |
| **Backlink Analysis** | Phân tích profile backlink (via Ahrefs/Moz API) | Trung bình | 2 tuần |
| **Content Optimization** | AI viết/rewrite content theo SEO best practices | Cao | 2 tuần |
| **White-label Reports** | Xuất PDF report với branding của agency | Trung bình | 1-2 tuần |
| **API Public** | REST API cho developers integrate | Trung bình | 1 tuần |
| **Team Collaboration** | Multi-user projects, role-based access | Trung bình | 2 tuần |
| **WordPress Plugin** | Plugin WordPress connect với hệ thống | Thấp | 2-3 tuần |
| **Chrome Extension** | Quick SEO check khi browse website | Thấp | 1-2 tuần |
| **Slack/Discord Bot** | Notifications + quick audit commands | Thấp | 1 tuần |
| **Multi-language AI** | AI agent hỗ trợ đa ngôn ngữ | Trung bình | 1 tuần |
| **Scheduled Monitoring** | Auto-audit hàng tuần + alert khi SEO score giảm | Cao | 1-2 tuần |

### 7.4 Business Model đề xuất

| Plan | Giá/tháng | Giới hạn | Target |
|------|-----------|----------|--------|
| **Free** | $0 | 1 project, 50 pages/audit, 10 AI credits | Individual / Trial |
| **Pro** | $19 | 5 projects, 500 pages/audit, 100 AI credits | Freelancer / SMB |
| **Agency** | $49 | 20 projects, 2000 pages/audit, 500 AI credits, white-label | Agency |
| **Enterprise** | $99 | Unlimited projects, 10,000 pages, 2000 AI credits, API access | Enterprise |
| **AI Credits** | $5-50 | 100-2000 credits (one-time purchase) | All plans |

---

## Phụ lục A: Tech Stack tổng hợp

| Layer | Công nghệ | Phiên bản | Lý do |
|-------|-----------|-----------|-------|
| **Frontend** | Next.js | 15.x | SSR + App Router + Server Components |
| **UI Library** | Shadcn/UI + Tailwind | latest | Zero vendor lock-in, full customization |
| **State Management** | TanStack Query v5 | 5.x | Server state caching, auto-refetch |
| **Backend** | Fastify | 5.x | Performance 2x Express, schema validation |
| **ORM** | Prisma | 6.x | Type-safe queries, migrations |
| **Database** | PostgreSQL | 16 | ACID, JSONB, full-text search |
| **Cache + Queue** | Redis + BullMQ | 7.x / 5.x | Background jobs, caching, sessions |
| **Crawler** | Playwright + Cheerio | latest | Dynamic + static HTML crawling |
| **AI Framework** | LangChain + LangGraph | latest | Agent orchestration, tool calling |
| **AI Models** | Claude / GPT-4 | latest | SEO analysis, content generation |
| **Search API** | Tavily / DataForSEO | N/A | Keyword data, SERP analysis |
| **Speed Analysis** | PageSpeed Insights API | v5 | Core Web Vitals, Lighthouse |
| **Auth** | NextAuth.js (Auth.js) | v5 | OAuth, JWT sessions |
| **Storage** | Minio (S3-compatible) | latest | Reports, screenshots, exports |
| **Monitoring** | Sentry + Pino | latest | Error tracking, structured logging |
| **CI/CD** | GitHub Actions | N/A | Build, test, deploy automation |
| **Deployment** | Docker Compose → VPS | latest | Predictable cost, full control |

---

## Phụ lục B: So sánh với Avada SEO Suite

| Khía cạnh | Avada SEO Suite | Web SEO Tool (đề xuất) |
|-----------|----------------|----------------------|
| **Target platform** | Shopify only | Mọi website |
| **Data source** | Shopify API + Metafields | Web crawling (Playwright) |
| **Rendering** | Liquid server-side | Client-side dashboard |
| **Database** | Firestore (NoSQL) | PostgreSQL (SQL) |
| **Queue** | GCP Pub/Sub | BullMQ + Redis |
| **Auth** | Shopify OAuth + Firebase | NextAuth (OAuth + credentials) |
| **UI** | Polaris (Shopify) | Shadcn/UI (platform-agnostic) |
| **Runtime** | Firebase Functions (serverless) | Fastify on VPS |
| **AI Agent** | LangGraph + MongoDB (giữ nguyên pattern) | LangGraph + PostgreSQL/MongoDB (giữ nguyên pattern) |
| **SEO features** | Meta rules, Structured Data, Image SEO, Speed, Sitemap, Indexing, 404, AI Audit | On-page Analyzer, Schema Validator, Sitemap, Speed, Keywords, AI Recommendations |
| **Deployment** | Firebase + GCP | Docker Compose + VPS |
| **Cost** | Pay-per-use (Firebase) | Fixed ($20/tháng VPS) |

---

## Phụ lục C: Cấu trúc thư mục dự kiến

```
seo-tool/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/                      # App Router pages
│   │   │   ├── (auth)/               # Login, register
│   │   │   ├── (dashboard)/          # Protected pages
│   │   │   │   ├── projects/         # Project management
│   │   │   │   ├── audits/           # SEO audit reports
│   │   │   │   ├── keywords/         # Keyword research
│   │   │   │   ├── sitemaps/         # Sitemap management
│   │   │   │   ├── speed/            # Site speed analysis
│   │   │   │   └── ai-chat/          # AI SEO assistant
│   │   │   └── api/                  # Next.js API routes (auth only)
│   │   ├── components/               # Shadcn/UI components
│   │   ├── hooks/                    # Custom hooks (TanStack Query)
│   │   ├── lib/                      # Utils, API client, config
│   │   └── styles/                   # Tailwind config + globals
│   │
│   └── api/                          # Fastify backend
│       └── src/
│           ├── modules/
│           │   ├── auth/             # Auth controller/service
│           │   ├── crawler/          # Crawl controller/service/worker
│           │   ├── analyzer/         # SEO analysis service
│           │   ├── ai-agent/         # LangGraph agent + tools
│           │   ├── sitemap/          # Sitemap generator
│           │   ├── speed/            # PageSpeed integration
│           │   ├── keyword/          # Keyword research
│           │   ├── project/          # Project management
│           │   └── user/             # User management
│           ├── shared/
│           │   ├── database/         # Prisma client + repos
│           │   ├── queue/            # BullMQ setup + workers
│           │   ├── middleware/       # Auth, rate limit, validation
│           │   └── utils/            # Pure helpers
│           └── config/               # App config, plans, constants
│
├── packages/
│   └── shared/                       # Shared types, constants
│       ├── types/                    # TypeScript types
│       └── constants/                # SEO rules, score weights
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/                   # Migration files
│
├── docker-compose.yml                # PG + Redis + Minio
├── docker-compose.prod.yml           # Production config
├── turbo.json                        # Turborepo config
├── package.json                      # Root package.json
└── .github/
    └── workflows/
        ├── ci.yml                    # Lint + test + type-check
        └── deploy.yml                # Docker build + deploy
```

---

*Tài liệu này được xây dựng dựa trên phân tích codebase Avada SEO Suite v1.45.12 — một ứng dụng SEO production-grade với 43 controllers, 47 repositories, 60+ pages, 40+ PubSub subscribers, và tích hợp AI Agent (LangChain + LangGraph). Các pattern kiến trúc được rút ra và adapt cho bối cảnh web SEO tool tổng quát.*
