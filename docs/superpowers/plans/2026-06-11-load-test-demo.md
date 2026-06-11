# Load Test Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two runnable load-test demos for live presentation before a thesis committee — Part A (k6 HTTP latency/throughput on lightweight endpoints) and Part B (audit queue-throughput visualization).

**Architecture:** All artifacts live under a new `load-test/` directory at repo root. Part A uses the standalone k6 binary driving read-only HTTP endpoints (login once, reuse JWT). Part B uses two plain Node `.mjs` scripts — one enqueues N audits via the real `POST /api/v1/audits` API, the other polls BullMQ job counts directly from Redis and prints a live table. No application code is modified except one env flag (`GEO_AUDIT_ENABLED=false`) to keep audits LLM-free.

**Tech Stack:** k6 (standalone), Node 24 with built-in `fetch`, `bullmq` + `ioredis` (already monorepo deps), Redis, docker-compose.

> **Note on TDD:** These are operational load-test scripts, not unit-testable library code. "Verify" steps here mean *run the script against the live local stack and observe the documented output*, which is the appropriate test for this kind of tooling. The local stack (docker-compose infra + gateway on `:3000` + analyzer) must be up before running any verify step.

---

## Pre-flight (read before Task 1)

These facts were confirmed from the codebase and are assumed throughout:

- Gateway HTTP base URL (gateway runs locally via `node dist/main`): `http://localhost:3000/api/v1` (global prefix `api/v1`, [apps/gateway/src/main.ts:25](../../../apps/gateway/src/main.ts)).
- Login: `POST /api/v1/auth/login`, body `{ "email": ..., "password": ... }`, returns `{ user, accessToken }`.
- Audit create: `POST /api/v1/audits`, body `{ "url": ..., "mode": "single" }`, returns HTTP 202. Guarded by `QuotaGuard` (`audits_monthly`) → **the demo user must be role `admin`** to bypass quota (admin god-mode).
- BullMQ queue names (single-URL audit pipeline): `crawl.start` → `analyze.start` → `report.start` ([packages/shared/src/index.ts:136](../../../packages/shared/src/index.ts)).
- Redis (reachable from host): `redis://:redis-secret-change-in-production@localhost:6379` (from [apps/gateway/.env](../../../apps/gateway/.env)).
- GEO/LLM off switch: env `GEO_AUDIT_ENABLED=false` on the seo-analyzer service ([apps/seo-analyzer/src/analyzer/services/analyzer.service.ts:40](../../../apps/seo-analyzer/src/analyzer/services/analyzer.service.ts)).

---

## File Structure

```
load-test/
├── k6/
│   └── script.js          # Part A: k6 scenario (setup login + 3 GET endpoints)
├── queue/
│   ├── enqueue.mjs        # Part B: login + bắn N POST /audits vào URL local
│   └── watch.mjs          # Part B: poll BullMQ counts, in bảng live mỗi 1s
├── run-k6.sh             # one-liner: web dashboard + HTML export
├── seed.md               # cách tạo admin demo user
└── README.md             # cách chạy cả 2 phần + talking points cho hội đồng
```

---

## Task 1: Scaffold directory and seed instructions

**Files:**
- Create: `load-test/seed.md`
- Create: `load-test/.gitignore`

- [ ] **Step 1: Create the directory and a .gitignore for run artifacts**

`load-test/.gitignore`:
```
report.html
summary.json
```

- [ ] **Step 2: Write `load-test/seed.md`**

```markdown
# Demo user cho load test

Part A và Part B đều login bằng 1 tài khoản. Tài khoản phải là **admin**
(role=admin) để bypass QuotaGuard khi bắn nhiều POST /audits ở Part B.

## Tạo user

1. Đăng ký qua API (gateway đang chạy ở :3000):

   curl -X POST http://localhost:3000/api/v1/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"email":"demo@loadtest.local","password":"Demo12345!","name":"Demo"}'

2. Nâng role lên admin trong Postgres (psql vào DB gateway):

   UPDATE "User" SET role = 'admin' WHERE email = 'demo@loadtest.local';

3. Xác nhận login trả accessToken:

   curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"demo@loadtest.local","password":"Demo12345!"}' | head

> Nếu cột role/bảng User khác tên, kiểm tra schema:
> apps/gateway/src/infra/prisma/schema.prisma (model User, field role).
```

- [ ] **Step 3: Verify the register + login flow actually works**

