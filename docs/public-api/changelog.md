# Changelog

## v0.3 — 2026-04-XX (Plan 3)

**DX surfaces.** No API-surface changes.

- Added: `apps/web/` — Next.js 14 app (auth flow, playground, settings/api-keys)
- Added: `packages/seo-check-cli/` — workspace-local CLI (`seo-check`)
- Added: `docs/public-api/` — 8 narrative markdown files + this changelog

## v0.2 — 2026-04-23 (Plan 2)

**LLM enrichment.**

- `enrichMode=llm` produces LLM-written suggestions instead of degrading to template
- New internal package `@repo/seo-ai-core` (LLM facade + prompt loader + output parser + BaseChain)
- Added `SuggestionEnricherService` with Redis cache (`suggest:<hash>`, TTL 1h) and per-key concurrency cap (5)
- On LLM timeout / schema violation / missing key: graceful degrade to template with `meta.degraded=true` (200 OK)

## v0.1 — 2026-04-22 (Plan 1)

**Foundation.**

- `POST /api/v1/public/check` with URL / Markdown / HTML input
- `enrichMode=off` / `template`; `llm` shimmed to template degrade
- API-key CRUD at `/api/v1/users/me/api-keys`
- Rate limits (20/min, 500/day, 100/ip/min)
- Scope-limited Swagger UI at `/api/v1/public/docs`
