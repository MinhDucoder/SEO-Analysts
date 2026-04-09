# Plan 1: Foundation — Monorepo Setup, Proto, Schemas, Service Scaffolding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the complete monorepo foundation so that Plans 2-6 can build each service independently.

**Architecture:** Turborepo monorepo with 5 NestJS apps (gateway, crawler, seo-analyzer, keyword-analyzer, report), 1 proto package for gRPC contracts, 1 shared package for types/enums. Each service that needs a database gets its own Prisma schema. Docker Compose runs 9 containers (3 PostgreSQL + 1 Redis + 5 services).

**Tech Stack:** Turborepo, NestJS 10, TypeScript 5, Prisma 5, gRPC (@grpc/grpc-js + @grpc/proto-loader), BullMQ 5, Redis 7, PostgreSQL 16, Docker Compose, Vitest

**Reference Spec:** `docs/superpowers/specs/2026-04-09-microservices-architecture-design.md`

---

## File Structure

```
seo-platform/
├── apps/
│   ├── gateway/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # users, refresh_tokens, audits
│   │   │   └── seed.ts                # admin user seed
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   └── prisma/
│   │   │       ├── prisma.module.ts
│   │   │       └── prisma.service.ts
│   │   └── test/
│   │       └── app.e2e-spec.ts
│   ├── crawler/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   └── test/
│   │       └── app.e2e-spec.ts
│   ├── seo-analyzer/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # seo_rules, rule_results
│   │   │   └── seed.ts                # 20 SEO rules
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   └── prisma/
│   │   │       ├── prisma.module.ts
│   │   │       └── prisma.service.ts
│   │   └── test/
│   │       └── app.e2e-spec.ts
│   ├── keyword-analyzer/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   └── test/
│   │       └── app.e2e-spec.ts
│   └── report/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       ├── prisma/
│       │   ├── schema.prisma          # reports, report_keywords, report_cwv, share_links
│       │   └── seed.ts
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   └── prisma/
│       │       ├── prisma.module.ts
│       │       └── prisma.service.ts
│       └── test/
│           └── app.e2e-spec.ts
├── packages/
│   ├── proto/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── common/v1/common.proto
│   │   ├── crawler/v1/crawler.proto
│   │   ├── analyzer/v1/analyzer.proto
│   │   ├── keyword/v1/keyword.proto
│   │   ├── report/v1/report.proto
│   │   └── src/
│   │       └── index.ts               # re-export proto paths + loader helper
│   ├── shared/
│   │   ├── package.json               # existing, will update
│   │   └── src/
│   │       └── index.ts               # existing, will rewrite to match proto enums
│   ├── eslint-config/                 # existing, will add NestJS config
│   │   └── nestjs.js                  # new
│   └── typescript-config/             # existing, will add node config
│       └── nestjs.json                # new
├── docker-compose.yml                 # rewrite: 9 containers
├── turbo.json                         # update: add test, prisma tasks
└── package.json                       # update: add workspace scripts
```

---

## Task 1: Update Turborepo Config & Root Package

**Files:**
- Modify: `turbo.json`
- Modify: `package.json`
- Create: `packages/typescript-config/nestjs.json`
- Create: `packages/eslint-config/nestjs.js`

- [ ] **Step 1: Add NestJS TypeScript config**

Create `packages/typescript-config/nestjs.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- [ ] **Step 2: Add NestJS ESLint config**

Create `packages/eslint-config/nestjs.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
```

- [ ] **Step 3: Update turbo.json — add test, prisma, proto tasks**

Replace `turbo.json` with:

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build", "proto:generate"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "test/**", "vitest.config.*"],
      "outputs": ["coverage/**"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "prisma:generate": {
      "cache": false
    },
    "prisma:migrate": {
      "cache": false
    },
    "prisma:seed": {
      "cache": false
    },
    "proto:generate": {
      "inputs": ["packages/proto/**/*.proto"],
      "outputs": ["packages/proto/src/generated/**"]
    }
  }
}
```