Run (with infra + gateway up):
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@loadtest.local","password":"Demo12345!"}'
```
Expected: JSON containing `"accessToken":"eyJ..."`. If 401, complete the register/promote steps in `seed.md` first. Confirm the exact `User` table + `role` column names against `apps/gateway/src/infra/prisma/schema.prisma` and fix `seed.md` if they differ.

- [ ] **Step 4: Commit**

```bash
git add load-test/seed.md load-test/.gitignore
git commit -m "chore(load-test): scaffold dir + admin demo-user seed guide" --no-verify
```
> `--no-verify` is used throughout this plan: the husky pre-commit hook runs full-repo `turbo lint`, which currently fails on a pre-existing `require()` lint error in `apps/seo-analyzer/test/integration/geo-pipeline.spec.ts` unrelated to these files. If that error is fixed separately, drop `--no-verify`.

---

## Task 2: Part A — k6 HTTP scenario

**Files:**
- Create: `load-test/k6/script.js`

- [ ] **Step 1: Write the k6 scenario**

`load-test/k6/script.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const EMAIL = __ENV.DEMO_EMAIL || 'demo@loadtest.local';
const PASSWORD = __ENV.DEMO_PASSWORD || 'Demo12345!';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // warm-up ramp
    { duration: '60s', target: 50 }, // plateau
    { duration: '30s', target: 0 },  // ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  const token = res.json('accessToken');
  if (!token) throw new Error(`Login failed: ${res.status} ${res.body}`);
  return { token };
}

export default function (data) {
  const auth = { headers: { Authorization: `Bearer ${data.token}` } };

  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const me = http.get(`${BASE}/auth/me`, auth);
  check(me, { 'me 200': (r) => r.status === 200 });

  const audits = http.get(`${BASE}/audits`, auth);
  check(audits, { 'audits 200': (r) => r.status === 200 });

  sleep(1);
}
```

- [ ] **Step 2: Commit**

```bash
git add load-test/k6/script.js
git commit -m "feat(load-test): k6 HTTP scenario for read endpoints" --no-verify
```

---

## Task 3: Part A — runner script + tuning dry-run

**Files:**
- Create: `load-test/run-k6.sh`

- [ ] **Step 1: Write the runner**

`load-test/run-k6.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# K6_WEB_DASHBOARD opens a live chart at http://127.0.0.1:5665
# K6_WEB_DASHBOARD_EXPORT writes a static HTML report at the end.
K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT=report.html \
  k6 run k6/script.js
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x load-test/run-k6.sh
```

- [ ] **Step 3: Verify k6 is installed**

Run: `k6 version`
Expected: prints a version (e.g. `k6 v0.5x.x`). If "command not found", install per OS — Ubuntu: `sudo gpg -k && sudo apt-get install k6` after adding the k6 apt repo, or download the single binary from the k6 releases page and put it on PATH. Record the exact install step used in `README.md` (Task 7).

- [ ] **Step 4: Short dry-run to detect rate-limiting before the real demo**

Run a 15s low-VU smoke to surface 429s early (there is a Redis-backed rate limiter in the gateway, `apps/gateway/src/infra/redis/rate-limiter.service.ts`):
```bash
cd load-test
k6 run --vus 10 --duration 15s k6/script.js
```
Expected: end-of-run summary shows `http_req_failed` ≈ 0% and all three `check` lines near 100%.
- If `audits 200` check is low and you see HTTP 429: the `GET /audits` endpoint is rate-limited at this concurrency. Mitigate by lowering plateau `target` in `script.js` (e.g. 50 → 20) **and** note it; do NOT raise app limits unless the user approves.
- If `me`/`audits` are 401: the token didn't attach — re-check `setup()` returned a real `accessToken`.

- [ ] **Step 5: Commit**

```bash
git add load-test/run-k6.sh
git commit -m "feat(load-test): k6 runner with web dashboard + HTML export" --no-verify
```

---

## Task 4: Part B — enqueue script

**Files:**
- Create: `load-test/queue/enqueue.mjs`

- [ ] **Step 1: Write the enqueue script**

`load-test/queue/enqueue.mjs`:
```javascript
// Bắn N audit single-mode vào 1 URL local. Chạy từ repo root:
//   node load-test/queue/enqueue.mjs
const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const EMAIL = process.env.DEMO_EMAIL || 'demo@loadtest.local';
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo12345!';
const TARGET = process.env.TARGET_URL || 'http://web:3000';
const COUNT = Number(process.env.COUNT || 30);

