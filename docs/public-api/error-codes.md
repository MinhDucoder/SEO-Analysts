# Error codes

Every non-2xx response uses a consistent shape:

```json
{
  "statusCode": 422,
  "error": "ValidationError",
  "code": "INPUT_TYPE_MISMATCH",
  "message": "input.type=\"url\" but input.url is missing",
  "requestId": "req_01HW9…",
  "details": [{ "field": "input.url", "issue": "required when input.type=\"url\"" }]
}
```

Dispatch on `code` — it's stable across versions; `message` is human-readable and may change.

## Table

| HTTP | code | When |
|---|---|---|
| 400 | `INVALID_JSON` | Body is not parseable JSON |
| 401 | `MISSING_API_KEY` | No `Authorization` header |
| 401 | `INVALID_API_KEY` | Format wrong / revoked / unknown |
| 403 | `KEY_DISABLED` | Key exists but associated account is locked |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 200 KB |
| 422 | `INPUT_TYPE_MISMATCH` | `input.type` doesn't match the payload field |
| 422 | `INVALID_URL` | Bad URL, private IP, or SSRF reject |
| 422 | `INVALID_MARKDOWN` | Markdown parser error |
| 422 | `MISSING_TARGET_KEYWORD` | `targetKeyword` absent or empty |
| 424 | `URL_FETCH_FAILED` | Target site returned 4xx/5xx |
| 424 | `URL_FETCH_TIMEOUT` | Target site timeout (>10s) |
| 429 | `RATE_LIMIT_EXCEEDED` | Bucket exhausted. Include `Retry-After` header. |
| 500 | `INTERNAL` | Unexpected gateway error |
| 502 | `ANALYZER_UNAVAILABLE` | gRPC analyzer down |
| 502 | `CRAWLER_UNAVAILABLE` | gRPC crawler down (URL input only) |
| 503 | `SERVICE_UNAVAILABLE` | Maintenance / circuit-breaker open |

## LLM failure is never an error

`enrichMode=llm` degrading to `template` returns **200 OK** with `meta.degraded: true`. Do not treat this as an error.

## Idempotency

Optionally include `Idempotency-Key: <uuid>` to deduplicate retries within 24h.
