# SEO Analyst — Public API

> HTTP + JSON API for SEO content checks. For content writers working in a CMS, for engineers gating CI on-page SEO rules, and for anyone who doesn't want to paste into a tool.

## Quick links

- [Getting started](./getting-started.md)
- [Input types](./input-types.md) — URL / Markdown / HTML
- [Output schema](./output-schema.md)
- [Error codes](./error-codes.md)
- [Rate limits](./rate-limits.md)
- [JavaScript SDK snippet](./sdk-js.md)
- [CLI](./cli.md)
- [Changelog](./changelog.md)
- Interactive Swagger UI: `http://<gateway>/api/v1/public/docs`
- Playground (paste-and-check): `http://<web>/playground`

## At a glance

- One endpoint: `POST /api/v1/public/check`
- Three input shapes: `url`, `markdown`, `html`
- Three enrichment modes: `off` (rule-level only), `template` (rule-rendered suggestion string), `llm` (LLM-rewritten suggestion)
- Sync response — no queue, no webhook; p95 < 4s even with LLM
- Auth: single `Authorization: Bearer sk_live_…` header
- Rate limits: 20/min/key, 500/day/key (see [rate-limits.md](./rate-limits.md))

## Next

Read [getting-started.md](./getting-started.md) for a first successful request in under two minutes.