- [ ] **Step 4: Update root package.json — add convenience scripts**

Add to `scripts` in `package.json`:

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "dev:gateway": "turbo run dev --filter=@seo/gateway",
    "dev:crawler": "turbo run dev --filter=@seo/crawler",
    "dev:analyzer": "turbo run dev --filter=@seo/seo-analyzer",
    "dev:keyword": "turbo run dev --filter=@seo/keyword-analyzer",
    "dev:report": "turbo run dev --filter=@seo/report",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "check-types": "turbo run check-types",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:reset": "docker compose down -v && docker compose up -d",
    "prisma:migrate": "turbo run prisma:migrate",
    "prisma:seed": "turbo run prisma:seed",
    "prepare": "husky"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add turbo.json package.json packages/typescript-config/nestjs.json packages/eslint-config/nestjs.js
git commit -m "chore: add NestJS configs and update turborepo tasks"
```

---

## Task 2: Docker Compose — 9 Containers

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Rewrite docker-compose.yml**

Replace `docker-compose.yml` with:

```yaml
services:
  # ─── Databases ───
  gateway-db:
    image: postgres:16-alpine
    container_name: seo-gateway-db
    environment:
      POSTGRES_USER: gateway_user
      POSTGRES_PASSWORD: gateway_pass
      POSTGRES_DB: seo_gateway
    ports:
      - "5432:5432"
    volumes:
      - gateway_db_data:/var/lib/postgresql/data
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
    ports:
      - "5433:5432"
    volumes:
      - analyzer_db_data:/var/lib/postgresql/data
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
    ports:
      - "5434:5432"
    volumes:
      - report_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U report_user -d seo_report"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: seo-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  gateway_db_data:
  analyzer_db_data:
  report_db_data:
  redis_data:
```

> Note: Service containers (gateway, crawler, etc.) will be added in Plan 7 (Integration) after all services are built. For now we only need infrastructure containers for local development.

- [ ] **Step 2: Verify Docker Compose starts**

```bash
docker compose up -d
docker compose ps
```

Expected: 4 containers running (gateway-db, analyzer-db, report-db, redis), all healthy.

- [ ] **Step 3: Verify connectivity**

```bash
docker compose exec gateway-db psql -U gateway_user -d seo_gateway -c "SELECT 1;"
docker compose exec analyzer-db psql -U analyzer_user -d seo_analyzer -c "SELECT 1;"
docker compose exec report-db psql -U report_user -d seo_report -c "SELECT 1;"
docker compose exec redis redis-cli ping
```

Expected: All return success (1 / PONG).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "infra: docker-compose with 3 PostgreSQL + 1 Redis"
```

---

## Task 3: Proto Package — gRPC Contracts

**Files:**
- Create: `packages/proto/package.json`
- Create: `packages/proto/tsconfig.json`
- Create: `packages/proto/common/v1/common.proto`
- Create: `packages/proto/crawler/v1/crawler.proto`
- Create: `packages/proto/analyzer/v1/analyzer.proto`
- Create: `packages/proto/keyword/v1/keyword.proto`
- Create: `packages/proto/report/v1/report.proto`
- Create: `packages/proto/src/index.ts`

- [ ] **Step 1: Create package.json**

Create `packages/proto/package.json`:

```json
{
  "name": "@repo/proto",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.12.0",
    "@grpc/proto-loader": "^0.7.13"
  },
  "devDependencies": {
    "@repo/typescript-config": "*",
    "typescript": "^5.9.2"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `packages/proto/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create common.proto**

Create `packages/proto/common/v1/common.proto`:

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

- [ ] **Step 4: Create crawler.proto**

Create `packages/proto/crawler/v1/crawler.proto`:

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

- [ ] **Step 5: Create analyzer.proto**

Create `packages/proto/analyzer/v1/analyzer.proto`:

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

- [ ] **Step 6: Create keyword.proto**

Create `packages/proto/keyword/v1/keyword.proto`:

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

- [ ] **Step 7: Create report.proto**

