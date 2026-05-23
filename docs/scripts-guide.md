# 🎯 SEO Analyst Platform — Scripts & Run Guide

> Hướng dẫn đầy đủ cách chạy project: từ `npm install` đầu tiên đến chạy E2E smoke test với Docker. Đọc 5 phút là dùng được.

---

## 📦 Tổng quan project

**Type**: Monorepo (Turborepo) — 7 apps + nhiều shared packages
**Runtime**: Node.js >= 18 · npm 11.6.1 · TypeScript 5.9.2
**Workspaces**: `apps/*` + `packages/*`

### Cấu trúc apps

| App | Vai trò | Port HTTP | Port gRPC | Tech chính |
|---|---|---|---|---|
| `gateway` | Public API + auth + orchestrator | 3000 | 50051 | NestJS + Prisma + BullMQ + Socket.IO |
| `crawler` | Cheerio + Playwright + Lighthouse | — | 50052 | NestJS + Playwright |
| `seo-analyzer` | 22 SEO rules engine | — | 50053 | NestJS + Prisma |
| `keyword-analyzer` | TF + density (stateless) | — | 50054 | NestJS |
| `report` | Aggregate + PDF + compare | 3004 | 50055 | NestJS + Prisma + Puppeteer |
| `web` | Next.js dashboard | 3001 | — | Next.js 14 + TanStack Query + shadcn/ui |
| `extension` | Chrome extension v2 | — | — | WXT + React 18 + Vite |

### Hạ tầng (Docker Compose)

- **PostgreSQL 16** × 3 DBs riêng: `seo_gateway`, `seo_analyzer`, `seo_report`
- **Redis 7** — BullMQ queue + pub/sub events + cache

---

## 🚀 Quick Start (lần đầu setup)

```bash
# 1. Cài dependencies (mất ~3-5 phút)
npm install

# 2. Copy env mẫu cho Docker
cp .env.docker.example .env.docker
# Sửa JWT_SECRET, REDIS_PASSWORD nếu cần production-like

# 3. Khởi động hạ tầng (Postgres × 3 + Redis)
npm run docker:up

# 4. Generate Prisma clients + chạy migrations
npm run prisma:migrate

# 5. (Optional) Seed dữ liệu test
npm run prisma:seed

# 6. Chạy tất cả services ở dev mode
npm run dev
```

> 💡 **Mẹo**: Mở mỗi service trong terminal riêng để xem log rõ hơn. Dùng `npm run dev:gateway`, `dev:crawler`, ... thay vì `npm run dev` chạy hết một lúc.

---

## 📜 Scripts root (`package.json`)

### 🛠️ Build & Dev

| Script | Lệnh | Mô tả |
|---|---|---|
| `build` | `turbo run build` | Build TẤT CẢ apps (NestJS compile + Next.js build + WXT bundle) |
| `dev` | `turbo run dev` | Chạy TẤT CẢ services song song ở watch mode |
| `dev:gateway` | `turbo run dev --filter=@seo/gateway` | Chỉ chạy gateway (port 3000 + 50051) |
| `dev:crawler` | `turbo run dev --filter=@seo/crawler` | Chỉ chạy crawler (port 50052) |
| `dev:analyzer` | `turbo run dev --filter=@seo/seo-analyzer` | Chỉ chạy SEO analyzer (port 50053) |
| `dev:keyword` | `turbo run dev --filter=@seo/keyword-analyzer` | Chỉ chạy keyword analyzer (port 50054) |
| `dev:report` | `turbo run dev --filter=@seo/report` | Chỉ chạy report service (port 3004 + 50055) |

> ⚠️ **Lưu ý**: `apps/web` (Next.js, port 3001) và `apps/extension` (Chrome ext) **không có alias riêng**. Chạy bằng:
> ```bash
> npm run dev --workspace=@seo/web      # web → http://localhost:3001
> npm run dev --workspace=@seo/extension # extension WXT dev mode
> ```

### ✅ Quality gates

| Script | Lệnh | Mô tả |
|---|---|---|
| `lint` | `turbo run lint` | ESLint tất cả workspaces |
| `format` | `prettier --write "**/*.{ts,tsx,md}"` | Auto-format toàn bộ TS/MD |
| `check-types` | `turbo run check-types` | `tsc --noEmit` mọi package — bắt buộc PASS trước khi commit |
| `test` | `turbo run test` | Vitest run (đơn vị + integration) — chạy sau khi `^build` xong |
| `test:watch` | `turbo run test:watch` | Vitest watch mode (persistent, không cache) |

### 🐳 Docker (hạ tầng)

