# SEO Analyst Platform — Project Guide

> **For**: Giảng viên chấm đồ án + dev mới join team + người dùng muốn hiểu sản phẩm.
> **Style**: Giải thích từ đơn giản → chi tiết kỹ thuật. Đọc từ trên xuống.

---

## 🎯 Mở đầu — Bạn có biết?

> Một trang web load chậm 3 giây làm mất **53% users** ngay lập tức.
> Google trả lời 8 tỉ lượt tìm kiếm mỗi ngày — nhưng **90% website** không xuất hiện ở trang 1.

Lý do? SEO (Search Engine Optimization) quyết định. Và phân tích SEO đang quá đắt:

| Công cụ | Giá / tháng |
|---|---|
| Ahrefs | $99 – $499 |
| SEMrush | $139 – $249 |
| Moz Pro | $99 – $599 |

Với sinh viên, freelancer mới, hoặc chủ doanh nghiệp nhỏ Việt Nam — **không ai trả nổi**.

Đó là vấn đề đồ án này giải quyết.

---

## 📖 Dự án này là gì? (ELI5 — nói như với người chưa biết gì)

Hãy tưởng tượng bạn có một **trang web** và muốn biết:

- Google có thích trang của tôi không?
- Trang tôi có tải nhanh không?
- Từ khoá tôi muốn rank có xuất hiện đủ chỗ không?
- Có gì hỏng (thiếu ảnh alt, heading sai, link gãy...)?

**SEO Analyst Platform** là một công cụ bạn nhập vào **1 URL** → nó tự động:
1. Tải trang web đó về (như trình duyệt)
2. Kiểm tra 20 tiêu chí SEO quan trọng
3. Đo tốc độ tải + trải nghiệm người dùng (Core Web Vitals)
4. Phân tích mật độ từ khoá
5. Chấm điểm 0–100 + gợi ý sửa gì trước
6. Xuất PDF đẹp để gửi khách / nộp báo cáo

**Analogy đời thực**: Giống như bạn mang xe máy đi kiểm định. Thợ kiểm 20 chỗ (phanh, đèn, lốp...), chấm điểm từng phần, in biên bản nói chỗ nào cần sửa. Platform này làm y chang nhưng cho website.

---

## 👥 Cho ai dùng?

| Người dùng | Mục đích |
|---|---|
| 🎓 **Sinh viên SEO / Digital Marketing** | Học cách đánh giá website thật, không chỉ lý thuyết |
| 💼 **Freelancer marketing mới vào nghề** | Gửi báo cáo chuyên nghiệp cho khách mà không tốn tiền tool |
| 🏪 **Chủ SME Việt Nam** | Biết website mình thiếu gì để sửa, không cần thuê agency |
| 🧪 **Kỹ sư backend học microservices** | Reference triển khai hệ 5-service với NestJS + gRPC + BullMQ |

---

## 🔍 Vấn đề nó giải quyết

### 3 pain points chính

**1. Công cụ thương mại quá đắt.**
Sinh viên trả 99 USD/tháng = 2.4 triệu VND. Không khả thi.

**2. Công cụ miễn phí thì chung chung.**
Google PageSpeed Insights, Lighthouse chạy lẻ — chỉ kiểm performance. Không kiểm tra title, meta, heading, keyword density, Open Graph, schema... cùng lúc.

**3. Kết quả khó hiểu.**
Dù là tool nào, đa số chỉ nói "FAIL" mà không giải thích tại sao quan trọng, sửa ra sao. Newbie đọc xong vẫn không biết làm gì.

### Nền tảng này giải quyết sao?

- ✅ Chi phí vận hành **<$40/tháng** → miễn phí cho cá nhân
- ✅ **20 rule tích hợp** + Core Web Vitals + keyword — 1 chỗ đủ
- ✅ Mỗi issue đều có **gợi ý cụ thể** + link tới tài liệu
- ✅ Giao diện tiếng Việt, ví dụ Việt hoá, không phải đọc doc tiếng Anh

---

## 🧱 Hoạt động như thế nào — Cấp độ 1: Bức tranh lớn

