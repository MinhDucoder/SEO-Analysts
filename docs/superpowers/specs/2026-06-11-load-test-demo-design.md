# Load Test Demo — Thiết kế

**Ngày:** 2026-06-11
**Mục tiêu:** Demo live trước hội đồng bảo vệ đồ án, chạy trên local docker-compose, cho ra số liệu/biểu đồ trực quan chứng minh hệ thống chịu tải.

## 1. Bối cảnh & ràng buộc

Hệ thống là nền tảng SEO microservices 5 service (gateway, crawler, seo-analyzer, report, web), giao tiếp qua gRPC + BullMQ, chạy local bằng docker-compose. Gateway expose HTTP API với global prefix `api/v1` ([apps/gateway/src/main.ts:25](../../../apps/gateway/src/main.ts)).

Ràng buộc chi phối thiết kế:

- **Demo live** → cần chạy bằng ít lệnh, hoàn tất trong ~2 phút, an toàn không sập máy.
- **LLM quota**: GEO rule gọi Gemini (free-tier 20 req/ngày). KHÔNG được flood các endpoint/flow dùng LLM.
- **Audit là job bất đồng bộ**: `POST /audits` chỉ đẩy job vào BullMQ rồi trả về ngay; xử lý thật chạy ngầm ở worker. Đo latency của endpoint này là vô nghĩa — phải đo throughput hàng đợi.
- **Crawler bắn request ra website thật** → khi load test phải trỏ vào URL local cố định, không đập site bên ngoài.

## 2. Phạm vi

Hai phần demo độc lập, chạy riêng:

- **Phần A — k6 HTTP load test**: đo latency/throughput của các endpoint đọc nhẹ (không LLM).
- **Phần B — Audit queue-throughput test**: enqueue nhiều audit cùng lúc, quan sát worker xử lý song song và hàng đợi rút cạn.

Ngoài phạm vi: stress test tìm điểm gãy, soak test, load test endpoint LLM thật, deploy lên server.

## 3. Phần A — k6 HTTP load test

### 3.1 Kịch bản
Đăng nhập **một lần** trong `setup()` để lấy JWT (tránh rate-limit trên `POST /auth/login`), sau đó tái dùng token cho các request đọc trong vòng lặp VU:

| Request | Auth | Vai trò |
|---|---|---|
| `GET /api/v1/health` | không | endpoint rẻ nhất, đẩy throughput cao |
| `GET /api/v1/auth/me` | có | đọc profile (có auth) |
| `GET /api/v1/audits` | có | list audit từ DB — endpoint "thật" ấn tượng |

### 3.2 Hình dạng tải (ramping VUs)
```
0  → 30s : 0  → 50 VUs   (warm-up, đường đi lên)
30 → 90s : giữ 50 VUs    (plateau ổn định)
90 →120s : 50 → 0 VUs    (ramp-down)
```
Tổng ~2 phút. Số VU khởi đầu 50, tinh chỉnh theo sức máy lúc chạy thử.

### 3.3 Thresholds (tiêu chí PASS)
- `http_req_failed` < 1%
- `http_req_duration` p95 < 500ms
k6 tô xanh PASS nếu đạt → bằng chứng trực quan cho hội đồng.

### 3.4 Trình diễn
- Chạy `k6 run --out web-dashboard script.js`.
- Mở `http://localhost:5665` → chiếu biểu đồ real-time (VUs, req/s, p95, error rate).
- Kết thúc xuất HTML report lưu vào báo cáo.

## 4. Phần B — Audit queue-throughput test

### 4.1 Chuẩn bị môi trường
- **GEO/LLM tự động TẮT — không cần đổi env.** Gateway chỉ gắn cờ GEO vào job khi client gửi `runGeo:true` ([apps/gateway/src/audits/services/audits.service.ts:109](../../../apps/gateway/src/audits/services/audits.service.ts)); analyzer chỉ chạy GEO batch `if (runGeo)` ([apps/seo-analyzer/src/analyzer/services/analyzer.service.ts:69](../../../apps/seo-analyzer/src/analyzer/services/analyzer.service.ts)). Script enqueue không gửi `runGeo` → audit chạy thuần crawl + chấm điểm rule, không gọi Gemini, không tốn quota, và **không đụng hành vi production**.
- Tất cả audit trỏ vào **một URL cố định** — mặc định `https://example.com` (IANA test domain). Crawler chạy trong docker không reach được web app trên host, nên dùng example.com cho ổn định; muốn crawl site thật thì truyền `TARGET_URL`.

### 4.2 Kịch bản
1. Login lấy token (tái dùng script auth của Phần A).
2. Bắn ~20–50 lệnh `POST /api/v1/audits` liên tiếp (cùng URL local) để nạp đầy queue.
3. Script poll BullMQ `queue.getJobCounts()` mỗi 1 giây, in bảng/biểu đồ terminal live: `waiting / active / completed / failed`.
4. Hội đồng thấy: queue đầy lên → worker xử lý song song (`active` > 1) → `completed` tăng dần → `waiting` rút về 0. Tính được throughput ≈ jobs/phút.

### 4.3 Trực quan hóa
Script Node nhẹ poll job counts (không đụng code app, không thêm dependency vào gateway). In ra terminal — không dùng Bull Board.

## 5. Cấu trúc file

```
load-test/
├── k6/
│   ├── script.js          # Phần A: setup login + 3 endpoint, ramping VUs, thresholds
│   └── run.sh             # k6 run --out web-dashboard
├── queue/
│   ├── enqueue.mjs        # Phần B: login + bắn N POST /audits vào URL local
│   └── watch.mjs          # Phần B: poll BullMQ counts, in bảng live
├── seed.md               # hướng dẫn tạo user demo + (tùy chọn) vài audit sẵn
└── README.md             # cách chạy cả 2 phần + giải thích biểu đồ cho hội đồng
```

## 6. Rủi ro & điểm cần xác minh khi lập plan

- **Rate-limit toàn cục**: xác minh `GET /api/v1/audits` có bị giới hạn (có `rate-limiter.service.ts` dùng Redis) ở mức 50 VU không; nếu dính 429 → giảm tỉ trọng endpoint đó hoặc nâng limit chỉ cho môi trường demo.
- **URL crawl cho crawler** (đã chốt): crawler chạy trong docker không reach web app trên host (không có service `web` trong compose, không có `host.docker.internal`) → dùng `https://example.com` làm mặc định; truyền `TARGET_URL` nếu muốn crawl site thật.
- **Seed dữ liệu**: tạo sẵn 1 user demo; với Phần A, `GET /audits` rỗng vẫn trả 200 nên seed audit là tùy chọn (đẹp hơn nếu có data).
- **Worker concurrency**: kiểm tra cấu hình concurrency của crawler/analyzer worker để biết mức song song thật sẽ hiện trong demo.
- **Cài k6**: binary đơn lẻ, cài qua package manager hoặc tải trực tiếp — ghi rõ trong README.

## 7. Tiêu chí thành công của demo

- Phần A: biểu đồ real-time chạy mượt, thresholds PASS (xanh), throughput vài trăm req/s, error 0%.
- Phần B: terminal cho thấy queue rút cạn với nhiều worker active song song, tính được jobs/phút.
- Cả hai chạy bằng lệnh đơn giản, an toàn, không tốn LLM quota, không đập site ngoài.
