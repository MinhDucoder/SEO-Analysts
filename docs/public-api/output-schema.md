# Output schema

Every `POST /public/check` response follows this shape:

```jsonc
{
  "score": 78,                             // 0–100 composite
  "scoreBreakdown": {
    "content": 85, "meta": 70, "technical": 72, "accessibility": 88
  },
  "issues": [
    {
      "ruleId": "title-length",
      "severity": "warning",               // "error" | "warning" | "info"
      "category": "meta",                  // content | meta | technical | accessibility | headings | images | links
      "audience": ["writer"],              // subset of ["writer", "dev"]
      "title": "Title quá ngắn",
      "description": "Title có 25 ký tự, khuyến nghị 50-60.",
      "evidence": { "current": "Cách viết SEO", "currentLength": 25 },
      "suggestion": {
        "type": "rewrite",                 // rewrite | add | remove | reorder
        "text": "Cách viết SEO 2026: hướng dẫn chi tiết cho beginner",
        "rationale": "Thêm năm và đối tượng để tăng tính thời sự"
      },
      "docRef": "https://docs/rules/title-length"
    }
  ],
  "summary": {                             // only when options.includeSummary=true
    "writer": "Bài đang thiếu từ khóa chính ở H1 và title hơi ngắn…",
    "dev": "Meta title length + H1 keyword relevance là 2 blocker…"
  },
  "meta": {
    "inputType": "url",
    "resolvedUrl": "https://draft.example/post-123",
    "contentStats": { "words": 1243, "characters": 8420, "readingTimeSec": 312 },
    "processingTimeMs": 876,
    "ruleVersion": "1.2.0",
    "enrichMode": "llm",
    "suggestionSource": "llm",             // llm | template | mixed | none
    "degraded": false,                     // true when LLM was requested but not delivered
    "cached": false,
    "requestId": "req_01HW9…",
    "usage": {
      "remaining": { "minute": 17, "day": 482 },
      "resetAt": { "minute": "2026-04-22T14:08:00Z", "day": "2026-04-23T00:00:00Z" }
    }
  }
}
```

## Field-by-field

### `score`

Integer 0–100. Weighted average of rule scores (each rule is 0 / 50 / 100).

### `scoreBreakdown`

Object keyed by rule category. Each value is 0–100 computed from rules in that category.

### `issues[].severity`

- `error` — blocks good SEO (e.g., missing title, missing H1)
- `warning` — sub-optimal (e.g., title too short)
- `info` — nice-to-have

### `issues[].suggestion`

Null when `enrichMode=off`. When present:
- `type=rewrite` replaces the offending span
- `type=add` prepends content
- `type=remove` deletes matching span
- `type=reorder` (advisory only — no automatic patch)

### `meta.suggestionSource`

- `llm` — all suggestions from the LLM
- `template` — all suggestions from rule templates (default fallback)
- `mixed` — LLM produced some, template filled gaps
- `none` — `enrichMode=off`

### `meta.degraded`

`true` when `enrichMode=llm` was requested but the server fell back to template (no API key, timeout, concurrency cap, etc.). Response is **still 200 OK** — you never need to special-case this as a failure.

## Rate-limit headers

Every response also carries:

```
X-RateLimit-Limit-Minute: 20
X-RateLimit-Remaining-Minute: 17
X-RateLimit-Limit-Day: 500
X-RateLimit-Remaining-Day: 482
X-Request-Id: req_01HW9…
X-Rule-Version: 1.2.0
```
