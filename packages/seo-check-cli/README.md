# @repo/seo-check-cli

Command-line front-end for the SEO Analyst Public API.

## Install (workspace-local)

```bash
# From the monorepo root
npm exec -w packages/seo-check-cli seo-check -- --help
```

## Usage

```bash
# Analyze a URL
seo-check --url https://your-blog.com/post \
  --keyword "seo 2026" \
  --api-key $SEO_API_KEY

# Analyze a local file
seo-check --file ./article.md --mode markdown \
  --keyword "on-page seo" \
  --api-key $SEO_API_KEY

# CI gate: exit 1 if any error issue OR score below 70
seo-check --url https://... --keyword "seo" \
  --fail-on error --min-score 70 \
  --api-key $SEO_API_KEY

# Machine-readable
seo-check --url https://... --keyword "seo" --format json
```

## Exit codes

- `0` — pass (or criterion met)
- `1` — CI gate tripped (`--fail-on` or `--min-score`)
- `2` — network / auth / API error
- `3` — invalid usage

## Flags

| Flag | Description | Default |
|---|---|---|
| `--url <url>` | URL to analyze | — |
| `--file <path>` | Local markdown or HTML file | — |
| `--mode markdown\|html` | Required when `--file` is used | — |
| `--keyword <kw>` | Target keyword (required) | — |
| `--secondary <csv>` | Secondary keywords, ≤5 | — |
| `--enrich off\|template\|llm` | Enrichment mode | `llm` |
| `--language vi\|en` | Suggestion language | `vi` |
| `--format pretty\|json` | Output format | `pretty` |
| `--fail-on error\|warning\|info` | CI severity gate | off |
| `--min-score <n>` | CI score gate [0,100] | off |
| `--api-key <key>` | Inline API key | — |
| `--env <VAR>` | Read API key from env var | `SEO_API_KEY` |
| `--api-base <url>` | Gateway base URL | `http://localhost:3000/api/v1` |

## Programmatic use

```typescript
import { SeoClient } from '@repo/seo-check-cli';

const client = new SeoClient({ apiBase: '…', apiKey: 'sk_live_…' });
const res = await client.check({
  input: { type: 'url', url: 'https://…' },
  targetKeyword: 'seo 2026',
});
console.log(res.score);
```

## Install binding

Each CLI installation binds to a freshly-generated `install_id` (UUID v4)
stored in `${XDG_CONFIG_HOME:-~/.config}/seo-check-cli/install-id`. This is
sent as the `X-Install-Id` header on every request.

A single API key can only be used from one install at a time. If you move
the key to a new machine, the first call from that machine will be rejected
with `KEY_INSTALL_MISMATCH`. Rebind via the web app's
**Settings → API Keys → Rebind device** action.

Deleting the install-id file forces a fresh install_id on the next run.