| Script | Lệnh | Mô tả |
|---|---|---|
| `docker:up` | `docker compose up -d` | Khởi động Postgres × 3 + Redis (background) |
| `docker:down` | `docker compose down` | Dừng containers, **giữ volumes** (dữ liệu DB còn) |
| `docker:reset` | `docker compose down -v && docker compose up -d` | **XOÁ volumes** + tạo lại — mất sạch DB, dùng khi muốn fresh start |
| `docker:build` | `docker compose build` | Build images app từ Dockerfile (chưa run) |
| `docker:e2e` | `docker compose up -d --build && sleep 30 && ./scripts/e2e-smoke-test.sh` | Build → start → đợi 30s → smoke test full pipeline |

### 🗄️ Prisma (database)

| Script | Lệnh | Mô tả |
|---|---|---|
| `prisma:migrate` | `turbo run prisma:migrate` | Chạy `prisma migrate dev` ở gateway + seo-analyzer + report |
| `prisma:seed` | `turbo run prisma:seed` | Seed dữ liệu test (chỉ gateway + seo-analyzer có seed) |

> 📝 **postinstall hook**: Mỗi service Prisma tự chạy `prisma generate` sau `npm install`, không cần lệnh thủ công.

### 🧪 E2E

| Script | Lệnh | Mô tả |
|---|---|---|
| `e2e:smoke` | `./scripts/e2e-smoke-test.sh` | Test pipeline đầy đủ: register → login → create audit → poll → verify score → export PDF. Cần Docker stack chạy sẵn. Timeout 90s. |

### 🪝 Git hooks

| Script | Lệnh | Mô tả |
|---|---|---|
| `prepare` | `husky` | Tự chạy sau `npm install` — cài Husky pre-commit hooks |

---

## 🧩 Scripts của từng app

### `@seo/gateway` (apps/gateway)

| Script | Mô tả |
|---|---|
| `build` | `nest build` — compile NestJS → `dist/` |
| `dev` | Build rồi `nest start --watch` (hot reload) |
| `start` / `start:prod` | Run production build: `node dist/main` |
| `lint` | ESLint |
| `check-types` | `tsc --noEmit` |
| `test` / `test:watch` | Vitest |
| `prisma:generate` | Generate Prisma client cho `seo_gateway` DB |
| `prisma:migrate` | `prisma migrate dev` — tạo migration mới + apply |
| `prisma:seed` | `ts-node prisma/seed.ts` — chạy seed file |
| `postinstall` | Auto `prisma generate` sau npm install |

### `@seo/crawler` (apps/crawler)

Tương tự gateway nhưng **không có Prisma** (stateless): `build`, `dev`, `start`, `lint`, `check-types`, `test`, `test:watch`.

### `@seo/seo-analyzer` (apps/seo-analyzer)

Giống gateway, có Prisma + seed (DB `seo_analyzer`).

### `@seo/keyword-analyzer` (apps/keyword-analyzer)

Stateless như crawler — không có Prisma.

### `@seo/report` (apps/report)

Có Prisma (DB `seo_report`) — **không có seed**, chỉ có `prisma:generate` + `prisma:migrate`.

### `@seo/web` (apps/web)

| Script | Mô tả |
|---|---|
| `dev` | `next dev -p 3001` → http://localhost:3001 |
| `build` | `next build` |
| `start` | `next start -p 3001` (production) |
| `lint` / `check-types` / `test` / `test:watch` | Standard |
| `e2e` | `playwright test` — E2E thuần FE (MSW mock) |
| `e2e:ui` | Playwright với UI inspector |
| `test:integration` | Playwright với config **L4** — gọi gateway thật + DB thật |
| `test:integration:headed` | L4 integration nhưng có browser hiển thị |

### `@seo/extension` (apps/extension)

| Script | Mô tả |
|---|---|
| `dev` | `wxt` — Chrome dev mode (auto-reload, mặc định Chromium) |
| `dev:firefox` | `wxt -b firefox` — Firefox dev mode |
| `build` | `wxt build` — production bundle Chromium |
| `build:firefox` | `wxt build -b firefox` |
| `zip` | `wxt zip` — đóng gói `.zip` upload Chrome Web Store |
| `check-types` | `tsc --noEmit` |
| `test` / `test:watch` | Vitest |
| `prepare-wxt` | `wxt prepare` — generate `.wxt/` types (chạy thủ công khi cần) |

---

## 🎯 Use cases thường gặp

### 1️⃣ Develop chỉ 1 service (gateway)

```bash
npm run docker:up           # cần Postgres + Redis
npm run dev:gateway         # gateway @ :3000
```

### 2️⃣ Develop full stack (BE + FE)

```bash
# Terminal 1
npm run docker:up

# Terminal 2-6: mỗi BE service một terminal
npm run dev:gateway
npm run dev:crawler
npm run dev:analyzer
npm run dev:keyword
npm run dev:report

# Terminal 7: FE
npm run dev --workspace=@seo/web   # http://localhost:3001
```

### 3️⃣ Develop Chrome extension