```
       ┌────────────────────────────┐
       │   Bạn (user / frontend)    │
       └───────────────┬────────────┘
                       │  nhập 1 URL
                       ▼
       ┌────────────────────────────┐
       │       PLATFORM (5 services)│
       │  ─ Crawl trang web         │
       │  ─ Kiểm 20 SEO rules       │
       │  ─ Phân tích từ khoá       │
       │  ─ Đo tốc độ (Lighthouse)  │
       │  ─ Tổng hợp → điểm + PDF   │
       └───────────────┬────────────┘
                       │  kết quả + realtime progress
                       ▼
       ┌────────────────────────────┐
       │   Bạn nhận: Score, Issues, │
       │            PDF, Share link │
       └────────────────────────────┘
```

**Mỗi lần bạn nhấn "Audit"**, có **5 dịch vụ** chạy song song dưới hood. Hãy nhìn kỹ:

---

## 🧩 Cấp độ 2: 5 dịch vụ và vai trò

Tưởng tượng 1 nhà hàng. Khi bạn gọi món, 5 người làm 5 việc khác nhau:

| Service | Giống vai trò ở nhà hàng | Thực tế công nghệ |
|---|---|---|
| **gateway** | Lễ tân — nhận order, check thẻ thành viên, báo khi xong | NestJS REST + WebSocket, JWT auth |
| **crawler** | Đi chợ — lấy nguyên liệu (HTML) từ nhà cung cấp (website) | Cheerio HTTP + Playwright (SPA), Lighthouse |
| **seo-analyzer** | Đầu bếp chính — nêm nếm (chấm 20 rule SEO) | Rule engine + Prisma (Postgres) |
| **keyword-analyzer** | Phụ bếp — xay gia vị (tokenize + tính density từ khoá) | Vietnamese/English tokenizer |
| **report** | Người đóng gói — gộp mọi thứ thành hộp đẹp (PDF + share link) | Playwright PDF + Handlebars |

Mỗi service:
- Chạy trong **Docker container** riêng
- Nói chuyện qua **gRPC** (nhanh hơn HTTP) + **BullMQ queue** (cho job async) + **Redis pub/sub** (cho sự kiện realtime)
- Có **database riêng** (nếu cần) → không service nào chen vào DB của service khác

---

## 🔄 Cấp độ 3: 1 audit diễn ra như thế nào?

Hãy theo dõi URL `https://example.com` từ lúc bạn nhấn nút đến lúc nhận PDF:

```
Giây 0:   User → POST /audits { url: "https://example.com" }
          gateway tạo audit row (status=pending)
          gateway gửi job "crawl.start" vào BullMQ
          gateway trả về audit ID ngay (không chờ)

Giây 1-5: crawler nhận job
          ├─ Kiểm URL có an toàn không (chặn SSRF vào 127.0.0.1, private IP)
          ├─ Fetch bằng axios+Cheerio (nhanh, <1s)
          ├─ Nếu trang là SPA (body rỗng, có __NEXT_DATA__) → fallback Playwright
          ├─ Chạy Lighthouse đo CWV (song song, ~5-20s)
          └─ Trích xuất PageData: title, h1-h6, images, links, JSON-LD, ...

Giây 5:   crawler publish "crawl.done" + fan-out 2 job song song:
          ├─ BullMQ "analyze.start" → seo-analyzer
          └─ BullMQ "keyword.start" → keyword-analyzer

Giây 5-7: SONG SONG
          │
          ├─ seo-analyzer:
          │    Query 20 rules từ DB (có thể admin tắt/tinh chỉnh)
          │    Chạy mỗi rule.check(pageData)
          │    Lưu 20 dòng vào ruleResults
          │    publish "analyze.done"
          │
          └─ keyword-analyzer:
               Detect ngôn ngữ (VI vs EN)
               Tokenize + loại stopword
               Top 20 keyword + density + placement
               Nếu có target keyword → phân tích verdict (low/optimal/high/stuffing)
               publish "keyword.done"

Giây 7:   report service lắng 2 event ở trên
          WaitForBothService: counter chạm 2/2
          → BullMQ "report.start"

Giây 7-8: report worker:
          ├─ Đọc cache analyze+keyword từ Redis
          ├─ Aggregator: finalScore = 0.7×analyzer + 0.3×CWV
          ├─ Tính criticalIssues (fail + weight≥7)
          ├─ Lưu vào Postgres (Report table)
          ├─ publish "report.done" + "audit.completed"

Giây 8:   gateway/progress-subscriber bắt event
          → update audits.status=completed, seoScore=75
          → emit WebSocket "audit:completed" tới tất cả client đang sub

Giây 8:   Frontend nhận push → refresh UI
          User nhấn "Download PDF" → GET /audits/:id/export
          → report render HTML template qua Playwright → PDF bytes
          → trả về browser
```

