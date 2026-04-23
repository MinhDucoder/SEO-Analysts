# Input types

`POST /public/check` accepts three mutually-exclusive input shapes via `input.type`.

## URL

```json
{
  "input": { "type": "url", "url": "https://draft.example/post-123" },
  "targetKeyword": "seo 2026"
}
```

Behavior:
- Gateway calls the crawler's `LiteFetch` (Cheerio-only, no Playwright).
- SSRF rules reject private IPs, loopback, link-local, AWS metadata, `.local` hostnames.
- Timeout 10s (configurable server-side).
- `meta.resolvedUrl` echoes the final URL after redirects.

## Markdown

```json
{
  "input": { "type": "markdown", "markdown": "# Title\n\nBody…" },
  "targetKeyword": "on-page"
}
```

Gateway renders markdown → HTML via the `marked` library then analyzes the resulting HTML. Max 200 KB.

## HTML

```json
{
  "input": { "type": "html", "html": "<html><title>...</title><body>...</body></html>" },
  "targetKeyword": "seo"
}
```

Raw HTML. Max 200 KB. Useful for CMS plugins that already have the rendered page.

## Only one field may be set

```json
{
  "input": { "type": "url", "markdown": "..." }   // ❌ 422 INPUT_TYPE_MISMATCH
}
```

The gateway validates that `input.type` matches exactly one of `url` / `markdown` / `html` and that the other two are absent.
