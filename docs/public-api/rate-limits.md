# Rate limits

Public API is billed per request against four buckets.

| Bucket | Limit | Window |
|---|---|---|
| Per key / minute | 20 | 60s sliding |
| Per key / day | 500 | 24h (UTC reset) |
| LLM concurrency per key | 5 | instant |
| Per IP / minute | 100 | 60s sliding (anti-brute) |

## Headers on every response

```
X-RateLimit-Limit-Minute: 20
X-RateLimit-Remaining-Minute: 17
X-RateLimit-Limit-Day: 500
X-RateLimit-Remaining-Day: 482
```

## 429 behavior

```
HTTP/1.1 429 Too Many Requests
Retry-After: 35
X-RateLimit-Remaining-Minute: 0
```

Back off for `Retry-After` seconds, then retry. Do not retry faster than the header indicates — repeated 429s may trip the per-IP brute bucket.

## Daily cap semantics

Daily usage resets at **00:00 UTC** regardless of your local timezone. Plan batch jobs with that in mind.

## Concurrency cap

`enrichMode=llm` is capped at **5 simultaneous requests per key**. Excess requests degrade to `template` (200 OK, `meta.degraded=true`) rather than 429, so your integration stays functional.

## Roadmap

Tiered plans (higher limits, annual billing) are planned post-MVP. Until then every key gets the same free-tier quota.
