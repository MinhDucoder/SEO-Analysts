# CLI

Workspace-local CLI delivered as `packages/seo-check-cli/`. After the monorepo is installed, run:

```bash
npm exec -w packages/seo-check-cli seo-check -- --help
```

## Basic usage

```bash
seo-check --url https://your-blog.com/post \
  --keyword "seo 2026" \
  --api-key $SEO_API_KEY
```

## File input

```bash
seo-check --file ./article.md --mode markdown \
  --keyword "on-page seo" \
  --api-key $SEO_API_KEY
```

## Machine output

```bash
seo-check --url https://... --keyword "seo" --format json > report.json
```

## CI gating

Exit `1` when any error issue is present **or** when score is below 70:

```bash
seo-check --url $URL --keyword "$KW" \
  --fail-on error --min-score 70 \
  --api-key $SEO_API_KEY
```

## GitHub Action example

```yaml
# .github/workflows/seo-gate.yml
name: SEO gate

on:
  pull_request:
    paths: ['content/**/*.md']

jobs:
  seo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - name: Check article
        env:
          SEO_API_KEY: ${{ secrets.SEO_API_KEY }}
        run: |
          npm exec -w packages/seo-check-cli seo-check -- \
            --file content/latest.md --mode markdown \
            --keyword "$(jq -r .targetKeyword content/latest.meta.json)" \
            --fail-on error --min-score 70
```

## Exit codes

| Code | Meaning |
|---|---|
| 0 | pass |
| 1 | CI gate tripped (`--fail-on` / `--min-score`) |
| 2 | network / auth / API error |
| 3 | invalid usage |

## Programmatic use

```typescript
import { SeoClient, evaluateGate } from '@repo/seo-check-cli';

const client = new SeoClient({ apiBase: '...', apiKey: '...' });
const res = await client.check({ ... });
const gate = evaluateGate({ response: res, failOn: 'error', minScore: 70 });
if (!gate.pass) throw new Error(gate.reason);
```