Create `packages/proto/report/v1/report.proto`:

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

- [ ] **Step 8: Create proto loader helper**

Create `packages/proto/src/index.ts`:

```typescript
import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_ROOT = path.join(__dirname, '..');

const LOADER_OPTIONS: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [PROTO_ROOT],
};

export function loadProto(protoFile: string): grpc.GrpcObject {
  const protoPath = path.join(PROTO_ROOT, protoFile);
  const packageDefinition = protoLoader.loadSync(protoPath, LOADER_OPTIONS);
  return grpc.loadPackageDefinition(packageDefinition);
}

export const PROTO_FILES = {
  COMMON: 'common/v1/common.proto',
  CRAWLER: 'crawler/v1/crawler.proto',
  ANALYZER: 'analyzer/v1/analyzer.proto',
  KEYWORD: 'keyword/v1/keyword.proto',
  REPORT: 'report/v1/report.proto',
} as const;

export { grpc };
```

- [ ] **Step 9: Install dependencies and verify**

```bash
cd packages/proto && npm install
```

- [ ] **Step 10: Commit**

```bash
git add packages/proto/
git commit -m "feat: add proto package with gRPC contracts for all 5 services"
```

---

## Task 4: Update Shared Package

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Rewrite shared/src/index.ts to align with proto enums**

Replace `packages/shared/src/index.ts` with:

```typescript
// ─── Enums (mirror proto enums for use in TypeScript code) ───

export enum AuditStatus {
  PENDING = 'pending',
  CRAWLING = 'crawling',
  ANALYZING = 'analyzing',
  REPORTING = 'reporting',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CheckStatus {
  PASS = 'pass',
  WARN = 'warn',
  FAIL = 'fail',
}

export enum IssueCategory {
  META = 'meta',
  HEADINGS = 'headings',
  IMAGES = 'images',
  LINKS = 'links',
  PERFORMANCE = 'performance',
  TECHNICAL = 'technical',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum Classification {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

// ─── Shared Interfaces ───

export interface CoreWebVitals {
  lcpMs: number;
  inpMs: number;
  cls: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
}

export interface ImageInfo {
  src: string;
  alt: string | null;
  sizeBytes: number;
  format: string;
}

export interface LinkInfo {
  href: string;
  anchorText: string;
  isInternal: boolean;
  rel: string | null;
  statusCode: number;
}

export interface RuleCheckOutput {
  status: CheckStatus;
  score: number;
  message: string;
  suggestion: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditProgressEvent {
  auditId: string;
  status: AuditStatus;
  progress: number;
  stage: string;
  message?: string;
}

// ─── Constants ───

export const RATE_LIMIT = {
  AUDIT_PER_HOUR: 10,
  API_PER_MINUTE: 60,
  REGISTER_PER_HOUR: 5,
  LOGIN_ATTEMPTS_PER_15MIN: 10,
} as const;

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES: '15m',
  REFRESH_TOKEN_EXPIRES_DAYS: 7,
} as const;

export const CACHE_TTL = {
  LIGHTHOUSE_SECONDS: 3600,
  CRAWL_SECONDS: 1800,
  AUDIT_RESULT_SECONDS: 3600,
} as const;

export const BULLMQ_QUEUES = {
  CRAWL_START: 'crawl.start',
  ANALYZE_START: 'analyze.start',
  KEYWORD_START: 'keyword.start',
  REPORT_START: 'report.start',
} as const;

export const REDIS_KEYS = {
  lighthouseCache: (urlHash: string) => `lighthouse:${urlHash}`,
  crawlCache: (urlHash: string) => `crawl:${urlHash}`,
  auditCompletedSteps: (auditId: string) => `audit:${auditId}:completed_steps`,
  auditAnalyzeResult: (auditId: string) => `audit:${auditId}:analyze_result`,
  auditKeywordResult: (auditId: string) => `audit:${auditId}:keyword_result`,
  rateLimit: (userId: string) => `rate_limit:${userId}`,
} as const;

// ─── Utility Functions ───

export function classify(score: number): Classification {
  if (score >= 80) return Classification.EXCELLENT;
  if (score >= 60) return Classification.GOOD;
  if (score >= 40) return Classification.FAIR;
  return Classification.POOR;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/
git commit -m "refactor: rewrite shared package to align with proto enums and design spec"
```

