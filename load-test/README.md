# Load Test Demo

Hai bài demo chạy trên local stack để trình diễn live trước hội đồng.

- **Part A — k6 HTTP load test:** đo latency/throughput của các endpoint đọc nhẹ.
- **Part B — Audit queue throughput:** đẩy nhiều audit vào BullMQ, xem worker xử lý song song và hàng đợi rút cạn.

## Chuẩn bị (1 lần)

1. Bật stack: infra docker (`docker compose up -d`), gateway (:3000), seo-analyzer, crawler, report.
2. Tạo admin demo user — xem [`seed.md`](seed.md).
3. Cài k6 (binary đơn lẻ):
   ```bash
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
     --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
     | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6
   ```
   Hoặc tải binary trực tiếp từ https://github.com/grafana/k6/releases và đặt vào PATH.
   Xác nhận: `k6 version`.

> **GEO/LLM tự động TẮT cho demo** — không cần làm gì. Script Part B không gửi
> `runGeo:true`, nên gateway enqueue job không có cờ GEO và analyzer bỏ qua GEO
> batch (không gọi Gemini, không tốn quota free-tier).

## Part A — k6 HTTP load test

```bash
./run-k6.sh
```

- Mở http://127.0.0.1:5665 để xem biểu đồ real-time (VUs / req/s / p95 / errors) → chiếu cho hội đồng.
- Kết thúc tự xuất `report.html` để đính kèm báo cáo.
- Tiêu chí PASS: `http_req_failed` < 1%, p95 < 500ms.
- Tinh chỉnh số VU: sửa `stages[].target` trong `k6/script.js`.

> Nếu thấy nhiều HTTP 429 ở `GET /audits`, gateway đang rate-limit ở mức VU này
> — giảm `target` (vd 50 → 20) trong `k6/script.js`.

## Part B — Audit queue throughput

Hai terminal, chạy từ **repo root**:

```bash
# Terminal 1 — bảng queue live
node load-test/queue/watch.mjs

# Terminal 2 — bắn 30 audit
COUNT=30 node load-test/queue/enqueue.mjs
```

- `TARGET_URL` mặc định là `https://example.com` (IANA test domain) vì crawler
  chạy trong docker và không reach được web app trên host. Muốn crawl site của
  bạn: `TARGET_URL=https://your-site.com COUNT=30 node load-test/queue/enqueue.mjs`.
- Quan sát bảng `watch.mjs`: `crawl.start → analyze.start → report.start`, cột
  `completed` tăng dần, `waiting` rút về 0 → đo throughput (jobs/phút) và mức
  song song (`active` > 1) của worker.

## Talking points cho hội đồng

- **Part A** chứng minh API gateway chịu nhiều client đồng thời với p95 thấp, error 0%.
- **Part B** chứng minh kiến trúc microservices + hàng đợi BullMQ xử lý song song:
  job fan-out qua crawler → analyzer → report, hệ thống rút cạn backlog ổn định.
- Audit demo chạy GEO-off để sạch (không phụ thuộc LLM quota); production bật GEO
  (gửi `runGeo:true`) để chấm điểm AI Visibility.
