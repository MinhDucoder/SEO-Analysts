# Recipe — CI Integration (GitHub Actions)

Nightly integration tests với docker compose. Nhẹ — không per-PR vì slow + tốn compute.

## File: `.github/workflows/integration.yml`

```yaml
name: FE↔BE Integration (L4)

on:
  schedule:
    - cron: "0 18 * * *"      # 2am Việt Nam (UTC+7) = 18:00 UTC prev day
  workflow_dispatch:           # manual trigger từ GitHub UI
  push:
    branches: [main]
    paths:
      - "apps/web/tests/integration/**"
      - "apps/web/playwright.integration.config.ts"
      - "apps/gateway/src/**"  # gateway changes → re-run to catch contract drift

jobs:
  integration:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: seo_gateway
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install deps
        run: npm ci

      - name: Prisma generate + migrate
        working-directory: apps/gateway
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/seo_gateway
        run: |
          npx prisma generate
          npx prisma migrate deploy

      - name: Start gateway
        working-directory: apps/gateway
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/seo_gateway
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_SECRET: test-jwt-secret
          REFRESH_TOKEN_SECRET: test-refresh-secret
        run: |
          npm run build
          npm run start:prod &
          echo $! > gateway.pid
          # Wait for gateway health
          for i in {1..30}; do
            if curl -fs http://localhost:3000/api/v1/health; then break; fi
            sleep 2
          done

      - name: Install Playwright browsers
        working-directory: apps/web
        run: npx playwright install --with-deps chromium

      - name: Run integration tests
        working-directory: apps/web
        env:
          PLAYWRIGHT_INTEGRATION: "true"
          GATEWAY_DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/seo_gateway
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: npm run test:integration

      - name: Stop gateway
        if: always()
        working-directory: apps/gateway
        run: |
          if [ -f gateway.pid ]; then
            kill $(cat gateway.pid) || true
          fi

      - name: Upload report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-integration-report
          path: apps/web/playwright-integration-report/
          retention-days: 14
```

## Notification on failure

Thêm step cuối (nếu có Slack/Discord webhook):

```yaml
      - name: Notify on failure
        if: failure() && github.event_name == 'schedule'
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "⚠️ FE↔BE integration nightly failed. Report: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
```

## Pre-release trigger

Thêm vào workflow khác (vd: `release.yml`):

```yaml
jobs:
  pre-release-integration:
    uses: ./.github/workflows/integration.yml
    if: github.ref == 'refs/heads/main'
```

## Local dev equivalent

Nếu dev muốn chạy giống CI trước khi push:

```bash
# Start stack
npm run docker:up

# Run integration
npm run test:integration

# Inspect report nếu fail
open apps/web/playwright-integration-report/index.html
```

## Anti-patterns

- ❌ Chạy integration trên mọi PR → slow + tốn runtime minutes → burn GitHub quota.
- ❌ Timeout-minutes 5 cho job → docker up + migrate + test > 5 phút → false fail.
- ❌ Không upload report on failure → debug khó.
- ❌ Hard-code secrets trong workflow → dùng `secrets.*`.
- ❌ Không stop gateway ở `if: always()` → worker orphan process → GH runner flaky.
- ❌ Retry job 5 lần khi fail → hide flake thay vì fix.

## Checklist

- [ ] `on.schedule.cron` set giờ thấp tải (2-4am local).
- [ ] `on.workflow_dispatch` enabled để manual trigger.
- [ ] `on.push.paths` lọc chỉ chạy khi integration code hoặc gateway thay đổi.
- [ ] Services postgres + redis khai báo qua GH Actions services (không dùng docker-compose trực tiếp).
- [ ] Gateway start → health check loop trước khi test run.
- [ ] `if: always()` cleanup gateway process.
- [ ] Upload report on failure với 14-day retention.
- [ ] Notification on nightly failure (optional).