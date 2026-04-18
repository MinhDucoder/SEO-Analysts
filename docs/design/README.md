# Tài liệu Thiết kế — SEO Analyst Platform

> **Mục tiêu:** Tài liệu kỹ thuật đầy đủ cho đồ án SEO Analyst Platform — từ kiến trúc tổng quan, từng microservice, các hợp đồng API, tới kế hoạch thiết kế & phát triển giao diện web (chưa có).
>
> **Đối tượng đọc:**
> - Giảng viên chấm đồ án — hiểu nhanh sản phẩm, công nghệ, độ phức tạp.
> - Dev mới join — lên môi trường + cài chuẩn đóng góp.
> - Chính tác giả khi quay lại sau vài tháng — tra cứu chi tiết.

---

## Cách đọc tài liệu

| Bạn là... | Đọc theo thứ tự |
|---|---|
| 🎓 Giảng viên chấm bài | [00](00-system-overview.md) → [20](20-data-model.md) → [21](21-api-contracts.md) → lướt nhanh 01–05 |
| 👨‍💻 Dev backend mới | [00](00-system-overview.md) → [10](10-shared-packages.md) → [22](22-job-pipeline.md) → service bạn sẽ đụng (01–05) |
| 🎨 Dev frontend sắp làm | [00](00-system-overview.md) → [21](21-api-contracts.md) → [30](30-frontend-architecture.md) → [31](31-page-specs.md) → [32](32-design-system.md) |
| 🔍 Cần hiểu 1 chức năng cụ thể | Tra [21](21-api-contracts.md) để biết endpoint → mở service doc tương ứng |

---

## Mục lục

### Phần A — Tổng quan hệ thống

| # | File | Nội dung |
|---|---|---|
| 00 | [00-system-overview.md](00-system-overview.md) | Bức tranh lớn: 5 service, công nghệ, data flow 1 audit end-to-end, triển khai |

### Phần B — Chi tiết từng microservice

| # | File | Service | Vai trò |
|---|---|---|---|
| 01 | [01-gateway.md](01-gateway.md) | `gateway` | REST + WebSocket public API, auth, điều phối |
| 02 | [02-crawler.md](02-crawler.md) | `crawler` | Tải HTML + đo Core Web Vitals |
| 03 | [03-seo-analyzer.md](03-seo-analyzer.md) | `seo-analyzer` | 21 rule SEO + chấm điểm |
| 04 | [04-keyword-analyzer.md](04-keyword-analyzer.md) | `keyword-analyzer` | Tokenize VI/EN + density + verdict |
| 05 | [05-report.md](05-report.md) | `report` | Gộp kết quả + xuất PDF + share link |

### Phần C — Hợp đồng & tài nguyên chung

| # | File | Nội dung |
|---|---|---|
| 10 | [10-shared-packages.md](10-shared-packages.md) | `@repo/proto`, `@repo/shared`, `@repo/ui`, eslint/tsconfig preset |
| 20 | [20-data-model.md](20-data-model.md) | ERD 3 database (gateway, analyzer, report) + giải thích từng bảng |
| 21 | [21-api-contracts.md](21-api-contracts.md) | REST / gRPC / WebSocket / Redis pub/sub reference |
| 22 | [22-job-pipeline.md](22-job-pipeline.md) | BullMQ queues, choreography, fan-in/out, F1 site audit |

### Phần D — Thiết kế & phát triển giao diện web

| # | File | Nội dung |
|---|---|---|
| 30 | [30-frontend-architecture.md](30-frontend-architecture.md) | Next.js 14 App Router, data fetching, auth flow |
| 31 | [31-page-specs.md](31-page-specs.md) | Chi tiết từng màn hình (layout, component, API calls) |
| 32 | [32-design-system.md](32-design-system.md) | Color tokens, typography, spacing, shadcn/ui customization |
| 33 | [33-realtime-ux.md](33-realtime-ux.md) | WebSocket integration, progress UI, optimistic updates |
| 34 | [34-ui-mockup-mapping.md](34-ui-mockup-mapping.md) | Map mockup (aigenerate/learning/webaudit HTML) → page spec |

### Phần E — UI Mockup tham khảo (đã có sẵn)

Các file HTML + PNG trong thư mục này là mockup thiết kế ban đầu, dùng làm **nguồn tham khảo** — không phải spec cuối cùng:

- `aigenerate.html` / `aigenerate.png` — Trang AI generate content
- `learning.html` / `learning.png` — Trang learning hub
- `webaudit.html` / `webaudit.png` — Trang audit web
- `stitch_d_n_m_i/` — Thư mục mockup Stitch

> Xem thêm [34-ui-mockup-mapping.md](34-ui-mockup-mapping.md) để biết cách trích design language từ các mockup này.

---

## Quy ước trong tài liệu

- **Đường dẫn code:** dùng markdown link tương đối, ví dụ [apps/gateway/src/main.ts](../../apps/gateway/src/main.ts). Line cụ thể dùng hash anchor: [main.ts:15](../../apps/gateway/src/main.ts#L15).
- **Thuật ngữ:** ưu tiên tiếng Việt; nhưng giữ tên công nghệ, pattern, tên biến bằng tiếng Anh (NestJS, BullMQ, gRPC, Prisma, etc.).
- **Sơ đồ:** dùng ASCII art hoặc bảng markdown; file PUML chi tiết nằm trong [docs/diagrams/](../../diagrams/).
- **Phiên bản:** tài liệu phản ánh trạng thái repo tại commit hiện tại. Khi code đổi, cập nhật tài liệu song song.

---

## Đóng góp / Cập nhật

Khi sửa tài liệu:
1. Giữ style nhất quán với các file khác trong cùng phần.
2. Mỗi tuyên bố kỹ thuật cần có reference tới file mã nguồn.
3. Cập nhật mục lục phần liên quan nếu thêm file mới.
4. Chạy `npm run lint:md` trước khi commit (nếu có).