**Tổng**: một audit đơn giản hoàn tất trong **~8 giây**. Trang SPA phức tạp có thể 30s do Playwright + Lighthouse.

---

## 📏 20 SEO rule tụi mình kiểm gì?

| Category | Rule | Kiểm gì |
|---|---|---|
| **Meta** | title-tag | Title có không + dài 30–60 ký tự |
| | meta-description | Description có + dài 120–160 ký tự |
| | open-graph | Đủ `og:title, og:description, og:image, og:url` |
| | twitter-card | Có tag `twitter:card, twitter:title, twitter:description` |
| **Headings** | h1-tag | Đúng 1 thẻ H1 trên trang |
| | heading-hierarchy | H1→H2→H3 không nhảy cóc |
| **Images** | image-alt | Mỗi ảnh có `alt` |
| | image-optimization | Dùng webp/avif + kích thước hợp lý |
| **Links** | internal-links | Đủ internal link cho crawlability |
| | external-links | Có `rel="nofollow"` khi cần |
| **Performance** | page-size | Dung lượng dưới budget |
| **Technical (9)** | https-check | Dùng HTTPS |
| | http-status | Status 200 (hoặc 3xx hợp lệ) |
| | canonical-url | Có canonical + cùng domain |
| | robots-meta | Không bị `noindex` / `nofollow` sai |
| | language-tag | `<html lang="...">` hợp lệ |
| | viewport-meta | Có viewport mobile-friendly |
| | favicon | Có favicon |
| | schema-org | Có JSON-LD structured data |
| | url-structure | URL sạch, ngắn, dùng gạch nối |

Mỗi rule trả về:
- `status`: PASS / WARN / FAIL
- `score`: 0 / 50 / 100
- `message`: giải thích tiếng Việt
- `suggestion`: sửa thế nào

**Công thức điểm cuối:**
```
overallScore = Σ(ruleScore × ruleWeight) / Σ(ruleWeight)   (analyzer)
finalScore   = overallScore × 0.7 + cwvPerformance × 0.3   (blended với Lighthouse)

classification: ≥80 excellent · ≥60 good · ≥40 fair · <40 poor
```

Admin có thể tinh chỉnh `weight` từng rule qua REST `PUT /admin/rules` mà không cần deploy.

---

## 🧬 Cấp độ 4 — Stack công nghệ & lý do chọn

| Lớp | Công nghệ | Tại sao chọn |
|---|---|---|
| **Language** | TypeScript | Type-safe → giảm bug tại boundary giữa 5 service |
| **Backend framework** | NestJS 10 | Pattern rõ (module, DI, guard, pipe) → dễ scale và test |
| **Monorepo** | Turborepo | Cache build thông minh → 1 lần sửa, chỉ service ảnh hưởng rebuild |
| **Inter-service sync** | gRPC (proto3) | Nhanh hơn REST ~3x, type-safe 2 phía |
| **Inter-service async** | BullMQ (Redis) | Retry tự động + dedup job + rate limit built-in |
| **Inter-service event** | Redis pub/sub | Realtime progress tới WebSocket không cần polling |
| **DB** | PostgreSQL 16 + Prisma | Strong types + migration + Supabase hosting free-tier |
| **Cache** | Redis 7 | Cache crawl (30m), lighthouse (1h), result (1h) → tránh chạy lại |
| **Web crawler** | Cheerio (tĩnh) → Playwright (SPA) | 2-tier: nhanh mặc định, chỉ chậm khi cần |
| **Performance audit** | Lighthouse | Chuẩn Google, đo CWV chính xác |
| **Frontend** | Next.js 14 + shadcn/ui + TanStack Query | App Router + stream + realtime UX |
| **Realtime** | Socket.IO | Push progress lên client không cần request |
| **PDF** | Playwright + Handlebars | HTML→PDF đẹp, font Việt chuẩn |
| **Deploy** | Docker Compose (dev) / Vercel+Railway+Supabase (prod) | Target <$40/tháng |