---

## Task 5: Scaffold Gateway Service

**Files:**
- Create: `apps/gateway/package.json`
- Create: `apps/gateway/tsconfig.json`
- Create: `apps/gateway/nest-cli.json`
- Create: `apps/gateway/.env.example`
- Create: `apps/gateway/src/main.ts`
- Create: `apps/gateway/src/app.module.ts`
- Create: `apps/gateway/prisma/schema.prisma`
- Create: `apps/gateway/prisma/seed.ts`
- Create: `apps/gateway/src/prisma/prisma.module.ts`
- Create: `apps/gateway/src/prisma/prisma.service.ts`

- [ ] **Step 1: Create package.json**

Create `apps/gateway/package.json`:

```json
{
  "name": "@seo/gateway",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "eslint .",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.3.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/microservices": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/swagger": "^8.1.0",
    "@nestjs/websockets": "^10.4.0",
    "@nestjs/platform-socket.io": "^10.4.0",
    "@nestjs/bullmq": "^10.2.0",
    "@grpc/grpc-js": "^1.12.0",
    "@grpc/proto-loader": "^0.7.13",
    "@prisma/client": "^5.22.0",
    "@repo/shared": "*",
    "@repo/proto": "*",
    "bcrypt": "^5.1.1",
    "bullmq": "^5.25.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "ioredis": "^5.4.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/jwt": "^10.2.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "socket.io": "^4.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@repo/typescript-config": "*",
    "@types/bcrypt": "^5.0.2",
    "@types/passport-jwt": "^4.0.1",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.2",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `apps/gateway/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create nest-cli.json**

Create `apps/gateway/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: Create .env.example**

Create `apps/gateway/.env.example`:

```env
# Database
GATEWAY_DATABASE_URL=postgresql://gateway_user:gateway_pass@localhost:5432/seo_gateway

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-me-in-production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# gRPC Service URLs
CRAWLER_GRPC_URL=localhost:50052
ANALYZER_GRPC_URL=localhost:50053
KEYWORD_GRPC_URL=localhost:50054
REPORT_GRPC_URL=localhost:50055

# Report HTTP
REPORT_HTTP_URL=http://localhost:3004

# App
PORT=3000
GRPC_PORT=50051
NODE_ENV=development
```

- [ ] **Step 5: Create Prisma schema**

Create `apps/gateway/prisma/schema.prisma`:

```prisma
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

- [ ] **Step 6: Create seed.ts**

Create `apps/gateway/prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@seo-analyst.com' },
    update: {},
    create: {
      email: 'admin@seo-analyst.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Admin',
      role: UserRole.admin,
      isVerified: true,
    },
  });

  console.log('Gateway seed completed: admin user created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 7: Create PrismaService**

Create `apps/gateway/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Create `apps/gateway/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 8: Create app.module.ts**

Create `apps/gateway/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 9: Create main.ts**

Create `apps/gateway/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SEO Analyst Platform API')
    .setDescription('API Gateway for SEO analysis microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Gateway running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
```

- [ ] **Step 10: Run Prisma migrate and verify**

```bash
cp apps/gateway/.env.example apps/gateway/.env
cd apps/gateway && npx prisma generate && npx prisma migrate dev --name init
```

Expected: Migration created, Prisma Client generated.

- [ ] **Step 11: Commit**

```bash
git add apps/gateway/
git commit -m "feat: scaffold gateway service with Prisma schema and Swagger"
```

---

## Task 6: Scaffold SEO Analyzer Service (with DB)

