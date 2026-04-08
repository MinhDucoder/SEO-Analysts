# Data Flow

## 1. Authentication Flow

```
User -> Login/Register page (Next.js)
       |
   POST /api/auth/login (email+password) or /api/auth/google (OAuth)
       |
   AuthService (@Injectable) -> bcrypt verify / Google OAuth validate
       |
   JWT issued (access_token: 24h, refresh_token: 7d)
       |
   Frontend stores in localStorage/cookie -> attach to API requests
       |
   JwtAuthGuard (@UseGuards) -> validate on protected routes
```

**Guest access:**
```
No auth -> AuthGuard allows guest -> Reduced rules (subset of 20)
Authenticated -> Full 20 SEO rules + history + PDF export
```

## 2. Audit Submission Flow

```
User enters URL -> URL validation (frontend + backend)
       |
   POST /api/audits { url: "https://example.com" }
       |
   AuditController -> ValidationPipe (DTO) + ThrottlerGuard (rate limit)
       |
   Duplicate detection: same URL within 5 minutes -> return cached result
       |
   AuditService -> @InjectQueue -> Create Bull job (audit-queue)
       |
   Response: { jobId: "uuid", status: "queued" }
       |
   Frontend -> Redirect to /audit/{jobId} -> Connect Socket.IO
```

## 3. Audit Pipeline (Worker)

```
Bull Queue -> AuditProcessor (@Processor) picks up job
       |
   Phase 1: CRAWL (@Process('seo-audit'))
     CrawlerService.crawl(url)
       -> HTTP fetch + Cheerio parse (default)
       -> If body text < 100 chars -> Playwright fallback (JS rendering)
       -> Respect robots.txt (500ms delay between requests)
       -> Extract: title, meta tags, headings, images, links, schema.org, headers
     Socket.IO emit: { stage: "crawling", progress: 20 }
       |
   Phase 2: ANALYZE
     RuleRegistryService.runAll(pageData)
       -> Technical SEO (7 rules): robots, sitemap, canonical, HTTPS, redirects, schema, meta robots
       -> On-Page SEO (6 rules): title, meta description, H1, image alt, internal links
       -> Performance (5 rules): TTFB, page size, external requests, compression, cache headers
       -> Content (2 rules): word count, readability
     Socket.IO emit: { stage: "analyzing", progress: 50 }
       |
   Phase 3: LIGHTHOUSE
     LighthouseService.run(url)
       -> Programmatic Lighthouse (headless Chrome, 60s timeout)
       -> Extract: LCP, CLS, INP, TTFB, Performance score
       -> Fallback: skip + flag if unavailable
     Socket.IO emit: { stage: "scoring", progress: 70 }
       |
   Phase 4: SCORE
     ScoreCalculator.calculate(issues, lighthouseScore)
       -> Weighted average: Technical 30%, On-Page 35%, Performance 20%, Content 15%
       -> Overall score: 0-100
     PriorityRanker.rank(issues)
       -> Priority = impact_weight x (10 - fix_difficulty)
     Socket.IO emit: { stage: "scoring", progress: 85 }
       |
   Phase 5: REPORT
     ReportService.generate(auditResult)
       -> Aggregate: overall score, category scores, issues + fix recommendations
       -> Save to PostgreSQL: audit_results, pages
     Socket.IO emit: { stage: "completed", progress: 100, resultId: "uuid" }
```

## 4. Real-Time Progress Flow (Socket.IO)

```
Frontend connects: socket.emit("join-audit", { jobId })
       |
   @WebSocketGateway -> Join room: `audit:${jobId}`
       |
   AuditProcessor (@Processor) emits progress events:
     { stage: "queued", progress: 0 }
     { stage: "crawling", progress: 20 }
     { stage: "analyzing", progress: 50 }
     { stage: "scoring", progress: 70 }
     { stage: "generating_report", progress: 85 }
     { stage: "completed", progress: 100 }
     { stage: "failed", error: "reason" }
       |
   Frontend ProgressTracker component updates UI in real-time
       |
   On "completed" -> Auto-redirect to results page
   On "failed" -> Show error + retry button
```

## 5. Results Display Flow

```
GET /api/audits/:id -> AuditController -> AuditService
       |
   Prisma query: audit_jobs JOIN audit_results JOIN pages
       |
   Response: {
     job: { id, url, status, created_at },
     result: {
       overall_score: 72,
       category_scores: { technical: 80, onPage: 65, performance: 70, content: 75 },
       issues: [
         { rule: "meta-description", severity: "warning", message: "...", fix: "..." }
       ]
     }
   }
       |
   Frontend renders:
     - ScoreGauge (circular, color-coded: green/yellow/red)
     - CategoryScores (bar chart)
     - IssuesExplorer (grouped by category, filterable by severity)
     - PDF download button
```

## 6. PDF Report Flow

```
GET /api/audits/:id/report/pdf -> ReportController
       |
   ReportService.generatePDF(auditResult)
       -> Render HTML template with scores + issues
       -> Puppeteer / @react-pdf/renderer -> PDF binary
       |
   Response: PDF file download (Content-Type: application/pdf)
```

## 7. Rate Limiting Flow

```
Request -> ThrottlerGuard (NestJS @nestjs/throttler)
       |
   Redis check: key = `rate:${ip}` or `rate:${userId}`
       |
   Guest: 5 audits/hour
   Authenticated: 50 audits/hour
       |
   Over limit -> HTTP 429 Too Many Requests
```

## 8. Database Schema

```
users
  ├── id (UUID, PK)
  ├── email (unique)
  ├── password_hash
  ├── provider (local | google)
  └── created_at

audit_jobs
  ├── id (UUID, PK)
  ├── user_id (FK -> users, nullable for guests)
  ├── url
  ├── status (queued | crawling | analyzing | scoring | completed | failed)
  ├── progress (0-100)
  ├── created_at
  └── completed_at

audit_results
  ├── id (UUID, PK)
  ├── job_id (FK -> audit_jobs)
  ├── overall_score (0-100)
  ├── category_scores (JSON)
  ├── issues (JSON)
  └── metadata (JSON)

pages
  ├── id (UUID, PK)
  ├── job_id (FK -> audit_jobs)
  ├── url
  ├── html_size
  ├── response_time
  ├── status_code
  └── extracted_data (JSON)
```

## 9. Caching Strategy

```
Redis caching:
  - Audit results: cache for 5 minutes (duplicate detection)
  - Rate limit counters: TTL per window
  - Lighthouse results: cache for 1 hour per URL
  - robots.txt: cache for 24 hours per domain
```