---

## 🗄️ Cấp độ 5 — Dữ liệu ra sao?

3 Postgres database tách biệt theo service boundary:

```
┌─────────────────────────────┐
│  seo_gateway  (gateway)     │
│  ─ User                     │   tài khoản, vai trò
│  ─ Audit                    │   mỗi lần user bấm audit = 1 row
│  ─ RefreshToken             │   quản lý session, rotation
└─────────────────────────────┘

┌─────────────────────────────┐
│  seo_analyzer  (seo-analyzer)│
│  ─ SeoRule                  │   20 rule với weight (admin sửa được)
│  ─ RuleResult               │   mỗi audit × rule = 1 row kết quả
└─────────────────────────────┘

┌─────────────────────────────┐
│  seo_report  (report)       │
│  ─ Report                   │   snapshot + final score của 1 audit
│  ─ ReportKeyword            │   top keyword snapshots
│  ─ ReportCwv                │   CWV snapshots
│  ─ ShareLink                │   public share token
└─────────────────────────────┘
```

**Redis** giữ state tạm cho pipeline:
- `crawl:<hash>`, `lighthouse:<hash>` — cache 30m-1h để tránh crawl lại
- `audit:<id>:progress`, `audit:<id>:stage` — realtime progress
- `audit:<id>:completed_steps` — counter chờ cả 2 service xong
- `analyze.done / keyword.done / report.done / audit.*` — pub/sub channels

---

## 🔐 Bảo mật — có quan tâm những gì?

- ✅ **Passwords**: bcrypt cost 12 (~250ms/hash → chống brute-force)
- ✅ **JWT access**: 15 phút TTL
- ✅ **Refresh token**: 7 ngày, lưu **hashed** trong DB, xoay vòng mỗi lần dùng
- ✅ **SSRF defense**: URL validator chặn `127.0.0.1`, private IP ranges (10/8, 172.16/12, 192.168/16), DNS rebinding (resolve hostname trước khi fetch)
- ✅ **Rate limit**: 10 audit/giờ/user, 60 req/phút/IP, 3 register/giờ/IP
- ✅ **Ownership check**: mỗi query audit kiểm `audit.userId === currentUser.id` (hoặc admin)
- ✅ **Share link**: 256-bit token, revocable soft-delete

---

## 🚀 Cho developer mới — Chạy local thế nào?

### Yêu cầu
- Node.js ≥ 18
- Docker + Docker Compose
- npm 11+

### 3 lệnh là xong
```bash
# 1. Cài deps
npm install

# 2. Copy env
cp .env.docker.example .env.docker

# 3. Bật toàn stack
npm run docker:up
```

Sau ~60 giây (build image lần đầu có thể mất 5 phút do Playwright):
- Gateway REST: http://localhost:3000/api/v1
- Gateway Swagger: http://localhost:3000/api/docs
- Report PDF: http://localhost:3004
- Postgres: 5432 (gateway), 5433 (analyzer), 5434 (report)
- Redis: 6379

### Thử 1 audit end-to-end
```bash
# Smoke test tự động (đăng ký user, login, audit, chờ xong, check kết quả)
npm run e2e:smoke
```

### Chỉ dev 1 service (nhanh hơn)
```bash
# Bật chỉ DB + Redis bằng docker
docker-compose up gateway-db analyzer-db report-db redis -d

# Rồi dev 1 service ở host (hot-reload)
npm run dev:gateway
```

### Test
```bash
npm test                                        # toàn bộ
npx turbo run test --filter=@seo/crawler        # 1 service
cd apps/keyword-analyzer && npm run test:watch  # watch mode
```

---

## 🧭 Tìm hiểu sâu hơn — đọc gì tiếp theo?