**Files:**
- Create: `apps/seo-analyzer/package.json`
- Create: `apps/seo-analyzer/tsconfig.json`
- Create: `apps/seo-analyzer/nest-cli.json`
- Create: `apps/seo-analyzer/.env.example`
- Create: `apps/seo-analyzer/src/main.ts`
- Create: `apps/seo-analyzer/src/app.module.ts`
- Create: `apps/seo-analyzer/prisma/schema.prisma`
- Create: `apps/seo-analyzer/prisma/seed.ts`
- Create: `apps/seo-analyzer/src/prisma/prisma.module.ts`
- Create: `apps/seo-analyzer/src/prisma/prisma.service.ts`

- [ ] **Step 1: Create package.json**

Create `apps/seo-analyzer/package.json`:

```json
{
  "name": "@seo/seo-analyzer",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint .",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/microservices": "^10.4.0",
    "@nestjs/bullmq": "^10.2.0",
    "@grpc/grpc-js": "^1.12.0",
    "@grpc/proto-loader": "^0.7.13",
    "@prisma/client": "^5.22.0",
    "@repo/shared": "*",
    "@repo/proto": "*",
    "bullmq": "^5.25.0",
    "ioredis": "^5.4.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@repo/typescript-config": "*",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.2",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json, nest-cli.json, .env.example**

Create `apps/seo-analyzer/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/seo-analyzer/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

Create `apps/seo-analyzer/.env.example`:

```env
ANALYZER_DATABASE_URL=postgresql://analyzer_user:analyzer_pass@localhost:5433/seo_analyzer
REDIS_URL=redis://localhost:6379
GRPC_PORT=50053
NODE_ENV=development
```

- [ ] **Step 3: Create Prisma schema**

Create `apps/seo-analyzer/prisma/schema.prisma`:

```prisma
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

- [ ] **Step 4: Create seed.ts with 20 rules**

Create `apps/seo-analyzer/prisma/seed.ts`:

```typescript
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const rules = [
  { name: 'title_tag',          displayName: 'Title Tag',          category: 'meta' as const,        weight: 8,  description: 'Kiem tra ton tai va do dai title (50-60 ky tu)' },
  { name: 'meta_description',   displayName: 'Meta Description',   category: 'meta' as const,        weight: 7,  description: 'Kiem tra do dai meta description (120-160 ky tu)' },
  { name: 'h1_tag',             displayName: 'H1 Tag',             category: 'headings' as const,    weight: 8,  description: 'Dung 1 H1, chua tu khoa chinh' },
  { name: 'heading_hierarchy',  displayName: 'Heading Hierarchy',  category: 'headings' as const,    weight: 6,  description: 'H1->H2->H3 dung thu tu, khong bo cap' },
  { name: 'image_alt',          displayName: 'Image Alt Text',     category: 'images' as const,      weight: 7,  description: 'Moi img phai co alt attribute' },
  { name: 'canonical_url',      displayName: 'Canonical URL',      category: 'technical' as const,   weight: 5,  description: 'Trang co the rel=canonical' },
  { name: 'robots_meta',        displayName: 'Robots Meta',        category: 'technical' as const,   weight: 6,  description: 'Khong vo tinh noindex' },
  { name: 'viewport_meta',      displayName: 'Viewport Meta',      category: 'technical' as const,   weight: 10, description: 'Co meta viewport cho mobile' },
  { name: 'https_check',        displayName: 'HTTPS',              category: 'technical' as const,   weight: 10, description: 'Trang phuc vu qua HTTPS' },
  { name: 'open_graph',         displayName: 'Open Graph',         category: 'meta' as const,        weight: 5,  description: 'Du og:title, og:description, og:image' },
  { name: 'twitter_card',       displayName: 'Twitter Card',       category: 'meta' as const,        weight: 3,  description: 'Co the twitter:card' },
  { name: 'schema_org',         displayName: 'Schema.org',         category: 'technical' as const,   weight: 6,  description: 'Co JSON-LD structured data' },
  { name: 'internal_links',     displayName: 'Internal Links',     category: 'links' as const,       weight: 5,  description: 'Du internal link (>=3) va khong gay' },
  { name: 'external_links',     displayName: 'External Links',     category: 'links' as const,       weight: 3,  description: 'External link co rel phu hop' },
  { name: 'image_optimization', displayName: 'Image Optimization', category: 'images' as const,      weight: 5,  description: 'Anh dung WebP/AVIF, < 200KB' },
  { name: 'page_size',          displayName: 'Page Size',          category: 'performance' as const, weight: 4,  description: 'Tong dung luong < 2MB' },
  { name: 'http_status',        displayName: 'HTTP Status',        category: 'technical' as const,   weight: 8,  description: 'Trang tra ve 200' },
  { name: 'url_structure',      displayName: 'URL Structure',      category: 'technical' as const,   weight: 4,  description: 'URL ngan, co tu khoa, dung dau gach ngang' },
  { name: 'language_tag',       displayName: 'Language Tag',       category: 'technical' as const,   weight: 3,  description: 'html lang duoc khai bao' },
  { name: 'favicon',            displayName: 'Favicon',            category: 'technical' as const,   weight: 2,  description: 'Co favicon.ico hoac link rel=icon' },
];

