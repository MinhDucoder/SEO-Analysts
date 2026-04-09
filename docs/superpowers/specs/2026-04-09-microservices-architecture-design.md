# SEO Analyst Platform — Microservices Architecture Design

> **Version:** 1.0
> **Date:** 2026-04-09
> **Author:** MinhDucoder + Claude Opus 4.6
> **Status:** Approved
> **Project:** Xay dung nen tang phan tich SEO website tu dong — Do an tot nghiep DH GTVT

---

# Table of Contents

1. [Decision Log — Qua trinh thao luan](#1-decision-log)
2. [Architecture Overview](#2-architecture-overview)
3. [Audit Pipeline — Event Flow](#3-audit-pipeline)
4. [gRPC Contracts (Proto Files)](#4-grpc-contracts)
5. [Database Schemas & ERD](#5-database-schemas--erd)
6. [Core Logic — SEO Rule Engine](#6-core-logic--seo-rule-engine)
7. [Core Logic — Crawler Service](#7-core-logic--crawler-service)
8. [Core Logic — Keyword Analyzer](#8-core-logic--keyword-analyzer)
9. [REST API Endpoints & Swagger Spec](#9-rest-api-endpoints--swagger-spec)
10. [Docker Compose](#10-docker-compose)

---

# 1. Decision Log

> Ghi lai toan bo qua trinh thao luan, cac lua chon (options A/B/C), ly do chon, va trade-offs da can nhac.

## 1.1 Muc do tach biet Microservices

**Cau hoi:** Khi noi "Microservices", hinh dung muc do tach biet nao?

| Option | Mo ta | Pros | Cons |
|--------|-------|------|------|
| **A** | Separate NestJS apps trong monorepo | Cung repo, build/deploy doc lap. Giao tiep qua BullMQ + REST noi bo | Chua phai "fully independent" |
| **B** | Fully independent services | Moi service co the la repo rieng, Docker image rieng, scale hoan toan doc lap | Complexity cao nhat |
| **C** | Modular Monolith voi async workers | 1 NestJS app duy nhat, chia module ro rang, tach worker qua BullMQ | Khong demo duoc microservices that su |

> **Chon: B — Fully independent services**
> **Ly do:** Muc tieu la hoc va demo day du microservices patterns cho do an tot nghiep.

---

## 1.2 Muc tieu chinh

**Cau hoi:** Muc tieu chinh cua viec chon Microservices pattern B?

| Option | Mo ta |
|--------|-------|
| **A** | Hoc va demo cho do an — uu tien the hien day du patterns |
| **B** | Production-ready SaaS — uu tien thuc dung |
| **C** | Ca hai |

> **Chon: A — Hoc va demo cho do an**
> **Ly do:** Uu tien the hien day du patterns (service discovery, inter-service communication, independent deployment) de bao ve truoc hoi dong. Chap nhan complexity cao hon muc can thiet.

---

## 1.3 Giao tiep giua cac services

**Cau hoi:** Pattern giao tiep nao?

| Option | Mo ta | Pros | Cons |
|--------|-------|------|------|
| **A** | BullMQ (Redis) only | Don gian, da co Redis | Chi async, khong co sync call |
| **B** | BullMQ + NestJS Microservices Transport (TCP/Redis) | Job queue cho async, `@MessagePattern` cho request-response | Demo duoc them NestJS patterns |
| **C** | BullMQ + gRPC | Job queue cho async, gRPC cho sync calls, protocol buffers, strongly-typed contracts | Complexity cao nhat |

> **Chon: C — BullMQ + gRPC**
> **Ly do:** Demo duoc protocol buffers, strongly-typed contracts giua services. gRPC la standard trong industry (Google, Netflix, Uber). Hoi dong hoi "tai sao gRPC?" → tra loi duoc: language-agnostic interface, backward compatibility, performance.

---

## 1.4 So luong services

**Cau hoi:** Tach bao nhieu services?

| Option | Services | Dac diem |
|--------|----------|----------|
| **A** | 4 (theo document goc) | Gateway, Crawler, SEO Analyzer, Report |
| **B** | 6 (tach ro hon) | + Keyword Analyzer + Lighthouse rieng |
| **C** | 5 (can bang) | Gateway, Crawler (+ Lighthouse), SEO Analyzer, Keyword Analyzer, Report |

> **Chon: C — 5 services**
> **Ly do:** Crawler va Lighthouse deu can Playwright/browser → gop chung tiet kiem resource. Keyword Analyzer tach rieng demo duoc them 1 service boundary. 5 services du an tuong cho do an ma khong qua kho quan ly.

---

## 1.5 Database strategy

**Cau hoi:** Moi service co database rieng hay share?

| Option | Mo ta | Pros | Cons |
|--------|-------|------|------|
| **A** | Shared PostgreSQL, separate schemas | 1 PG instance, moi service 1 schema | Demo duoc isolation concept, don gian |
| **B** | Shared PostgreSQL, shared schema | 1 DB, 1 schema. Gateway so huu toan bo | Don gian nhat, nhung khong demo duoc database-per-service |
| **C** | Multiple PostgreSQL instances | Moi service 1 container PG rieng | Demo dung chuan microservices nhat |

> **Chon: C — Multiple PostgreSQL instances**
> **Ly do:** Demo dung chuan "Database per Service" pattern. Moi service so huu data rieng, khong co cross-database FK. Consistency dam bao bang application logic. Day la best practice trong microservices architecture.

**Database mapping da thong nhat:**

| Service | Database | Ly do |
|---------|----------|-------|
| Gateway | PostgreSQL #1 | So huu user data, auth tokens, audit metadata |
| Crawler | Redis only | Stateless, cache crawl results tam (TTL), BullMQ jobs |
| SEO Analyzer | PostgreSQL #2 | So huu rules config + ket qua phan tich |
| Keyword Analyzer | Redis only | Stateless, tra ket qua qua gRPC, khong can persist rieng |
| Report | PostgreSQL #3 | So huu aggregated reports, PDF metadata, share links |

→ **3 PostgreSQL + 1 Redis** trong docker-compose.

---

## 1.6 Orchestration flow

**Cau hoi:** Khi user submit URL, dieu phoi qua 4 services the nao?

| Option | Mo ta | Pros | Cons |
|--------|-------|------|------|
| **A** | Orchestration (Saga Orchestrator) | Gateway dieu khien tung buoc. Gateway biet toan bo flow | Single point of control, de debug | Gateway bi overload |
| **B** | Choreography (Event-driven) | Moi service tu biet minh can lam gi khi nhan event | Loose coupling | Kho debug, kho trace flow |
| **C** | Hybrid | Gateway orchestrate buoc dau (submit crawl), Crawler emit event, Analyzer + Keyword chay song song (choreography), Report doi ca 2 xong | Demo duoc ca 2 patterns. Analyzer + Keyword chay parallel → nhanh hon | Phuc tap hon A hoac B don le |

> **Chon: C — Hybrid**
> **Ly do:** Demo duoc ca Orchestration lan Choreography. Dac biet Analyzer + Keyword chay **song song** thay vi tuan tu → nhanh hon + demo duoc parallel processing. Hoi dong hoi "tai sao hybrid?" → tra loi: balance giua control va loose coupling.

---

## 1.7 Frontend

**Cau hoi:** Giu Next.js hay thay doi?

| Option | Mo ta |
|--------|-------|
| **A** | Next.js 14 (App Router) |
| **B** | Next.js 15 (moi nhat, React 19) |
| **C** | Vite + React (SPA thuan) |

> **Chon: A — Next.js 14 (App Router)**
> **Ly do:** Stable, SSR cho landing page (SEO cho chinh trang cong cu), App Router da mature. Khong can version moi nhat vi frontend khong phai trong tam demo microservices.

---

## 1.8 Deployment strategy

**Cau hoi:** Demo the nao?

| Option | Mo ta | Pros | Cons |
|--------|-------|------|------|
| **A** | Docker Compose only | Tat ca chay local bang `docker-compose up` | Don gian, truc quan, an toan | Chi local |
| **B** | Docker Compose + Kubernetes | Local dev + K8s demo | An tuong | Overkill cho do an |
| **C** | Docker Compose + Cloud | Local dev + deploy len Vercel/Railway | CI/CD thuc te | Chi phi, dependency |

> **Chon: A — Docker Compose only**
> **Ly do:** 5 services + 3 DB + Redis = 9 containers. Demo `docker-compose up` truoc hoi dong rat truc quan. An toan, khong dependency ben ngoai.

---

## 1.9 Architecture approach

**Cau hoi:** Cach to chuc code?

| Option | Mo ta | Pros | Cons |
|--------|-------|------|------|
| **A** | NestJS Monorepo Microservices | Tat ca 5 services la NestJS apps trong Turborepo | Share types, 1 repo, 1 PR | Coupling o framework level |
| **B** | Mixed Framework Services | Moi service dung framework khac nhau | Demo polyglot | x5 thoi gian, debug kho |
| **C** | NestJS Monorepo + Proto-first Design | Giong A nhung dinh nghia `.proto` truoc, generate TS types tu proto | Proto-first = contract-first. Type-safe end-to-end. Demo duoc methodology | Setup proto codegen ban dau mat thoi gian |

> **Chon: C — NestJS Monorepo + Proto-first Design**
> **Ly do:** Proto-first la best practice trong industry. Demo duoc methodology, khong chi technology. Type-safe end-to-end: Proto → Generated TS → NestJS services. Van giu REST API cho external clients (Gateway expose REST, noi bo gRPC).

---

## 1.10 Scope ngay hom nay

**Thong nhat:** Thiet ke toan bo backend + system:
- Service boundaries & responsibilities
- gRPC contracts (proto files)
- BullMQ job definitions
- Database schemas (Prisma) cho 3 PostgreSQL
- Core logic: SEO Rule Engine (20 rules chi tiet)
- Core logic: Crawler (Cheerio/Playwright/Lighthouse)
- Core logic: Keyword Analyzer
- Event flow (Hybrid Orchestration + Choreography)
- Docker Compose (9 containers)
- REST API endpoints (29 endpoints) + Swagger spec
- **Frontend: bo qua hom nay**

---

# 2. Architecture Overview

## 2.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL CLIENTS                            │
│                   (Browser, Mobile, 3rd-party)                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ REST + WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  GATEWAY SERVICE (port 3000 HTTP / 50051 gRPC)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Auth     │ │ Audit    │ │ User     │ │ Rate     │ │ WebSocket │ │
│  │ Module   │ │ Module   │ │ Module   │ │ Limiter  │ │ Gateway   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│  DB: PostgreSQL #1 (users, refresh_tokens, audits)                  │
│  Swagger UI: /api/docs                                              │
└───────┬──────────────┬───────────────┬──────────────────────────────┘
        │ BullMQ       │ gRPC          │ gRPC
        ▼              ▼               ▼
┌───────────────┐ ┌──────────────┐ ┌──────────────────┐
│ CRAWLER       │ │ SEO ANALYZER │ │ KEYWORD ANALYZER │
│ SERVICE       │ │ SERVICE      │ │ SERVICE          │
│ port 50052    │ │ port 50053   │ │ port 50054       │
│               │ │              │ │                  │
│ - Cheerio     │ │ - 20 Rules   │ │ - Tokenizer      │
│ - Playwright  │ │ - Score calc │ │ - TF calculator  │
│ - Lighthouse  │ │ - Rule CRUD  │ │ - Stopwords      │
│               │ │              │ │ - Density calc   │
│ DB: Redis     │ │ DB: PG #2    │ │ DB: Redis        │
│ (cache only)  │ │ (rules,      │ │ (cache only)     │
│               │ │  results)    │ │                  │
└───────┬───────┘ └──────┬───────┘ └────────┬─────────┘
        │ event          │ event             │ event
        └────────┬───────┘                   │
                 ▼                           ▼
        ┌─────────────────────────────────────────┐
        │ REPORT SERVICE                           │
        │ port 3004 (HTTP for PDF) / 50055 (gRPC)  │
        │                                          │
        │ - Aggregate scores                       │
        │ - Generate PDF (Playwright)              │
        │ - Share links                            │
        │                                          │
        │ DB: PostgreSQL #3 (reports, share_links)  │
        └──────────────────────────────────────────┘
```

## 2.2 Service Detail Table

| Service | Port(s) | Database | Stateful? | Vai tro |
|---------|---------|----------|-----------|---------|
| **Gateway** | 3000 (REST), 50051 (gRPC) | PostgreSQL #1 | Yes | Cong vao duy nhat. Auth JWT, rate limit, orchestrate audit pipeline, WebSocket progress, Swagger docs |
| **Crawler** | 50052 (gRPC) | Redis (cache) | No | Nhan URL → crawl HTML/DOM (Cheerio/Playwright) + chay Lighthouse → tra PageData + CWV metrics |
| **SEO Analyzer** | 50053 (gRPC) | PostgreSQL #2 | Yes | Nhan PageData → apply 20 rules → tra RuleResult[] + score. Admin CRUD rules/weights |
| **Keyword Analyzer** | 50054 (gRPC) | Redis (cache) | No | Nhan text content → tokenize → tinh TF, density, placement → tra KeywordResult[] |
| **Report** | 3004 (HTTP), 50055 (gRPC) | PostgreSQL #3 | Yes | Nhan results tu Analyzer + Keyword → aggregate score → persist → generate PDF → share links |

## 2.3 Tai sao Gateway expose ca REST lan gRPC?

- **REST (port 3000):** Cho external clients (Browser, Swagger UI, 3rd-party)
- **gRPC (port 50051):** Cho internal services goi nguoc lai (vi du: Report Service can query audit metadata tu Gateway)

## 2.4 Tai sao Report expose HTTP?

- PDF download can HTTP response voi `Content-Disposition: attachment`. gRPC khong phu hop cho binary file streaming lon.
- Gateway proxy request PDF: `GET /api/v1/audits/:id/export` → Gateway forward sang Report HTTP endpoint.

## 2.5 Monorepo Structure

```
seo-platform/
├── apps/
│   ├── gateway/            # NestJS, port 3000 (HTTP) + 50051 (gRPC)
│   ├── crawler/            # NestJS, port 50052 (gRPC only)
│   ├── seo-analyzer/       # NestJS, port 50053 (gRPC only)
│   ├── keyword-analyzer/   # NestJS, port 50054 (gRPC only)
│   └── report/             # NestJS, port 3004 (HTTP) + 50055 (gRPC)
├── packages/
│   ├── shared/             # Enums, constants, utility types
│   ├── proto/              # .proto files + generated TS interfaces + gRPC clients
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/                 # Frontend components (future)
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

# 3. Audit Pipeline

## 3.1 Hybrid Orchestration + Choreography Flow

```
Timeline ──────────────────────────────────────────────────────────────►

[User]          [Gateway]           [BullMQ]        [Crawler]       [Analyzer]     [Keyword]      [Report]
  │                 │                   │               │               │              │              │
  │─POST /audits──►│                   │               │               │              │              │
  │                 │──validate JWT─────│               │               │              │              │
  │                 │──check rate limit─│               │               │              │              │
  │                 │──INSERT audit─────│(status:pending)               │              │              │
  │                 │──enqueue─────────►│ crawl.start   │               │              │              │
  │◄─202 {auditId}─│                   │               │               │              │              │
  │                 │                   │               │               │              │              │
  │─Socket.IO──────│ join room(auditId)│               │               │              │              │
  │                 │                   │               │               │              │              │
  │     ┌───────────────────── ORCHESTRATION (Gateway controls) ──────────────────┐   │              │
  │     │           │                   │──pick job────►│               │              │              │
  │     │           │                   │               │─crawl URL     │              │              │
  │◄progress(20%)──│◄──audit.progress──│◄──emit────────│ (Cheerio/PW)  │              │              │
  │     │           │                   │               │─run Lighthouse│              │              │
  │◄progress(40%)──│◄──audit.progress──│◄──emit────────│               │              │              │
  │     │           │                   │               │               │              │              │
  │     │           │                   │◄─crawl.done───│ {PageData,CWV}│              │              │
  │     └───────────────────────────────────────────────────────────────┘              │              │
  │                 │                   │               │               │              │              │
  │     ┌───────────────────── CHOREOGRAPHY (Event-driven, parallel) ─────────────────┐              │
  │     │           │                   │               │               │              │              │
  │     │    BullMQ listener picks up crawl.done event                 │              │              │
  │     │           │                   │                              │              │              │
  │     │           │         ┌─enqueue─┤ analyze.start ──────────────►│              │              │
  │     │           │         │         │ keyword.start ──────────────►│──────────────►│              │
  │     │           │         │         │               │              │              │              │
  │     │           │         │ PARALLEL│               │─apply rules  │─tokenize     │              │
  │◄progress(60%)──│◄────────┤         │               │─calc scores  │─calc density │              │
  │     │           │         │         │               │              │              │              │
  │     │           │         │         │◄─analyze.done─│ {RuleResult[]}              │              │
  │     │           │         │         │◄─keyword.done─│──────────────│{KeywordResult[]}             │
  │     │           │         │         │               │              │              │              │
  │     │    Report listens for BOTH analyze.done AND keyword.done     │              │              │
  │     │    Only triggers when both completed for same auditId        │              │              │
  │     │           │         │         │               │              │              │              │
  │     │           │         └─────────┤ report.start ─│──────────────│──────────────►│              │
  │     └───────────────────────────────────────────────────────────────┘              │              │
  │                 │                   │               │               │              │              │
  │                 │                   │               │               │              │─aggregate    │
  │◄progress(80%)──│◄──audit.progress──│◄──────────────│───────────────│──────────────│─calc final   │
  │                 │                   │               │               │              │─persist to DB│
  │                 │                   │               │               │              │              │
  │                 │                   │◄─report.done──│───────────────│──────────────│{FinalReport} │
  │                 │                   │               │               │              │              │
  │                 │◄─gRPC: notify─────│───────────────│───────────────│──────────────│              │
  │                 │──UPDATE audit─────│(status:completed, seo_score)  │              │              │
  │◄─audit.completed(100%, score)──────│               │               │              │              │
  │                 │                   │               │               │              │              │
  │─GET /audits/:id►│──gRPC───────────►│───────────────│──────────────►│──────────────►│              │
  │◄─200 {full data}│◄─aggregate───────│───────────────│◄──────────────│◄─────────────│              │
```

## 3.2 BullMQ Queue Definitions

| Queue Name | Producer | Consumer | Job Payload | Retry | Concurrency |
|-----------|----------|----------|-------------|-------|-------------|
| `crawl.start` | Gateway | Crawler | `{auditId, url, options?}` | 3x, exponential backoff 5s | 3 |
| `analyze.start` | BullMQ event listener | SEO Analyzer | `{auditId, pageData, cwvMetrics}` | 2x, backoff 3s | 5 |
| `keyword.start` | BullMQ event listener | Keyword Analyzer | `{auditId, textContent, targetKeyword?, url}` | 2x, backoff 3s | 5 |
| `report.start` | BullMQ event listener | Report | `{auditId}` | 2x, backoff 3s | 3 |

## 3.3 Event Bus (Redis Pub/Sub)

| Event | Emitter | Listeners | Payload |
|-------|---------|-----------|---------|
| `crawl.done` | Crawler Worker | Gateway (progress), analyze.start producer, keyword.start producer | `{auditId, pageData, cwvMetrics, textContent}` |
| `crawl.failed` | Crawler Worker | Gateway (→ mark audit failed) | `{auditId, error}` |
| `analyze.done` | Analyzer Worker | Report (wait for both) | `{auditId, ruleResults[], categoryScores[]}` |
| `keyword.done` | Keyword Worker | Report (wait for both) | `{auditId, keywords[]}` |
| `report.done` | Report Worker | Gateway (→ update audit, emit Socket.IO) | `{auditId, finalScore, reportId}` |
| `audit.progress` | Any Worker | Gateway (→ Socket.IO to client) | `{auditId, progress%, stage, message?}` |

## 3.4 Report "Wait for Both" Pattern

Report Service dung **Redis counter** de biet khi nao ca 2 xong:

```
Key: audit:{auditId}:completed_steps
- Khi analyze.done → INCR → value = 1 → chua du
- Khi keyword.done → INCR → value = 2 → du! → trigger report.start
(hoac nguoc lai, thu tu khong quan trong)

TTL: 1 hour (cleanup neu pipeline stuck)
```

## 3.5 Failure Handling

| Failure | Detection | Action |
|---------|-----------|--------|
| Crawl timeout (>30s) | BullMQ job timeout | Retry 3x → mark audit 'failed' |
| Crawl HTTP 4xx/5xx | Crawler checks status code | Record as issue, continue analyze voi limited data |
| Analyzer crash | BullMQ job failed event | Retry 2x → mark audit 'failed' |
| Keyword crash | BullMQ job failed event | Retry 2x → Report proceeds without keyword data (degraded) |
| Report timeout | BullMQ job timeout | Retry 2x → audit stays 'completed' without report, user can retry PDF |
| One parallel job fails | Redis counter never reaches 2 | TTL 1h cleanup, Gateway marks 'failed' after timeout |

## 3.6 Progress Percentages

| Stage | Progress | Trigger |
|-------|----------|---------|
| Pending | 0% | Audit created |
| Crawling started | 10% | Crawler picks job |
| HTML fetched | 25% | Cheerio/Playwright done |
| Lighthouse done | 40% | CWV metrics collected |
| Analyzing (parallel) | 55% | Analyzer + Keyword started |
| Analysis done | 70% | analyze.done |
| Keywords done | 75% | keyword.done |
| Reporting | 85% | report.start |
| Completed | 100% | report.done |

---

# 4. gRPC Contracts

## 4.1 Package Structure

```
packages/proto/
  ├── buf.yaml                    # Buf build config
  ├── buf.gen.yaml                # Code generation config
  ├── crawler/v1/crawler.proto
  ├── analyzer/v1/analyzer.proto
  ├── keyword/v1/keyword.proto
  ├── report/v1/report.proto
  ├── common/v1/common.proto      # Shared messages
  └── generated/                  # Auto-generated TS code
```

## 4.2 common/v1/common.proto

```protobuf
syntax = "proto3";
package common.v1;

enum AuditStatus {
  AUDIT_STATUS_UNSPECIFIED = 0;
  AUDIT_STATUS_PENDING = 1;
  AUDIT_STATUS_CRAWLING = 2;
  AUDIT_STATUS_ANALYZING = 3;
  AUDIT_STATUS_REPORTING = 4;
  AUDIT_STATUS_COMPLETED = 5;
  AUDIT_STATUS_FAILED = 6;
}

enum CheckStatus {
  CHECK_STATUS_UNSPECIFIED = 0;
  CHECK_STATUS_PASS = 1;
  CHECK_STATUS_WARN = 2;
  CHECK_STATUS_FAIL = 3;
}

enum IssueCategory {
  ISSUE_CATEGORY_UNSPECIFIED = 0;
  ISSUE_CATEGORY_META = 1;
  ISSUE_CATEGORY_HEADINGS = 2;
  ISSUE_CATEGORY_IMAGES = 3;
  ISSUE_CATEGORY_LINKS = 4;
  ISSUE_CATEGORY_PERFORMANCE = 5;
  ISSUE_CATEGORY_TECHNICAL = 6;
}

message CoreWebVitals {
  double lcp_ms = 1;
  double inp_ms = 2;
  double cls = 3;
  int32 performance_score = 4;
  int32 accessibility_score = 5;
  int32 best_practices_score = 6;
  int32 seo_score = 7;
}

message ImageInfo {
  string src = 1;
  optional string alt = 2;
  int64 size_bytes = 3;
  string format = 4;
}

message LinkInfo {
  string href = 1;
  string anchor_text = 2;
  bool is_internal = 3;
  optional string rel = 4;
  int32 status_code = 5;
}
```

## 4.3 crawler/v1/crawler.proto

```protobuf
syntax = "proto3";
package crawler.v1;

import "common/v1/common.proto";

service CrawlerService {
  rpc CrawlUrl(CrawlRequest) returns (CrawlResponse);
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}

message CrawlRequest {
  string url = 1;
  string audit_id = 2;
  CrawlOptions options = 3;
}

message CrawlOptions {
  int32 timeout_ms = 1;
  bool force_playwright = 2;
  bool include_lighthouse = 3;
  string user_agent = 4;
}

message CrawlResponse {
  string audit_id = 1;
  PageData page_data = 2;
  common.v1.CoreWebVitals cwv_metrics = 3;
  CrawlMetadata metadata = 4;
}

message PageData {
  string url = 1;
  string final_url = 2;
  int32 status_code = 3;
  int64 response_time_ms = 4;
  int64 html_size_bytes = 5;

  optional string title = 6;
  optional string meta_description = 7;
  optional string meta_robots = 8;
  optional string canonical_url = 9;
  optional string language = 10;
  optional string favicon_url = 11;

  repeated string h1_tags = 20;
  repeated string h2_tags = 21;
  repeated string h3_tags = 22;
  repeated string h4_tags = 23;
  repeated string h5_tags = 24;
  repeated string h6_tags = 25;

  repeated common.v1.ImageInfo images = 30;
  repeated common.v1.LinkInfo internal_links = 31;
  repeated common.v1.LinkInfo external_links = 32;

  repeated string schema_json_ld = 40;
  map<string, string> open_graph = 41;
  map<string, string> twitter_card = 42;

  bool is_https = 50;
  repeated string redirect_chain = 51;
  string content_encoding = 52;
  string cache_control = 53;
  optional string viewport_content = 54;

  string text_content = 60;
  string raw_html = 61;
}

message CrawlMetadata {
  string crawler_type = 1;
  bool is_spa = 2;
  int64 crawl_duration_ms = 3;
  int64 lighthouse_duration_ms = 4;
  bool lighthouse_cached = 5;
}

message HealthCheckRequest {}
message HealthCheckResponse {
  bool healthy = 1;
  string version = 2;
  int64 uptime_seconds = 3;
}
```

## 4.4 analyzer/v1/analyzer.proto

```protobuf
syntax = "proto3";
package analyzer.v1;

import "common/v1/common.proto";
import "crawler/v1/crawler.proto";

service SeoAnalyzerService {
  rpc AnalyzePage(AnalyzeRequest) returns (AnalyzeResponse);
  rpc ListRules(ListRulesRequest) returns (ListRulesResponse);
  rpc UpdateRuleWeight(UpdateRuleWeightRequest) returns (UpdateRuleWeightResponse);
  rpc GetRulesByCategory(GetRulesByCategoryRequest) returns (ListRulesResponse);
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}

message AnalyzeRequest {
  string audit_id = 1;
  crawler.v1.PageData page_data = 2;
  optional string target_keyword = 3;
}

message AnalyzeResponse {
  string audit_id = 1;
  repeated RuleResult rule_results = 2;
  repeated CategoryScore category_scores = 3;
  double overall_score = 4;
  string classification = 5;
}

message RuleResult {
  string rule_id = 1;
  string rule_name = 2;
  common.v1.CheckStatus status = 3;
  double score = 4;
  int32 weight = 5;
  common.v1.IssueCategory category = 6;
  string message = 7;
  optional string suggestion = 8;
  map<string, string> metadata = 9;
}

message CategoryScore {
  common.v1.IssueCategory category = 1;
  double score = 2;
  int32 total_rules = 3;
  int32 passed = 4;
  int32 warned = 5;
  int32 failed = 6;
}

message SeoRule {
  string id = 1;
  string name = 2;
  string display_name = 3;
  string description = 4;
  common.v1.IssueCategory category = 5;
  int32 weight = 6;
  bool is_enabled = 7;
}

message ListRulesRequest {}
message ListRulesResponse { repeated SeoRule rules = 1; }
message UpdateRuleWeightRequest { string rule_id = 1; int32 new_weight = 2; }
message UpdateRuleWeightResponse { SeoRule rule = 1; }
message GetRulesByCategoryRequest { common.v1.IssueCategory category = 1; }
message HealthCheckRequest {}
message HealthCheckResponse { bool healthy = 1; string version = 2; }
```

## 4.5 keyword/v1/keyword.proto

```protobuf
syntax = "proto3";
package keyword.v1;

service KeywordAnalyzerService {
  rpc AnalyzeKeywords(KeywordRequest) returns (KeywordResponse);
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}

message KeywordRequest {
  string audit_id = 1;
  string text_content = 2;
  string url = 3;
  optional string title = 4;
  optional string h1_text = 5;
  optional string meta_description = 6;
  optional string target_keyword = 7;
  string language = 8;
}

message KeywordResponse {
  string audit_id = 1;
  repeated KeywordResult keywords = 2;
  int32 total_words = 3;
  int32 unique_words = 4;
  optional TargetKeywordAnalysis target_analysis = 5;
}

message KeywordResult {
  string keyword = 1;
  int32 frequency = 2;
  double density_percent = 3;
  bool in_title = 4;
  bool in_h1 = 5;
  bool in_first_paragraph = 6;
  bool in_meta_description = 7;
  int32 rank = 8;
}

message TargetKeywordAnalysis {
  string keyword = 1;
  int32 frequency = 2;
  double density_percent = 3;
  bool in_title = 4;
  bool in_h1 = 5;
  bool in_first_paragraph = 6;
  bool in_meta_description = 7;
  bool is_stuffing = 8;
  string verdict = 9;
}

message HealthCheckRequest {}
message HealthCheckResponse { bool healthy = 1; string version = 2; }
```

## 4.6 report/v1/report.proto

```protobuf
syntax = "proto3";
package report.v1;

import "analyzer/v1/analyzer.proto";
import "keyword/v1/keyword.proto";
import "common/v1/common.proto";

service ReportService {
  rpc GenerateReport(GenerateReportRequest) returns (GenerateReportResponse);
  rpc GetReport(GetReportRequest) returns (GetReportResponse);
  rpc CompareReports(CompareRequest) returns (CompareResponse);
  rpc CreateShareLink(CreateShareLinkRequest) returns (CreateShareLinkResponse);
  rpc GetSharedReport(GetSharedReportRequest) returns (GetReportResponse);
  rpc RevokeShareLink(RevokeShareLinkRequest) returns (RevokeShareLinkResponse);
  rpc GeneratePdf(GeneratePdfRequest) returns (GeneratePdfResponse);
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}

message GenerateReportRequest {
  string audit_id = 1;
  string url = 2;
  string domain = 3;
  analyzer.v1.AnalyzeResponse analysis = 4;
  keyword.v1.KeywordResponse keywords = 5;
  common.v1.CoreWebVitals cwv_metrics = 6;
}

message GenerateReportResponse {
  string report_id = 1;
  string audit_id = 2;
  double final_score = 3;
  string classification = 4;
  int32 total_issues = 5;
  int32 critical_issues = 6;
}

message GetReportRequest { string audit_id = 1; }

message GetReportResponse {
  string report_id = 1;
  string audit_id = 2;
  string url = 3;
  string domain = 4;
  double final_score = 5;
  string classification = 6;
  repeated analyzer.v1.RuleResult rule_results = 7;
  repeated analyzer.v1.CategoryScore category_scores = 8;
  repeated keyword.v1.KeywordResult keywords = 9;
  common.v1.CoreWebVitals cwv_metrics = 10;
  optional keyword.v1.TargetKeywordAnalysis target_keyword = 11;
  string created_at = 12;
}

message CompareRequest { string audit_id_1 = 1; string audit_id_2 = 2; }

message CompareResponse {
  double score_delta = 1;
  repeated RuleDelta rule_deltas = 2;
  repeated string issues_fixed = 3;
  repeated string issues_new = 4;
}

message RuleDelta {
  string rule_id = 1;
  string rule_name = 2;
  common.v1.CheckStatus status_before = 3;
  common.v1.CheckStatus status_after = 4;
  double score_delta = 5;
}

message CreateShareLinkRequest { string audit_id = 1; }
message CreateShareLinkResponse { string share_token = 1; string share_url = 2; }
message GetSharedReportRequest { string share_token = 1; }
message RevokeShareLinkRequest { string audit_id = 1; }
message RevokeShareLinkResponse { bool success = 1; }
message GeneratePdfRequest { string audit_id = 1; }
message GeneratePdfResponse { bytes pdf_content = 1; string filename = 2; int64 size_bytes = 3; }
message HealthCheckRequest {}
message HealthCheckResponse { bool healthy = 1; string version = 2; }
```

## 4.7 gRPC Call Matrix

| Caller → | Gateway | Crawler | Analyzer | Keyword | Report |
|----------|---------|---------|----------|---------|--------|
| **Gateway** | - | CrawlUrl | ListRules, UpdateRuleWeight | - | GetReport, CompareReports, CreateShareLink, RevokeShareLink, GeneratePdf |
| **Crawler** | - | - | - | - | - |
| **Analyzer** | - | - | - | - | - |
| **Keyword** | - | - | - | - | - |
| **Report** | - | - | - | - | - |

> Crawler, Analyzer, Keyword **khong goi gRPC** den service khac. Chung chi **nhan job qua BullMQ** va **emit events qua Redis Pub/Sub**.

---

# 5. Database Schemas & ERD

## 5.1 Overview

```
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│  PostgreSQL #1 (Gateway)    │  │  PostgreSQL #2 (Analyzer)   │  │  PostgreSQL #3 (Report)     │
│  seo_gateway                │  │  seo_analyzer               │  │  seo_report                 │
│                             │  │                             │  │                             │
│  ┌───────────────────┐      │  │  ┌───────────────────┐      │  │  ┌───────────────────┐      │
│  │ users             │      │  │  │ seo_rules         │      │  │  │ reports           │      │
│  ├───────────────────┤      │  │  ├───────────────────┤      │  │  ├───────────────────┤      │
│  │ refresh_tokens    │      │  │  │ rule_results      │      │  │  │ report_keywords   │      │
│  ├───────────────────┤      │  │  └───────────────────┘      │  │  ├───────────────────┤      │
│  │ audits            │      │  │                             │  │  │ report_cwv        │      │
│  └───────────────────┘      │  │                             │  │  ├───────────────────┤      │
│                             │  │                             │  │  │ share_links       │      │
│                             │  │                             │  │  └───────────────────┘      │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

## 5.2 PostgreSQL #1: Gateway DB

### ERD

```
┌──────────────────────────────────────────┐
│ users                                     │
├──────────────────────────────────────────┤
│ PK  id             UUID                  │
│     email          VARCHAR(255) UNIQUE    │
│     password_hash  VARCHAR(255) NULL      │
│     full_name      VARCHAR(100)           │
│     role           user_role ENUM         │
│     is_verified    BOOLEAN DEFAULT false  │
│     is_locked      BOOLEAN DEFAULT false  │
│     oauth_provider VARCHAR(50) NULL       │
│     avatar_url     VARCHAR(500) NULL      │
│     created_at     TIMESTAMPTZ            │
│     updated_at     TIMESTAMPTZ            │
├──────────────────────────────────────────┤
│ IDX  idx_users_email (email)             │
└──────────┬───────────────────────────────┘
           │ 1:N
┌──────────┴───────────────────────────────┐
│ refresh_tokens                            │
├──────────────────────────────────────────┤
│ PK  id             UUID                  │
│ FK  user_id        UUID → users.id       │
│     token_hash     VARCHAR(255)           │
│     user_agent     VARCHAR(500) NULL      │
│     ip_address     VARCHAR(45) NULL       │
│     expires_at     TIMESTAMPTZ            │
│     is_revoked     BOOLEAN DEFAULT false  │
│     created_at     TIMESTAMPTZ            │
├──────────────────────────────────────────┤
│ IDX  idx_rt_user (user_id)               │
│ IDX  idx_rt_token (token_hash)           │
│ IDX  idx_rt_expires (expires_at)         │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ audits                          (1:N from users)
├──────────────────────────────────────────┤
│ PK  id               UUID                │
│ FK  user_id           UUID → users.id    │
│     url               TEXT                │
│     domain            VARCHAR(255)        │
│     status            audit_status ENUM   │
│     seo_score         DECIMAL(5,2) NULL   │
│     target_keyword    VARCHAR(255) NULL   │
│     error_message     TEXT NULL           │
│     crawler_type      VARCHAR(20) NULL    │
│     crawl_duration_ms INT NULL            │
│     completed_at      TIMESTAMPTZ NULL    │
│     created_at        TIMESTAMPTZ         │
│     updated_at        TIMESTAMPTZ         │
├──────────────────────────────────────────┤
│ IDX  idx_audits_user_created             │
│      (user_id, created_at DESC)          │
│ IDX  idx_audits_domain (domain)          │
│ IDX  idx_audits_status (status)          │
└──────────────────────────────────────────┘
```

### Prisma Schema

```prisma
// apps/gateway/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("GATEWAY_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

enum UserRole {
  user
  admin
}

enum AuditStatus {
  pending
  crawling
  analyzing
  reporting
  completed
  failed
}

model User {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email         String   @unique @db.VarChar(255)
  passwordHash  String?  @map("password_hash") @db.VarChar(255)
  fullName      String   @map("full_name") @db.VarChar(100)
  role          UserRole @default(user)
  isVerified    Boolean  @default(false) @map("is_verified")
  isLocked      Boolean  @default(false) @map("is_locked")
  oauthProvider String?  @map("oauth_provider") @db.VarChar(50)
  avatarUrl     String?  @map("avatar_url") @db.VarChar(500)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz

  refreshTokens RefreshToken[]
  audits        Audit[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  tokenHash String   @map("token_hash") @db.VarChar(255)
  userAgent String?  @map("user_agent") @db.VarChar(500)
  ipAddress String?  @map("ip_address") @db.VarChar(45)
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  isRevoked Boolean  @default(false) @map("is_revoked")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], name: "idx_rt_user")
  @@index([tokenHash], name: "idx_rt_token")
  @@index([expiresAt], name: "idx_rt_expires")
  @@map("refresh_tokens")
}

model Audit {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String      @map("user_id") @db.Uuid
  url             String      @db.Text
  domain          String      @db.VarChar(255)
  status          AuditStatus @default(pending)
  seoScore        Decimal?    @map("seo_score") @db.Decimal(5, 2)
  targetKeyword   String?     @map("target_keyword") @db.VarChar(255)
  errorMessage    String?     @map("error_message") @db.Text
  crawlerType     String?     @map("crawler_type") @db.VarChar(20)
  crawlDurationMs Int?        @map("crawl_duration_ms")
  completedAt     DateTime?   @map("completed_at") @db.Timestamptz
  createdAt       DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime    @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)], name: "idx_audits_user_created")
  @@index([domain], name: "idx_audits_domain")
  @@index([status], name: "idx_audits_status")
  @@map("audits")
}
```

## 5.3 PostgreSQL #2: Analyzer DB

### ERD

```
┌──────────────────────────────────────────┐
│ seo_rules                                 │
├──────────────────────────────────────────┤
│ PK  id             UUID                  │
│     name           VARCHAR(100) UNIQUE   │
│     display_name   VARCHAR(100)          │
│     description    TEXT                   │
│     category       rule_category ENUM    │
│     weight         INT CHECK(1..10)      │
│     is_enabled     BOOLEAN DEFAULT true  │
│     check_config   JSONB NULL            │
│     created_at     TIMESTAMPTZ           │
│     updated_at     TIMESTAMPTZ           │
├──────────────────────────────────────────┤
│ IDX  idx_rules_category (category)       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ rule_results                              │
├──────────────────────────────────────────┤
│ PK  id             UUID                  │
│     audit_id       UUID (external ref)   │
│     rule_id        VARCHAR(100)          │
│     rule_name      VARCHAR(100)          │
│     category       rule_category ENUM    │
│     status         check_status ENUM     │
│     score          DECIMAL(5,2)          │
│     weight         INT                   │
│     message        TEXT                   │
│     suggestion     TEXT NULL              │
│     metadata       JSONB NULL            │
│     created_at     TIMESTAMPTZ           │
├──────────────────────────────────────────┤
│ IDX  idx_rr_audit (audit_id)             │
│ IDX  idx_rr_audit_status (audit_id,status)│
│ GIN  idx_rr_metadata (metadata)          │
└──────────────────────────────────────────┘
```

> **Note:** `rule_results.audit_id` la UUID tham chieu toi `audits.id` trong Gateway DB. Khong co FK constraint vi cross-database.

### Prisma Schema

```prisma
// apps/seo-analyzer/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("ANALYZER_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

enum RuleCategory {
  meta
  headings
  images
  links
  performance
  technical
}

enum CheckStatus {
  pass
  warn
  fail
}

model SeoRule {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String       @unique @db.VarChar(100)
  displayName String       @map("display_name") @db.VarChar(100)
  description String       @db.Text
  category    RuleCategory
  weight      Int          @db.Integer
  isEnabled   Boolean      @default(true) @map("is_enabled")
  checkConfig Json?        @map("check_config") @db.JsonB
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  @@index([category], name: "idx_rules_category")
  @@map("seo_rules")
}

model RuleResult {
  id         String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  auditId    String       @map("audit_id") @db.Uuid
  ruleId     String       @map("rule_id") @db.VarChar(100)
  ruleName   String       @map("rule_name") @db.VarChar(100)
  category   RuleCategory
  status     CheckStatus
  score      Decimal      @db.Decimal(5, 2)
  weight     Int          @db.Integer
  message    String       @db.Text
  suggestion String?      @db.Text
  metadata   Json?        @db.JsonB
  createdAt  DateTime     @default(now()) @map("created_at") @db.Timestamptz

  @@index([auditId], name: "idx_rr_audit")
  @@index([auditId, status], name: "idx_rr_audit_status")
  @@map("rule_results")
}
```

### Seed Data (20 Rules)

```typescript
const rules = [
  { name: 'title_tag',         displayName: 'Title Tag',          category: 'meta',        weight: 8  },
  { name: 'meta_description',  displayName: 'Meta Description',   category: 'meta',        weight: 7  },
  { name: 'h1_tag',            displayName: 'H1 Tag',             category: 'headings',    weight: 8  },
  { name: 'heading_hierarchy', displayName: 'Heading Hierarchy',  category: 'headings',    weight: 6  },
  { name: 'image_alt',         displayName: 'Image Alt Text',     category: 'images',      weight: 7  },
  { name: 'canonical_url',     displayName: 'Canonical URL',      category: 'technical',   weight: 5  },
  { name: 'robots_meta',       displayName: 'Robots Meta',        category: 'technical',   weight: 6  },
  { name: 'viewport_meta',     displayName: 'Viewport Meta',      category: 'technical',   weight: 10 },
  { name: 'https_check',       displayName: 'HTTPS',              category: 'technical',   weight: 10 },
  { name: 'open_graph',        displayName: 'Open Graph',         category: 'meta',        weight: 5  },
  { name: 'twitter_card',      displayName: 'Twitter Card',       category: 'meta',        weight: 3  },
  { name: 'schema_org',        displayName: 'Schema.org',         category: 'technical',   weight: 6  },
  { name: 'internal_links',    displayName: 'Internal Links',     category: 'links',       weight: 5  },
  { name: 'external_links',    displayName: 'External Links',     category: 'links',       weight: 3  },
  { name: 'image_optimization',displayName: 'Image Optimization', category: 'images',      weight: 5  },
  { name: 'page_size',         displayName: 'Page Size',          category: 'performance', weight: 4  },
  { name: 'http_status',       displayName: 'HTTP Status',        category: 'technical',   weight: 8  },
  { name: 'url_structure',     displayName: 'URL Structure',      category: 'technical',   weight: 4  },
  { name: 'language_tag',      displayName: 'Language Tag',       category: 'technical',   weight: 3  },
  { name: 'favicon',           displayName: 'Favicon',            category: 'technical',   weight: 2  },
];
```

## 5.4 PostgreSQL #3: Report DB

### ERD

```
┌──────────────────────────────────────────┐
│ reports                                   │
├──────────────────────────────────────────┤
│ PK  id               UUID                │
│     audit_id          UUID UNIQUE         │
│     url               TEXT                │
│     domain            VARCHAR(255)        │
│     final_score       DECIMAL(5,2)        │
│     classification    VARCHAR(20)         │
│     total_issues      INT                 │
│     critical_issues   INT                 │
│     warn_issues       INT                 │
│     pass_count        INT                 │
│     analysis_snapshot JSONB               │
│     cwv_snapshot      JSONB               │
│     created_at        TIMESTAMPTZ         │
└──────────┬───────────────────────────────┘
           │ 1:N                    1:1                   0..1
┌──────────┴──────────┐  ┌──────────┴──────────┐  ┌──────────┴──────────┐
│ report_keywords      │  │ report_cwv          │  │ share_links         │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ PK  id       UUID    │  │ PK  id       UUID   │  │ PK  id       UUID   │
│ FK  report_id UUID   │  │ FK  report_id UUID  │  │ FK  report_id UUID  │
│     keyword   VC(255)│  │     lcp_ms   DEC    │  │     audit_id  UUID  │
│     frequency INT    │  │     inp_ms   DEC    │  │     token     VC(64)│
│     density   DEC    │  │     cls      DEC    │  │     is_active BOOL  │
│     in_title  BOOL   │  │     perf_score INT  │  │     accessed_count  │
│     in_h1     BOOL   │  │     a11y_score INT  │  │     last_accessed   │
│     in_1st_p  BOOL   │  │     bp_score  INT   │  │     created_at      │
│     in_meta   BOOL   │  │     lh_seo   INT    │  └─────────────────────┘
│     rank      INT    │  └─────────────────────┘
│     is_target BOOL   │
└─────────────────────┘
```

> **Design decision:** Report DB luu `analysis_snapshot` (JSONB) = full copy cua analyzer results. Ly do: Report Service phai self-contained, khong can goi lai Analyzer khi user xem report. Day la **materialized view pattern** trong microservices.

### Prisma Schema

```prisma
// apps/report/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("REPORT_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

model Report {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  auditId          String   @unique @map("audit_id") @db.Uuid
  url              String   @db.Text
  domain           String   @db.VarChar(255)
  finalScore       Decimal  @map("final_score") @db.Decimal(5, 2)
  classification   String   @db.VarChar(20)
  totalIssues      Int      @map("total_issues")
  criticalIssues   Int      @map("critical_issues")
  warnIssues       Int      @map("warn_issues")
  passCount        Int      @map("pass_count")
  analysisSnapshot Json     @map("analysis_snapshot") @db.JsonB
  cwvSnapshot      Json     @map("cwv_snapshot") @db.JsonB
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  keywords  ReportKeyword[]
  cwv       ReportCwv?
  shareLink ShareLink?

  @@index([domain], name: "idx_reports_domain")
  @@map("reports")
}

model ReportKeyword {
  id                String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reportId          String  @map("report_id") @db.Uuid
  keyword           String  @db.VarChar(255)
  frequency         Int
  densityPercent    Decimal @map("density_percent") @db.Decimal(5, 2)
  inTitle           Boolean @map("in_title")
  inH1              Boolean @map("in_h1")
  inFirstParagraph  Boolean @map("in_first_paragraph")
  inMetaDescription Boolean @map("in_meta_description")
  rank              Int
  isTarget          Boolean @default(false) @map("is_target")

  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([reportId], name: "idx_rk_report")
  @@map("report_keywords")
}

model ReportCwv {
  id                   String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reportId             String  @unique @map("report_id") @db.Uuid
  lcpMs                Decimal @map("lcp_ms") @db.Decimal(10, 2)
  inpMs                Decimal @map("inp_ms") @db.Decimal(10, 2)
  cls                  Decimal @db.Decimal(5, 4)
  performanceScore     Int     @map("performance_score")
  accessibilityScore   Int     @map("accessibility_score")
  bestPracticesScore   Int     @map("best_practices_score")
  lighthouseSeoScore   Int     @map("lighthouse_seo_score")

  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
  @@map("report_cwv")
}

model ShareLink {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reportId       String    @unique @map("report_id") @db.Uuid
  auditId        String    @map("audit_id") @db.Uuid
  token          String    @unique @db.VarChar(64)
  isActive       Boolean   @default(true) @map("is_active")
  accessedCount  Int       @default(0) @map("accessed_count")
  lastAccessedAt DateTime? @map("last_accessed_at") @db.Timestamptz
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz

  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([auditId], name: "idx_sl_audit")
  @@map("share_links")
}
```

## 5.5 Cross-Database References

| Source Table | Field | References | Consistency |
|-------------|-------|-----------|-------------|
| `analyzer.rule_results.audit_id` | UUID | `gateway.audits.id` | App logic |
| `report.reports.audit_id` | UUID | `gateway.audits.id` | App logic |
| `report.share_links.audit_id` | UUID | `gateway.audits.id` | App logic |

> **Khong co cross-database FK constraints.** Data consistency dam bao bang application logic + scheduled cleanup job.

## 5.6 Redis Data Structures

| Key Pattern | Type | TTL | Purpose | Used by |
|------------|------|-----|---------|---------|
| `bull:crawl.start:*` | BullMQ internal | Job-based | Job queue | Gateway → Crawler |
| `bull:analyze.start:*` | BullMQ internal | Job-based | Job queue | Event → Analyzer |
| `bull:keyword.start:*` | BullMQ internal | Job-based | Job queue | Event → Keyword |
| `bull:report.start:*` | BullMQ internal | Job-based | Job queue | Event → Report |
| `lighthouse:{url_hash}` | String (JSON) | 1 hour | Cache Lighthouse results | Crawler |
| `crawl:{url_hash}` | String (JSON) | 30 min | Cache crawl results | Crawler |
| `audit:{auditId}:completed_steps` | Counter (INCR) | 1 hour | Track parallel completion | Event listeners |
| `audit:{auditId}:analyze_result` | String (JSON) | 1 hour | Store analyze result | Analyzer |
| `audit:{auditId}:keyword_result` | String (JSON) | 1 hour | Store keyword result | Keyword |
| `rate_limit:{userId}` | Sorted Set | Rolling 1h | Audit rate limiting | Gateway |

---

# 6. Core Logic — SEO Rule Engine

## 6.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│ SEO Analyzer Service                                 │
│                                                      │
│  ┌──────────────┐    ┌────────────────────────────┐ │
│  │ RuleRegistry │───►│ RuleRunner                  │ │
│  │ register()   │    │ runAll(pageData, rules[])   │ │
│  │ getEnabled() │    │   ├─ rule.check(pageData)   │ │
│  └──────────────┘    │   └─ calcCategoryScores()   │ │
│         ▲            └──────────┬─────────────────┘ │
│         │                       ▼                    │
│  ┌──────┴───────┐    ┌────────────────────────────┐ │
│  │ DB: seo_rules│    │ ScoreCalculator             │ │
│  └──────────────┘    │ weightedAverage(results[])  │ │
│                      │ classify(score) → label     │ │
│                      └────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## 6.2 Rule Interface

```typescript
interface ISeoRule {
  readonly id: string;
  readonly category: RuleCategory;
  check(pageData: PageData, targetKeyword?: string): RuleCheckOutput;
}

interface RuleCheckOutput {
  status: 'pass' | 'warn' | 'fail';
  score: number;    // 0 | 50 | 100
  message: string;
  suggestion: string | null;
  metadata: Record<string, any>;
}
```

## 6.3 All 20 Rules — Detailed Logic

### META Category (4 rules)

| # | Rule | Weight | PASS (100) | WARN (50) | FAIL (0) |
|---|------|--------|-----------|-----------|----------|
| 1 | `title_tag` | 8 | 50-60 chars | 30-49 or 61-70 chars | Missing or <30 or >70 |
| 2 | `meta_description` | 7 | 120-160 chars | 80-119 or 161-200 | Missing or <80 or >200 |
| 3 | `open_graph` | 5 | All 3 tags (og:title, og:description, og:image) | 1-2 present | None present |
| 4 | `twitter_card` | 3 | twitter:card present | - | Missing |

### HEADINGS Category (2 rules)

| # | Rule | Weight | PASS (100) | WARN (50) | FAIL (0) |
|---|------|--------|-----------|-----------|----------|
| 5 | `h1_tag` | 8 | Exactly 1 H1 (+ contains keyword if provided) | 1 H1 without keyword | 0 or >1 H1 |
| 6 | `heading_hierarchy` | 6 | Correct H1→H2→H3 order | Minor skip (H2→H4) | No headings or major issues |

### IMAGES Category (2 rules)

| # | Rule | Weight | PASS (100) | WARN (50) | FAIL (0) |
|---|------|--------|-----------|-----------|----------|
| 7 | `image_alt` | 7 | >90% images have alt | 70-90% have alt | <70% have alt |
| 8 | `image_optimization` | 5 | All <200KB, modern format | Some oversized/old format | Many issues |

### LINKS Category (2 rules)

| # | Rule | Weight | PASS (100) | WARN (50) | FAIL (0) |
|---|------|--------|-----------|-----------|----------|
| 9 | `internal_links` | 5 | >=3 internal links | 1-2 internal links | 0 internal links |
| 10 | `external_links` | 3 | All have rel=noopener or no ext links | Some missing rel | Broken external links |

### TECHNICAL Category (8 rules)

| # | Rule | Weight | PASS (100) | WARN (50) | FAIL (0) |
|---|------|--------|-----------|-----------|----------|
| 11 | `canonical_url` | 5 | Present, same domain | Present, different domain | Missing |
| 12 | `robots_meta` | 6 | index or absent | nofollow only | noindex |
| 13 | `viewport_meta` | 10 | Present with width=device-width | Present without width=dw | Missing |
| 14 | `https_check` | 10 | HTTPS | - | HTTP |
| 15 | `schema_org` | 6 | Has JSON-LD | - | No structured data |
| 16 | `http_status` | 8 | 200 | 301/302 | 4xx/5xx |
| 17 | `url_structure` | 4 | Short, clean, lowercase | Long or has query params | Multiple issues |
| 18 | `language_tag` | 3 | html lang present | - | Missing |
| 19 | `favicon` | 2 | Present | - | Missing |

### PERFORMANCE Category (1 rule)

| # | Rule | Weight | PASS (100) | WARN (50) | FAIL (0) |
|---|------|--------|-----------|-----------|----------|
| 20 | `page_size` | 4 | <2MB | 2-5MB | >5MB |

## 6.4 Score Calculation

```typescript
function calculateOverallScore(results: RuleCheckOutput[], rules: SeoRule[]): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  for (const result of results) {
    const rule = rules.find(r => r.id === result.ruleId);
    totalWeightedScore += result.score * rule.weight;
    totalWeight += rule.weight;
  }
  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

function classify(score: number): string {
  if (score >= 80) return 'excellent';  // green
  if (score >= 60) return 'good';       // blue
  if (score >= 40) return 'fair';       // yellow
  return 'poor';                        // red
}
```

---

# 7. Core Logic — Crawler Service

## 7.1 Decision Tree

```
crawlUrl(url, options)
  │
  ├─ 1. Validate URL (SSRF check)
  │     Block: localhost, 127.0.0.1, 10.x, 172.16-31.x, 192.168.x, [::1]
  │     Resolve DNS → re-check resolved IP
  │
  ├─ 2. Check cache: Redis "crawl:{sha256(url)}"
  │     Hit → return cached │  Miss → continue
  │
  ├─ 3. force_playwright? → goto Playwright path
  │
  ├─ 4. Cheerio Path (~200ms)
  │     axios.get(url, {timeout: 10000})
  │     ├─ SPA detected? → fallback Playwright
  │     └─ Static page → parse with Cheerio
  │
  ├─ 5. Playwright Path (~3-10s)
  │     Browser pool → page.goto(url, {waitUntil: 'networkidle', timeout: 30000})
  │
  ├─ 6. Lighthouse (if enabled)
  │     Check cache → miss → run lighthouse(url) → cache 1h
  │
  ├─ 7. Extract PageData fields
  │
  ├─ 8. Cache result 30min
  │
  └─ 9. Return {pageData, cwvMetrics, metadata}
```

## 7.2 SPA Detection Heuristics

```
body contains '<div id="root">' with minimal content (<500 chars)?
body contains '<div id="app">' with noscript warning?
body contains 'window.__NEXT_DATA__' but empty content?
→ SPA detected → fallback Playwright
```

## 7.3 Browser Pool

```typescript
class BrowserPool {
  private pool: Browser[] = [];
  private maxSize = 3;  // max concurrent browsers

  async acquire(): Promise<BrowserContext> { /* get/create browser, new incognito context */ }
  async release(browser: Browser): void { /* return to pool */ }
  async shutdown(): void { /* graceful close all */ }
}
```

---

# 8. Core Logic — Keyword Analyzer

## 8.1 Pipeline

```
analyzeKeywords(request)
  │
  ├─ 1. Detect language (Vietnamese chars → 'vi', else → 'en')
  ├─ 2. Tokenize (lowercase, remove punctuation, split whitespace, filter len >= 2)
  ├─ 3. Remove stopwords (EN ~170 words, VI ~180 words)
  ├─ 4. Calculate Term Frequency → Map<string, number>
  ├─ 5. Sort by frequency, take top 20
  ├─ 6. For each: calc density, check in_title/in_h1/in_first_paragraph/in_meta
  ├─ 7. Target keyword analysis:
  │     density < 0.5%  → 'low'
  │     1.0% - 3.0%     → 'optimal'
  │     3.0% - 5.0%     → 'high'
  │     > 5.0%           → 'stuffing'
  └─ 8. Return KeywordResponse
```

---

# 9. REST API Endpoints & Swagger Spec

## 9.1 Design Principles

- Base URL: `/api/v1`
- Auth: Bearer JWT in `Authorization` header
- Error format: RFC 7807
- Pagination: `?page=1&limit=20`
- Response: `{data[], meta: {total, page, limit, totalPages}}`

## 9.2 Complete Endpoint Table

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | POST | /auth/register | - | Dang ky |
| 2 | POST | /auth/login | - | Dang nhap |
| 3 | POST | /auth/refresh | Cookie | Refresh token |
| 4 | POST | /auth/logout | JWT | Dang xuat |
| 5 | GET | /auth/me | JWT | Current user |
| 6 | POST | /auth/verify-email | - | Verify email |
| 7 | POST | /auth/resend-verification | - | Resend verify |
| 8 | POST | /auth/forgot-password | - | Forgot password |
| 9 | POST | /auth/reset-password | - | Reset password |
| 10 | GET | /auth/google | - | OAuth redirect |
| 11 | GET | /auth/google/callback | - | OAuth callback |
| 12 | POST | /audits | JWT | Create audit |
| 13 | GET | /audits | JWT | List audits |
| 14 | GET | /audits/:id | JWT | Audit detail |
| 15 | GET | /audits/:id/status | JWT | Audit progress |
| 16 | DELETE | /audits/:id | JWT | Delete audit |
| 17 | GET | /audits/:id/export | JWT | Download PDF |
| 18 | GET | /audits/compare | JWT | Compare 2 audits |
| 19 | POST | /audits/:id/share | JWT | Create share link |
| 20 | DELETE | /audits/:id/share | JWT | Revoke share link |
| 21 | GET | /shared/audits/:token | - | View shared audit |
| 22 | PATCH | /users/profile | JWT | Update profile |
| 23 | PATCH | /users/password | JWT | Change password |
| 24 | GET | /admin/users | Admin | List users |
| 25 | PATCH | /admin/users/:id | Admin | Lock/unlock user |
| 26 | GET | /admin/rules | Admin | List rules |
| 27 | PUT | /admin/rules | Admin | Update weights |
| 28 | GET | /admin/stats | Admin | System stats |
| 29 | GET | /health | - | Health check |

**Total: 29 endpoints**

## 9.3 Detailed API Specs

### Authentication Endpoints

#### POST /api/v1/auth/register

- **Request:** `{email: string, fullName: string, password: string}`
- **Validation:** email format, fullName 2-100 chars, password >= 8 chars (1 uppercase + 1 number + 1 special)
- **Response 201:** `{user: UserPublic, message: "Dang ky thanh cong..."}`
- **Error 400:** Validation error with field-level details
- **Error 409:** Email da ton tai
- **Error 429:** Rate limit 5 registrations/IP/hour

#### POST /api/v1/auth/login

- **Request:** `{email: string, password: string}`
- **Response 200:** `{user: UserPublic, accessToken: string}` + Set-Cookie: refresh_token (HttpOnly, 7d)
- **Error 401:** "Email hoac mat khau khong dung" (generic, chong enumeration)
- **Error 403:** Chua verify email / da bi khoa
- **Error 429:** 10 attempts/email/15min

#### POST /api/v1/auth/refresh

- **Input:** refresh_token tu HttpOnly cookie
- **Response 200:** `{accessToken: string}`
- **Error 401:** Token het han hoac da revoke

#### POST /api/v1/auth/logout

- **Auth:** JWT
- **Action:** Revoke refresh token, xoa cookie
- **Response 200:** `{message: "Dang xuat thanh cong"}`

#### GET /api/v1/auth/me

- **Auth:** JWT
- **Response 200:** `UserPublic` object

#### POST /api/v1/auth/verify-email

- **Request:** `{token: string}`
- **Response 200:** `{message: "Email da duoc xac minh"}`
- **Error 400:** Token khong hop le hoac het han

#### POST /api/v1/auth/forgot-password

- **Request:** `{email: string}`
- **Response 200:** Luon tra 200 (chong enumeration)

#### POST /api/v1/auth/reset-password

- **Request:** `{token: string, newPassword: string}`
- **Response 200:** `{message: "Mat khau da duoc cap nhat"}`

### Audit Endpoints

#### POST /api/v1/audits

- **Auth:** JWT
- **Request:** `{url: string, targetKeyword?: string}`
- **URL Validation:** http/https, not localhost, not private IP (SSRF prevention)
- **Rate limit:** 10 audits/hour/user
- **Response 202:** `{auditId: uuid, status: "pending", message: "Audit da bat dau xu ly"}`
- **Error 429:** `{message: "Da dat gioi han...", retryAfter: seconds}`

#### GET /api/v1/audits

- **Auth:** JWT
- **Query params:** page, limit, sort (created_at|seo_score), order (asc|desc), search, status, scoreMin, scoreMax, dateFrom, dateTo
- **Response 200:** `{data: AuditSummary[], meta: PaginationMeta}`

#### GET /api/v1/audits/:id

- **Auth:** JWT (owner hoac admin)
- **Response 200:** `{audit: AuditDetail, results: RuleResultItem[], categoryScores[], keywords: KeywordItem[], cwv: CoreWebVitals, targetKeywordAnalysis?}`
- **Error 403/404**

#### GET /api/v1/audits/:id/status

- **Response 200:** `{auditId, status, progress (0-100), stage, seoScore?}`

#### DELETE /api/v1/audits/:id

- **Response 204** | **Error 400** (dang processing)

#### GET /api/v1/audits/:id/export?format=pdf

- **Response 200:** `application/pdf` binary stream
- **Header:** `Content-Disposition: attachment; filename="seo-report-{domain}-{date}.pdf"`
- **Error 400:** Audit chua completed

#### GET /api/v1/audits/compare?audit1=uuid&audit2=uuid

- **Response 200:** `{audit1Summary, audit2Summary, scoreDelta, ruleDeltas[], issuesFixed[], issuesNew[]}`
- **Error 400:** Khac domain hoac chua completed

#### POST /api/v1/audits/:id/share

- **Response 201:** `{shareToken, shareUrl}`
- **Error 409:** Share link da ton tai

### Admin Endpoints

#### GET /api/v1/admin/users

- **Auth:** Admin only
- **Query:** page, limit, search, role, isLocked
- **Response 200:** `{data: AdminUserItem[], meta: PaginationMeta}`

#### PATCH /api/v1/admin/users/:id

- **Request:** `{isLocked: boolean}`
- **Error 400:** Admin khong the lock chinh minh

#### GET /api/v1/admin/rules

- **Proxy:** gRPC → Analyzer.ListRules
- **Response 200:** `{rules: SeoRuleItem[]}`

#### PUT /api/v1/admin/rules

- **Request:** `{rules: [{name: string, weight: 1-10}]}`
- **Proxy:** gRPC → Analyzer.UpdateRuleWeight (for each)

#### GET /api/v1/admin/stats?period=30d

- **Response 200:** `{overview: {totalUsers, totalAudits, successRate, avgCrawlTimeMs, avgSeoScore}, newUsersToday, auditsToday, auditsByDay[], scoreDistribution, topDomains[]}`

### Health Endpoint

#### GET /api/v1/health

- **Response 200:** `{status: "ok", version, uptime, services: {database, redis, crawler, analyzer, keyword, report}}`

## 9.4 Swagger Component Schemas

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    UserPublic:
      properties: { id, email, fullName, role, isVerified, avatarUrl, createdAt }

    AdminUserItem:
      extends: UserPublic
      properties: { isLocked, oauthProvider, auditCount, lastAuditAt }

    AuditSummary:
      properties: { id, url, domain, status, seoScore, targetKeyword, crawlerType, crawlDurationMs, createdAt, completedAt }

    AuditDetail:
      extends: AuditSummary
      properties: { classification, errorMessage }

    RuleResultItem:
      properties: { ruleId, ruleName, category, status, score, weight, message, suggestion, metadata }

    CategoryScore:
      properties: { category, score, totalRules, passed, warned, failed }

    KeywordItem:
      properties: { keyword, frequency, densityPercent, inTitle, inH1, inFirstParagraph, inMetaDescription, rank, isTarget }

    CoreWebVitals:
      properties: { lcpMs, inpMs, cls, performanceScore, accessibilityScore, bestPracticesScore, lighthouseSeoScore }

    SeoRuleItem:
      properties: { id, name, displayName, description, category, weight, isEnabled }

    PaginationMeta:
      properties: { total, page, limit, totalPages }

    ApiError:
      properties: { statusCode, error, message, details[], requestId }
```

---

# 10. Docker Compose

```yaml
# docker-compose.yml — 9 containers

services:
  # ─── Databases ───
  gateway-db:
    image: postgres:16-alpine
    container_name: seo-gateway-db
    environment:
      POSTGRES_USER: gateway_user
      POSTGRES_PASSWORD: gateway_pass
      POSTGRES_DB: seo_gateway
    ports: ["5432:5432"]
    volumes: [gateway_db_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gateway_user -d seo_gateway"]
      interval: 5s
      timeout: 5s
      retries: 5

  analyzer-db:
    image: postgres:16-alpine
    container_name: seo-analyzer-db
    environment:
      POSTGRES_USER: analyzer_user
      POSTGRES_PASSWORD: analyzer_pass
      POSTGRES_DB: seo_analyzer
    ports: ["5433:5432"]
    volumes: [analyzer_db_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U analyzer_user -d seo_analyzer"]
      interval: 5s
      timeout: 5s
      retries: 5

  report-db:
    image: postgres:16-alpine
    container_name: seo-report-db
    environment:
      POSTGRES_USER: report_user
      POSTGRES_PASSWORD: report_pass
      POSTGRES_DB: seo_report
    ports: ["5434:5432"]
    volumes: [report_db_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U report_user -d seo_report"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: seo-redis
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ─── Services ───
  gateway:
    build:
      context: .
      dockerfile: apps/gateway/Dockerfile
    container_name: seo-gateway
    ports:
      - "3000:3000"    # REST + Swagger
      - "50051:50051"  # gRPC
    environment:
      - GATEWAY_DATABASE_URL=postgresql://gateway_user:gateway_pass@gateway-db:5432/seo_gateway
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-jwt-secret-here
      - GOOGLE_CLIENT_ID=your-google-client-id
      - GOOGLE_CLIENT_SECRET=your-google-client-secret
      - CRAWLER_GRPC_URL=crawler:50052
      - ANALYZER_GRPC_URL=seo-analyzer:50053
      - KEYWORD_GRPC_URL=keyword-analyzer:50054
      - REPORT_GRPC_URL=report:50055
      - REPORT_HTTP_URL=http://report:3004
    depends_on:
      gateway-db: { condition: service_healthy }
      redis: { condition: service_healthy }

  crawler:
    build:
      context: .
      dockerfile: apps/crawler/Dockerfile
    container_name: seo-crawler
    ports: ["50052:50052"]
    environment:
      - REDIS_URL=redis://redis:6379
      - GRPC_PORT=50052
    depends_on:
      redis: { condition: service_healthy }

  seo-analyzer:
    build:
      context: .
      dockerfile: apps/seo-analyzer/Dockerfile
    container_name: seo-analyzer
    ports: ["50053:50053"]
    environment:
      - ANALYZER_DATABASE_URL=postgresql://analyzer_user:analyzer_pass@analyzer-db:5432/seo_analyzer
      - REDIS_URL=redis://redis:6379
      - GRPC_PORT=50053
    depends_on:
      analyzer-db: { condition: service_healthy }
      redis: { condition: service_healthy }

  keyword-analyzer:
    build:
      context: .
      dockerfile: apps/keyword-analyzer/Dockerfile
    container_name: seo-keyword-analyzer
    ports: ["50054:50054"]
    environment:
      - REDIS_URL=redis://redis:6379
      - GRPC_PORT=50054
    depends_on:
      redis: { condition: service_healthy }

  report:
    build:
      context: .
      dockerfile: apps/report/Dockerfile
    container_name: seo-report
    ports:
      - "3004:3004"    # HTTP (PDF download)
      - "50055:50055"  # gRPC
    environment:
      - REPORT_DATABASE_URL=postgresql://report_user:report_pass@report-db:5432/seo_report
      - REDIS_URL=redis://redis:6379
      - GRPC_PORT=50055
      - HTTP_PORT=3004
    depends_on:
      report-db: { condition: service_healthy }
      redis: { condition: service_healthy }

volumes:
  gateway_db_data:
  analyzer_db_data:
  report_db_data:
  redis_data:
```

### Container Summary

| # | Container | Image | Ports | Purpose |
|---|-----------|-------|-------|---------|
| 1 | seo-gateway-db | postgres:16-alpine | 5432 | Gateway database |
| 2 | seo-analyzer-db | postgres:16-alpine | 5433 | Analyzer database |
| 3 | seo-report-db | postgres:16-alpine | 5434 | Report database |
| 4 | seo-redis | redis:7-alpine | 6379 | Cache + BullMQ + Pub/Sub |
| 5 | seo-gateway | NestJS custom | 3000, 50051 | API Gateway |
| 6 | seo-crawler | NestJS custom | 50052 | Crawler + Lighthouse |
| 7 | seo-analyzer | NestJS custom | 50053 | SEO Rule Engine |
| 8 | seo-keyword-analyzer | NestJS custom | 50054 | Keyword Analyzer |
| 9 | seo-report | NestJS custom | 3004, 50055 | Report + PDF |

**Total: 9 containers** — Khoi dong: `docker-compose up -d`

---

> **End of Design Document**
> Next step: Implementation planning via writing-plans skill