| Muốn biết về... | Đọc |
|---|---|
| Bức tranh cross-service | `apps/CLAUDE.md` |
| 1 service cụ thể | `apps/<service>/CLAUDE.md` |
| Data model chi tiết | `apps/<service>/prisma/schema.prisma` |
| gRPC API | `packages/proto/<service>/v1/*.proto` |
| Rule logic | `apps/seo-analyzer/src/analyzer/domain/rules/` (20 file) |
| Kiến trúc tổng | `.claude/context/architecture.md` |
| Request flow | `.claude/context/data-flow.md` |
| Dependency versions | `.claude/context/tech-stack.md` |
| Sơ đồ UML | `diagrams/*.puml` (19 sơ đồ: ERD, class, sequence, deployment...) |

---

## 📝 Glossary — Jargon giải thích ngắn

- **SEO (Search Engine Optimization)**: Tối ưu website để rank cao trên Google.
- **Crawl**: Trình tự tải HTML + các tài nguyên của 1 URL.
- **SPA (Single Page Application)**: Web render bằng JS (React/Vue/Next.js) → cần browser thật để thấy content.
- **Core Web Vitals (CWV)**: 3 chỉ số Google dùng đánh giá UX: LCP (load), INP (tương tác), CLS (shift layout).
- **gRPC**: Protocol RPC nhị phân của Google — nhanh hơn REST, có type contract.
- **BullMQ**: Thư viện queue dùng Redis — để chạy job async có retry.
- **Lighthouse**: Công cụ Google, audit performance/a11y/best-practices/SEO.
- **JWT (JSON Web Token)**: Token đăng nhập — 3 phần `header.payload.signature`.
- **SSRF (Server-Side Request Forgery)**: Lỗ hổng mà kẻ xấu dụ server request vào internal IP.
- **DDD (Domain-Driven Design)**: Cách tổ chức code theo domain → folders `controllers/ services/ domain/ persistence/`.

---

## ✅ Kiểm tra hiểu — 5 câu quiz ngắn

Trả lời trong đầu, scroll xuống xem đáp án:

1. Tại sao lại có 5 service thay vì 1 monolith?
2. Tại sao crawler thử Cheerio trước, fallback sang Playwright?
3. Nếu analyze xong trước keyword, report có bắt đầu chạy ngay không?
4. User tự xoá audit được không? Tại sao admin xoá được của user khác?
5. Ai trong 5 service KHÔNG có database?

<details>
<summary>Đáp án</summary>

1. **Scale độc lập** (crawler nặng memory Playwright 1.5GB, analyzer nhẹ hơn) + **deploy độc lập** (sửa rule không cần restart crawler) + **service boundary** (1 service fail không sập cả hệ thống).
2. Cheerio **10x nhanh hơn** (HTTP đơn thuần) với ~80% website tĩnh. Playwright đắt (chromium + networkidle wait) nên chỉ dùng khi phát hiện SPA shell.
3. **Không**. Report chờ CẢ 2 (`WaitForBothService` counter 2/2) mới trigger `report.start`. Thứ tự analyze/keyword không quyết định.
4. User chỉ xoá audit do mình tạo (`audit.userId === user.id`). Admin có `role === ADMIN` nên `getAuditDetail` bypass check ownership.
5. **crawler** và **keyword-analyzer** — cả hai đều stateless, chỉ dùng Redis để cache + queue. Không có Postgres.

</details>

---

## 🎉 Kết

Dự án tóm gọn:

> **SEO Analyst Platform** là một hệ 5 microservice NestJS giúp cá nhân & SME kiểm tra SEO website bằng 20 rule + Core Web Vitals + keyword analysis, xuất PDF đẹp, miễn phí — với chi phí vận hành dưới $40/tháng.

**Mục tiêu đồ án**: Chứng minh có thể triển khai một hệ microservice hoàn chỉnh (auth, gRPC, queue, realtime, PDF, admin) quy mô sinh viên, giải quyết pain point có thật của người Việt.

Còn thắc mắc? Đọc `apps/CLAUDE.md` hoặc hỏi thẳng người maintain — toàn bộ code có JSDoc header giải thích ý đồ.