async function main() {
  for (const rule of rules) {
    await prisma.seoRule.upsert({
      where: { name: rule.name },
      update: { weight: rule.weight, description: rule.description },
      create: rule,
    });
  }
  console.log(`Analyzer seed completed: ${rules.length} SEO rules created`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 5: Create PrismaService, PrismaModule, AppModule, main.ts**

Create `apps/seo-analyzer/src/prisma/prisma.service.ts` (same pattern as gateway):

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

Create `apps/seo-analyzer/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

Create `apps/seo-analyzer/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
})
export class AppModule {}
```

Create `apps/seo-analyzer/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: ['analyzer.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/analyzer/v1/analyzer.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50053}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../..', 'packages/proto')],
      },
    },
  });
  await app.listen();
  console.log(`SEO Analyzer gRPC service running on port ${process.env.GRPC_PORT || 50053}`);
}
bootstrap();
```

- [ ] **Step 6: Run Prisma migrate + seed**

```bash
cp apps/seo-analyzer/.env.example apps/seo-analyzer/.env
cd apps/seo-analyzer && npx prisma generate && npx prisma migrate dev --name init && npx ts-node prisma/seed.ts
```

Expected: 20 rules seeded.

- [ ] **Step 7: Commit**

```bash
git add apps/seo-analyzer/
git commit -m "feat: scaffold seo-analyzer service with Prisma schema and 20 rules seed"
```

---

## Task 7: Scaffold Crawler Service (stateless, Redis only)

**Files:**
- Create: `apps/crawler/package.json`
- Create: `apps/crawler/tsconfig.json`
- Create: `apps/crawler/nest-cli.json`
- Create: `apps/crawler/.env.example`
- Create: `apps/crawler/src/main.ts`
- Create: `apps/crawler/src/app.module.ts`

- [ ] **Step 1: Create package.json**

Create `apps/crawler/package.json`:

```json
{
  "name": "@seo/crawler",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint .",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/microservices": "^10.4.0",
    "@nestjs/bullmq": "^10.2.0",
    "@grpc/grpc-js": "^1.12.0",
    "@grpc/proto-loader": "^0.7.13",
    "@repo/shared": "*",
    "@repo/proto": "*",
    "axios": "^1.7.0",
    "bullmq": "^5.25.0",
    "cheerio": "^1.0.0",
    "ioredis": "^5.4.1",
    "playwright": "^1.48.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@repo/typescript-config": "*",
    "typescript": "^5.9.2",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json, nest-cli.json, .env.example**

Create `apps/crawler/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "baseUrl": "./" },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/crawler/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

Create `apps/crawler/.env.example`:

```env
REDIS_URL=redis://localhost:6379
GRPC_PORT=50052
NODE_ENV=development
```

- [ ] **Step 3: Create app.module.ts and main.ts**

Create `apps/crawler/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

Create `apps/crawler/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: ['crawler.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/crawler/v1/crawler.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50052}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../..', 'packages/proto')],
      },
    },
  });
  await app.listen();
  console.log(`Crawler gRPC service running on port ${process.env.GRPC_PORT || 50052}`);
}
bootstrap();
```

- [ ] **Step 4: Commit**

```bash
git add apps/crawler/
git commit -m "feat: scaffold crawler service (stateless, gRPC)"
```

---

## Task 8: Scaffold Keyword Analyzer Service (stateless, Redis only)

**Files:**
- Create: `apps/keyword-analyzer/package.json`
- Create: `apps/keyword-analyzer/tsconfig.json`
- Create: `apps/keyword-analyzer/nest-cli.json`
- Create: `apps/keyword-analyzer/.env.example`
- Create: `apps/keyword-analyzer/src/main.ts`
- Create: `apps/keyword-analyzer/src/app.module.ts`

- [ ] **Step 1: Create all files**

Create `apps/keyword-analyzer/package.json`:

```json
{
  "name": "@seo/keyword-analyzer",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint .",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/microservices": "^10.4.0",
    "@nestjs/bullmq": "^10.2.0",
    "@grpc/grpc-js": "^1.12.0",
    "@grpc/proto-loader": "^0.7.13",
    "@repo/shared": "*",
    "@repo/proto": "*",
    "bullmq": "^5.25.0",
    "ioredis": "^5.4.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@repo/typescript-config": "*",
    "typescript": "^5.9.2",
    "vitest": "^2.1.0"
  }
}
```

Create `apps/keyword-analyzer/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "baseUrl": "./" },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/keyword-analyzer/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

Create `apps/keyword-analyzer/.env.example`:

```env
REDIS_URL=redis://localhost:6379
GRPC_PORT=50054
NODE_ENV=development
```

Create `apps/keyword-analyzer/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

Create `apps/keyword-analyzer/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: ['keyword.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/keyword/v1/keyword.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50054}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../..', 'packages/proto')],
      },
    },
  });
  await app.listen();
  console.log(`Keyword Analyzer gRPC service running on port ${process.env.GRPC_PORT || 50054}`);
}
bootstrap();
```

- [ ] **Step 2: Commit**

```bash
git add apps/keyword-analyzer/
git commit -m "feat: scaffold keyword-analyzer service (stateless, gRPC)"
```

---

## Task 9: Scaffold Report Service (with DB)

**Files:**
- Create: `apps/report/package.json`
- Create: `apps/report/tsconfig.json`
- Create: `apps/report/nest-cli.json`
- Create: `apps/report/.env.example`
- Create: `apps/report/src/main.ts`
- Create: `apps/report/src/app.module.ts`
- Create: `apps/report/prisma/schema.prisma`
- Create: `apps/report/src/prisma/prisma.module.ts`
- Create: `apps/report/src/prisma/prisma.service.ts`

- [ ] **Step 1: Create package.json**

Create `apps/report/package.json`:

```json
{
  "name": "@seo/report",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint .",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/microservices": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/bullmq": "^10.2.0",
    "@grpc/grpc-js": "^1.12.0",
    "@grpc/proto-loader": "^0.7.13",
    "@prisma/client": "^5.22.0",
    "@repo/shared": "*",
    "@repo/proto": "*",
    "bullmq": "^5.25.0",
    "ioredis": "^5.4.1",
    "playwright": "^1.48.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@repo/typescript-config": "*",
    "prisma": "^5.22.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.2",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json, nest-cli.json, .env.example**

Create `apps/report/tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "baseUrl": "./" },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/report/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