```bash
npm run dev:gateway                  # cần API
npm run dev --workspace=@seo/extension
# WXT mở Chrome auto-load extension từ apps/extension/.output/
```

### 4️⃣ Tạo migration Prisma mới (ví dụ gateway)

```bash
# Sửa apps/gateway/prisma/schema.prisma
npm run prisma:migrate --workspace=@seo/gateway
# → tạo file migration mới + apply ngay lên seo_gateway DB
```

### 5️⃣ Reset DB hoàn toàn

```bash
npm run docker:reset       # xoá volumes → tạo lại Postgres trắng
npm run prisma:migrate     # apply tất cả migrations
npm run prisma:seed        # seed lại dữ liệu test
```

### 6️⃣ Verify trước khi commit / merge

```bash
npm run lint               # ESLint
npm run check-types        # TypeScript
npm test                   # Unit + integration
```

### 7️⃣ E2E smoke test toàn pipeline

```bash
npm run docker:e2e         # Build → up → đợi 30s → smoke test
# Output: [PASS]/[FAIL] cho từng bước (register, login, audit, poll, PDF...)
```

### 8️⃣ FE↔BE Integration test (L4)

```bash
npm run docker:up                                          # Postgres + Redis
npm run dev:gateway                                        # gateway thật
npm run test:integration --workspace=@seo/web              # Playwright gọi gateway thật + DB thật
```

---

## ⚙️ Cấu hình Turborepo

File `turbo.json` định nghĩa pipeline:

- **`build`** depends on `^build` (build dependencies trước) — cache theo `$TURBO_DEFAULT$ + .env*`
- **`dev`** không cache, persistent (long-running)
- **`test`** depends on `^build`, cache `coverage/`
- **`prisma:*`** không cache (cần fresh DB state)
- **UI**: TUI mode (terminal UI đẹp hơn)
- **Global env vars**: `CI`, `NODE_ENV`, `PLAYWRIGHT_BASE_URL`, `NEXT_PUBLIC_*`

---

## 🌐 Ports — Cheat sheet

| Service | Port |
|---|---|
| `web` (Next.js) | **3001** |
| `gateway` HTTP | **3000** |
| `gateway` gRPC | 50051 |
| `crawler` gRPC | 50052 |
| `seo-analyzer` gRPC | 50053 |
| `keyword-analyzer` gRPC | 50054 |
| `report` HTTP | 3004 |
| `report` gRPC | 50055 |
| Postgres gateway | 5432 |
| Postgres analyzer | 5433 |
| Postgres report | 5434 |
| Redis | 6379 |

---

## 🔐 Environment Variables (`.env.docker`)

Bắt buộc set khi chạy Docker stack — copy từ `.env.docker.example`:

- **DB credentials**: `GATEWAY_DB_*`, `ANALYZER_DB_*`, `REPORT_DB_*`
- **Redis**: `REDIS_PASSWORD`
- **JWT**: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- **OAuth (optional)**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- **Frontend**: `FRONTEND_URL=http://localhost:3001`
- **LLM (optional)**: `ANTHROPIC_API_KEY` — để trống thì enrich mode degrade về template

> ⚠️ **Production**: ĐỔI tất cả `*-secret-change-in-production` thành giá trị thật ngẫu nhiên (32+ chars).

---

## 🆘 Troubleshooting

| Triệu chứng | Nguyên nhân | Cách fix |
|---|---|---|
| `Cannot connect to database` | Postgres chưa up | `npm run docker:up` rồi đợi ~5s |
| `Prisma client not generated` | Quên postinstall | `npm install` lại HOẶC `npm run prisma:generate --workspace=@seo/gateway` |
| `Port 3000 already in use` | Process cũ chưa kill | `lsof -ti:3000 \| xargs kill -9` |
| `e2e:smoke fail Health check` | Services chưa khởi động đủ | Đợi thêm 30s sau `docker:up`, hoặc dùng `docker:e2e` (đã built-in sleep 30) |
| Migration conflict | Schema drift | `npm run docker:reset` rồi `prisma:migrate` lại |
| WXT extension không load | `.output/` rỗng | `npm run build --workspace=@seo/extension` |

---

## 📚 Tài liệu liên quan

- `README.md` — Tổng quan project + features
- `docs/USER-GUIDE.md` — Hướng dẫn người dùng cuối
- `docs/PRD.md` — Product Requirements
- `docs/design/` — Architecture diagrams
- `apps/CLAUDE.md` — Service map chi tiết (cho contributor)
- `CLAUDE.md` — Coding conventions + workflow rules
- `turbo.json` — Build pipeline config
- `docker-compose.yml` — Hạ tầng definition

---

> 📌 **Document này tự sinh từ `package.json` + `turbo.json` + scripts. Khi thêm script mới, nhớ update.**