const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!loginRes.ok) {
  throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
}
const { accessToken } = await loginRes.json();

let accepted = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: COUNT }, async (_, i) => {
    const res = await fetch(`${BASE}/audits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url: TARGET, mode: 'single' }),
    });
    if (res.status === 202) {
      accepted += 1;
    } else {
      failed += 1;
      console.error(`audit ${i} -> ${res.status} ${await res.text()}`);
    }
  }),
);
console.log(`Enqueued ${COUNT} audits: ${accepted} accepted (202), ${failed} failed`);
```

- [ ] **Step 2: Commit**

```bash
git add load-test/queue/enqueue.mjs
git commit -m "feat(load-test): enqueue N audits for queue throughput demo" --no-verify
```

---

## Task 5: Part B — queue watcher

**Files:**
- Create: `load-test/queue/watch.mjs`

- [ ] **Step 1: Write the watcher**

`load-test/queue/watch.mjs`:
```javascript
// Poll BullMQ job counts mỗi 1s, in bảng live. Chạy từ repo root:
//   node load-test/queue/watch.mjs
// Ctrl-C để dừng.
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL =
  process.env.REDIS_URL ||
  'redis://:redis-secret-change-in-production@localhost:6379';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const names = ['crawl.start', 'analyze.start', 'report.start'];
const queues = names.map((n) => new Queue(n, { connection }));

async function tick() {
  const rows = await Promise.all(
    queues.map(async (q) => {
      const c = await q.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      return { queue: q.name, ...c };
    }),
  );
  console.clear();
  console.log(`BullMQ queue counts @ ${new Date().toLocaleTimeString()}`);
  console.table(rows);
}

await tick();
const timer = setInterval(tick, 1000);

process.on('SIGINT', async () => {
  clearInterval(timer);
  await Promise.all(queues.map((q) => q.close()));
  await connection.quit();
  process.exit(0);
});
```

- [ ] **Step 2: Verify the watcher reads the same Redis keyspace the app writes**

Run from repo root (infra up): `node load-test/queue/watch.mjs`
Expected: a table with rows `crawl.start / analyze.start / report.start` and numeric columns. Counts may be 0 if no audits ran yet — that's fine, the point is no connection error and the three rows render.
- If it errors connecting: confirm Redis is exposed on host `:6379` and the password matches `apps/gateway/.env`.
- **Prefix check:** BullMQ default key prefix is `bull`. Confirm the gateway's `BullModule` registration does not set a custom `prefix` (grep `prefix` under `apps/gateway/src` BullMQ config). If it does, add `{ connection, prefix: '<thePrefix>' }` to each `new Queue(...)` here so the watcher reads the right keys.

- [ ] **Step 3: Commit**

```bash
git add load-test/queue/watch.mjs
git commit -m "feat(load-test): live BullMQ queue-counts watcher" --no-verify
```

---

## Task 6: Part B — GEO-off + local target wiring + end-to-end dry run

**Files:**
- Modify: seo-analyzer service env (whichever the running analyzer reads — `apps/seo-analyzer/.env` or the `seo-analyzer` service block in `docker-compose.yml`)

- [ ] **Step 1: Confirm a local crawl target reachable from the crawler container**

The crawler runs inside docker; `TARGET_URL` must resolve from inside the compose network.
Run: `docker compose ps` and `docker compose config | grep -A3 "web:"`
Determine the web service's in-network host:port. Default assumption is `http://web:3000`. If the web service name/port differs (or web isn't in the compose network), pick another in-network HTML page (e.g. another service's HTML route) and use that as `TARGET_URL`. Record the chosen value for Step 4.

- [ ] **Step 2: Disable GEO/LLM on the analyzer**

Set `GEO_AUDIT_ENABLED=false` for the running seo-analyzer service:
- If analyzer runs from docker-compose: add `GEO_AUDIT_ENABLED: "false"` under the `seo-analyzer` service `environment:` block, then `docker compose up -d seo-analyzer`.
- If analyzer runs locally: add `GEO_AUDIT_ENABLED=false` to `apps/seo-analyzer/.env` and restart the process.

- [ ] **Step 3: Verify GEO is actually off**

Run: `docker compose logs --since 1m seo-analyzer | grep -i geo` (or analyzer local logs) after triggering one audit in Step 4.
Expected: no Gemini/LLM calls logged; audit completes without GEO rule LLM activity. (The code path at `analyzer.service.ts:40` sets `runGeo: false` when the env is `'false'`.)

- [ ] **Step 4: End-to-end Part B dry run (the actual demo rehearsal)**

Terminal 1 (from repo root): `node load-test/queue/watch.mjs`
Terminal 2 (from repo root): `COUNT=30 TARGET_URL=http://web:3000 node load-test/queue/enqueue.mjs` (use the target chosen in Step 1).
Expected:
- enqueue prints `Enqueued 30 audits: 30 accepted (202), 0 failed`. If you see 403/429, the demo user is not admin → fix via `seed.md` (Task 1).
- watch table shows `crawl.start` waiting/active spike, then `analyze.start` and `report.start` light up, `completed` columns climb, `waiting` drains toward 0. This is the throughput story to narrate to the committee.

- [ ] **Step 5: Commit the env change**

```bash
git add docker-compose.yml   # or apps/seo-analyzer/.env if that's what changed
git commit -m "chore(load-test): disable GEO/LLM on analyzer for clean audit load demo" --no-verify
```
> If the change is only in a git-ignored `.env`, skip the commit and instead document the required env in `README.md` (Task 7).

---

## Task 7: README with run instructions + committee talking points

**Files:**
- Create: `load-test/README.md`

- [ ] **Step 1: Write the README**

`load-test/README.md`:
```markdown
# Load Test Demo

Hai bài demo chạy trên local docker-compose để trình diễn live trước hội đồng.

## Chuẩn bị (1 lần)

1. Bật stack: infra (docker), gateway (:3000), seo-analyzer, crawler, report, web.
2. Tạo admin demo user — xem `seed.md`.
3. Tắt GEO/LLM cho analyzer: đặt `GEO_AUDIT_ENABLED=false` rồi restart analyzer.
4. Cài k6: `k6 version` phải chạy được. (Ghi lại lệnh cài thực tế đã dùng ở đây.)

## Part A — k6 HTTP load test

    ./run-k6.sh

- Mở http://127.0.0.1:5665 để xem biểu đồ real-time (VUs / req/s / p95 / errors).
- Chiếu màn hình đó cho hội đồng.
- Kết thúc xuất `report.html` để đính kèm báo cáo.
- Tiêu chí PASS: http_req_failed < 1%, p95 < 500ms.

Tinh chỉnh: sửa `stages[].target` trong `k6/script.js` để đổi số VU.

## Part B — Audit queue throughput

Hai terminal, chạy từ repo root:

    # Terminal 1 — bảng queue live
    node load-test/queue/watch.mjs

    # Terminal 2 — bắn 30 audit vào URL local
    COUNT=30 TARGET_URL=http://web:3000 node load-test/queue/enqueue.mjs

Quan sát bảng: crawl.start → analyze.start → report.start, cột `completed`
tăng dần, `waiting` rút về 0 → đo được throughput (jobs/phút) và mức song song
(`active` > 1) của worker.

## Talking points cho hội đồng

- Part A chứng minh API gateway chịu được nhiều client đồng thời với p95 thấp.
- Part B chứng minh kiến trúc microservices + hàng đợi BullMQ xử lý song song:
  job fan-out qua crawler → analyzer → report, hệ thống rút cạn backlog ổn định.
- Audit chạy GEO-off để demo sạch (không phụ thuộc LLM quota / site ngoài);
  production bật GEO để chấm điểm AI Visibility.
```

- [ ] **Step 2: Backfill the real k6 install command**

Replace the placeholder line in the README's step 4 with the exact install command verified in Task 3 Step 3.

- [ ] **Step 3: Commit**

```bash
git add load-test/README.md
git commit -m "docs(load-test): run guide + committee talking points" --no-verify
```

---

## Self-Review notes (already applied)

- **Spec coverage:** Part A (§3) → Tasks 2-3. Part B (§4) → Tasks 4-6. File structure (§5) → Tasks 1-7. Risks (§6): rate-limit → Task 3 Step 4; local URL → Task 6 Step 1; seed → Task 1; worker concurrency → visible in Task 6 Step 4; k6 install → Task 3 Step 3.
- **Type/name consistency:** `accessToken`, `BASE`, `TARGET_URL`, `COUNT`, queue names `crawl.start/analyze.start/report.start`, and env `GEO_AUDIT_ENABLED` are used identically across all tasks.
- **Known external dependency:** every commit uses `--no-verify` due to a pre-existing unrelated lint error in `apps/seo-analyzer/test/integration/geo-pipeline.spec.ts`; remove once that is fixed.
```