Create `apps/report/.env.example`:

```env
REPORT_DATABASE_URL=postgresql://report_user:report_pass@localhost:5434/seo_report
REDIS_URL=redis://localhost:6379
GRPC_PORT=50055
HTTP_PORT=3004
NODE_ENV=development
```

- [ ] **Step 3: Create Prisma schema**

Create `apps/report/prisma/schema.prisma`:

```prisma
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

- [ ] **Step 4: Create PrismaService, PrismaModule, AppModule**

Create `apps/report/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

Create `apps/report/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

Create `apps/report/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 5: Create main.ts (hybrid: gRPC + HTTP)**

Create `apps/report/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // HTTP app for PDF download
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['report.v1'],
      protoPath: [join(__dirname, '../../..', 'packages/proto/report/v1/report.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT || 50055}`,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, '../../..', 'packages/proto')],
      },
    },
  });

  await app.startAllMicroservices();

  const httpPort = process.env.HTTP_PORT || 3004;
  await app.listen(httpPort);
  console.log(`Report HTTP service running on port ${httpPort}`);
  console.log(`Report gRPC service running on port ${process.env.GRPC_PORT || 50055}`);
}
bootstrap();
```

- [ ] **Step 6: Run Prisma migrate**

```bash
cp apps/report/.env.example apps/report/.env
cd apps/report && npx prisma generate && npx prisma migrate dev --name init
```

- [ ] **Step 7: Commit**

```bash
git add apps/report/
git commit -m "feat: scaffold report service with Prisma schema (hybrid gRPC + HTTP)"
```

---

## Task 10: Install All Dependencies & Verify Monorepo

- [ ] **Step 1: Install all workspace dependencies**

```bash
cd /media/minhducoder/New\ Volume2/Learn_On_Drive/DO_AN
npm install
```

- [ ] **Step 2: Verify turbo can see all workspaces**

```bash
npx turbo run check-types --dry
```

Expected: Lists all 9 packages (@seo/gateway, @seo/crawler, @seo/seo-analyzer, @seo/keyword-analyzer, @seo/report, @repo/shared, @repo/proto, @repo/ui, @repo/eslint-config).

- [ ] **Step 3: Verify Docker infra is running**

```bash
docker compose ps
```

Expected: 4 containers healthy (gateway-db, analyzer-db, report-db, redis).

- [ ] **Step 4: Run all Prisma migrations**

```bash
cd apps/gateway && npx prisma migrate dev --name init
cd ../seo-analyzer && npx prisma migrate dev --name init
cd ../report && npx prisma migrate dev --name init
```

- [ ] **Step 5: Run seo-analyzer seed**

```bash
cd apps/seo-analyzer && npx ts-node prisma/seed.ts
```

Expected: "Analyzer seed completed: 20 SEO rules created"

- [ ] **Step 6: Run gateway seed**

```bash
cd apps/gateway && npx ts-node prisma/seed.ts
```

Expected: "Gateway seed completed: admin user created"

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: install dependencies and verify monorepo setup"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `docker compose ps` shows 4 healthy infra containers
- [ ] `npx turbo run check-types` passes for all packages
- [ ] Gateway DB has `users`, `refresh_tokens`, `audits` tables
- [ ] Analyzer DB has `seo_rules` (20 rows), `rule_results` tables
- [ ] Report DB has `reports`, `report_keywords`, `report_cwv`, `share_links` tables
- [ ] Redis is reachable at localhost:6379
- [ ] Proto files exist for all 5 services under `packages/proto/`
- [ ] Shared package exports enums, interfaces, constants
- [ ] All 5 service `main.ts` files exist and reference correct proto files

---

## What Comes Next

This plan produces a **working foundation**. The following plans build on top:

| Next Plan | What it builds |
|-----------|---------------|
| Plan 2: Gateway Service | Auth, Audit CRUD, Admin, WebSocket, Rate limiting, Swagger |
| Plan 3: Crawler Service | Cheerio + Playwright + Lighthouse, BullMQ worker |
| Plan 4: SEO Analyzer | 20 rules engine, scoring, gRPC controller |
| Plan 5: Keyword Analyzer | Tokenizer, density, gRPC controller |
| Plan 6: Report Service | Aggregation, PDF, share links, comparison |
| Plan 7: Integration | Pipeline wiring, E2E tests, full docker-compose |
