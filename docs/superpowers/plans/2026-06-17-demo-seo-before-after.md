# Demo SEO "before/after" (closed-loop) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo cặp trang bán hàng tĩnh `bad.html` / `good.html` (cà phê Arabica Cầu Đất) trong `apps/web/public/demo/`, trong đó `good.html` được **dẫn xuất từ chính output của app** trên `bad.html`, kèm bằng chứng (2 file report.json) và bảng truy vết README.

**Architecture:** Dựng `bad.html` (cố tình vi phạm ~18 SEO rule) → chạy app qua CLI `@repo/seo-check-cli` (HTML mode, `enrichMode=llm`) → lưu `evidence/bad-report.json` → áp dụng từng `issues[].suggestion` để dựng `good.html` → chạy lại → `evidence/good-report.json` → viết `README.md` đối chiếu. Không sửa code app/extension/gateway.

**Tech Stack:** HTML/CSS tĩnh single-file; `@repo/seo-check-cli` (Node CLI) gọi `POST /api/v1/public/check`; stack qua `npm run docker:up`. Spec nguồn: `docs/superpowers/specs/2026-06-17-demo-seo-before-after-design.md`.

---

## File Structure

```
apps/web/public/demo/
├── bad.html              # Task 2 — single-file, SEO kém + HTML-comment annotation
├── good.html             # Task 4 — dẫn xuất từ bad-report.json
├── assets/
│   ├── product.svg       # Task 1 — ảnh sản phẩm (dùng cho cả 2 trang)
│   └── badge.svg         # Task 1 — icon nhỏ (huy hiệu rang mộc)
├── evidence/
│   ├── bad-report.json   # Task 3 — report THẬT của app trên bad.html
│   └── good-report.json  # Task 5 — report THẬT của app trên good.html
└── README.md             # Task 6 — bảng truy vết 4 cột + điểm + caveat
```

**Hằng số dùng xuyên suốt (đừng đổi giữa chừng):**
- `targetKeyword` = `cà phê arabica cầu đất`
- Brand = `Núi Cao Coffee`
- Canonical GOOD = `http://localhost:3001/demo/good.html`
- CLI: `node packages/seo-check-cli/dist/cli.js` · api-base mặc định `http://localhost:3000/api/v1` · key đọc từ env `SEO_API_KEY`.

---

## Task 0: Chuẩn bị môi trường (ENV — phần lớn do người dùng)

**Files:** (không tạo file)

- [ ] **Step 1: Bật full stack** *(ENV — user chạy, executor chờ)*

Run: `npm run docker:up`
Expected: gateway healthy ở `http://localhost:3000`, web ở `http://localhost:3001`. Kiểm:
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/health` → `200` (hoặc route health tương đương).

- [ ] **Step 2: Tạo API key** *(ENV — user)*

Mở `http://localhost:3001/settings/api-keys` → tạo key `sk_test_...` → copy.
(Nếu có seed test key trong `scripts/seed-test-data.sh` thì dùng key đó.)

- [ ] **Step 3: Export key cho CLI** *(ENV — user, hoặc executor trong cùng shell)*

```bash
export SEO_API_KEY="sk_test_...."   # dán key vừa tạo
```

- [ ] **Step 4: Build CLI**

Run: `npm run build -w @repo/seo-check-cli`
Expected: tạo `packages/seo-check-cli/dist/cli.js` (build PASS).

- [ ] **Step 5: Smoke-test CLI gọi được gateway**

Run:
```bash
printf '<!doctype html><html><head><title>hi</title></head><body><h1>hi</h1></body></html>' > /tmp/smoke.html
node packages/seo-check-cli/dist/cli.js --file /tmp/smoke.html --mode html --keyword "test" --enrich template --format json | head -c 200; echo
```
Expected: in ra JSON bắt đầu `{"score":` (không lỗi auth/network). Nếu lỗi `401/403` → key sai; `ECONNREFUSED` → stack chưa lên. Sửa trước khi đi tiếp.

> Ghi chú: `--enrich llm` cần `SEO_AI_*` cấu hình ở gateway. Nếu LLM không sẵn, `meta.degraded=true` và `suggestionSource` rơi về `template`/`none` — **vẫn chấp nhận được**: gợi ý template vẫn là "do app sinh". Plan ưu tiên `llm`, fallback `template`.

---

## Task 1: Scaffold thư mục demo + assets dùng chung

**Files:**
- Create: `apps/web/public/demo/assets/product.svg`
- Create: `apps/web/public/demo/assets/badge.svg`

- [ ] **Step 1: Tạo ảnh sản phẩm SVG**

File: `apps/web/public/demo/assets/product.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9dcc8"/><stop offset="1" stop-color="#d7c2a3"/>
    </linearGradient>
    <linearGradient id="bag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b3a21"/><stop offset="1" stop-color="#3a2414"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" fill="url(#bg)"/>
  <rect x="210" y="150" width="220" height="340" rx="14" fill="url(#bag)"/>
  <rect x="232" y="190" width="176" height="120" rx="8" fill="#efe6d6"/>
  <text x="320" y="245" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#3a2414">ARABICA</text>
  <text x="320" y="280" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#7a5638">Cầu Đất 250g</text>
  <circle cx="320" cy="395" r="42" fill="#c98a3a"/>
  <text x="320" y="404" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#fff">Rang Mộc</text>
</svg>
```

- [ ] **Step 2: Tạo icon huy hiệu SVG**

File: `apps/web/public/demo/assets/badge.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img">
  <circle cx="48" cy="48" r="44" fill="#3a2414"/>
  <circle cx="48" cy="48" r="44" fill="none" stroke="#c98a3a" stroke-width="3"/>
  <text x="48" y="44" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#efe6d6">RANG</text>
  <text x="48" y="62" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#efe6d6">MỘC</text>
</svg>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/demo/assets/product.svg apps/web/public/demo/assets/badge.svg
git commit -m "feat(demo): add shared coffee product assets"
```

---

## Task 2: Dựng `bad.html` (cố tình vi phạm rule)

**Files:**
- Create: `apps/web/public/demo/bad.html`

Vi phạm cố tình (HTML-comment ghi rõ từng cái): no `lang`, no viewport, title quá ngắn, no meta description, no canonical, no favicon, no OG, no twitter, `robots=noindex,nofollow`, no JSON-LD, không có `h1` (dùng div), nhảy heading h?→h4, ảnh không `alt`/`width`/`height`/`loading`, link `href="#"` + external thiếu `rel`, không có internal link, content nhồi keyword 1 khối, HTML bloat bằng comment lớn.

- [ ] **Step 1: Viết `bad.html`**

File: `apps/web/public/demo/bad.html`
```html
<!doctype html>
<!-- ❌ language-tag: <html> KHÔNG có thuộc tính lang -->
<html>
<head>
  <meta charset="utf-8">
  <!-- ❌ viewport-meta: thiếu <meta name="viewport"> -->
  <!-- ❌ title-tag: tiêu đề quá ngắn (< 10 ký tự) -->
  <title>Cà phê</title>
  <!-- ❌ meta-description: thiếu hoàn toàn -->
  <!-- ❌ canonical-url: thiếu <link rel="canonical"> -->
  <!-- ❌ favicon: thiếu <link rel="icon"> -->
  <!-- ❌ open-graph: thiếu toàn bộ og:* -->
  <!-- ❌ twitter-card: thiếu toàn bộ twitter:* -->
  <!-- ❌ robots-meta: noindex,nofollow — chặn Google index (lỗi chí mạng) -->
  <meta name="robots" content="noindex, nofollow">
  <!-- ❌ schema-org: KHÔNG có JSON-LD structured data -->
  <style>
    body{font-family:Arial;margin:8px;color:#222}
    .title{font-size:30px;font-weight:bold}
    img{max-width:320px}
    a{color:blue}
  </style>
</head>
<body>
  <!-- ❌ h1-tag: dùng <div> giả tiêu đề, KHÔNG có <h1> -->
  <div class="title">Cà phê arabica cầu đất bán ở đây</div>

  <!-- ❌ heading-hierarchy: nhảy thẳng xuống <h4>, bỏ h1/h2/h3 -->
  <h4>Thông tin</h4>

  <!-- ❌ image-alt + image-optimization: không alt, không width/height, không loading -->
  <img src="assets/product.svg">
  <img src="assets/product.svg">

  <!-- ❌ readability + keyword-stuffing: 1 khối text dài, nhồi từ khóa -->
  <p>Cà phê arabica cầu đất là cà phê arabica cầu đất ngon nhất, mua cà phê arabica cầu đất giá rẻ, cà phê arabica cầu đất nguyên chất, cà phê arabica cầu đất rang mộc, cà phê arabica cầu đất 250g, cà phê arabica cầu đất chính hãng, ai cần cà phê arabica cầu đất thì mua cà phê arabica cầu đất ngay vì cà phê arabica cầu đất rất tuyệt và cà phê arabica cầu đất luôn thơm ngon đậm đà khó cưỡng nên hãy chọn cà phê arabica cầu đất của chúng tôi để có cà phê arabica cầu đất tốt nhất thị trường hiện nay.</p>

  <!-- ❌ broken-links: href="#" (link rỗng) -->
  <a href="#">Mua ngay</a>
  <!-- ❌ external-links: link ngoài thiếu rel; ❌ internal-links: không có link nội bộ -->
  <a href="https://facebook.com">Facebook</a>

  <!-- ❌ page-size: bloat bằng comment lớn (đẩy kích thước HTML vượt ngưỡng).
       Nếu report KHÔNG báo page-size, tăng độ dài đoạn padding dưới đây.
       PADDING:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       PADDING:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       PADDING:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       (lặp khối PADDING này ~50 lần khi cần để vượt ngưỡng page-size) -->
</body>
</html>
```

- [ ] **Step 2: Kiểm HTML mở được & comment vô hình**

Run: `npx --yes http-server apps/web/public/demo -p 4599 -c-1 >/tmp/hs.log 2>&1 & sleep 1; curl -s http://localhost:4599/bad.html | grep -c "PADDING:"; kill %1 2>/dev/null`
Expected: in số > 0 (comment tồn tại trong nguồn). Mở bằng mắt: trang hiển thị tiêu đề + 2 ảnh + đoạn text (annotation không hiện trên màn hình).

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/demo/bad.html
git commit -m "feat(demo): add bad.html with deliberate SEO violations"
```

---

## Task 3: Chạy app trên `bad.html` → lưu `bad-report.json`

**Files:**
- Create: `apps/web/public/demo/evidence/bad-report.json`

- [ ] **Step 1: Tạo thư mục evidence**

Run: `mkdir -p apps/web/public/demo/evidence`

- [ ] **Step 2: Gọi app (HTML mode) và lưu report**

Run:
```bash
node packages/seo-check-cli/dist/cli.js \
  --file apps/web/public/demo/bad.html --mode html \
  --keyword "cà phê arabica cầu đất" --enrich llm --language vi \
  --format json > apps/web/public/demo/evidence/bad-report.json
```
Nếu `meta.degraded=true` hoặc lỗi LLM → chạy lại với `--enrich template`.
Expected: file JSON hợp lệ.

- [ ] **Step 3: Verify điểm thấp + có issues + có suggestion**

Run:
```bash
node -e "const r=require('./apps/web/public/demo/evidence/bad-report.json');console.log('score',r.score);console.log('issues',r.issues.length);console.log('withSuggestion',r.issues.filter(i=>i.suggestion).length);console.log('rules',r.issues.map(i=>i.ruleId).join(','))"
```
Expected: `score` ≈ 30–50 (thấp); `issues` ≥ 8; `withSuggestion` ≥ 5; danh sách `rules` chứa các rule đã cố tình vi phạm (vd `meta-description`, `h1-tag`, `image-alt`, `open-graph`, `canonical-url`, `schema-org`, `robots-meta`...).

- [ ] **Step 4: Nếu thiếu rule kỳ vọng → chỉnh bad.html rồi chạy lại**

Nếu rule nào *không* xuất hiện trong report (vd `page-size` không báo) → quay lại `bad.html`, tăng/sửa vi phạm tương ứng (vd lặp thêm khối PADDING), chạy lại Step 2–3. Lặp đến khi report phản ánh đúng các vi phạm cố ý (hoặc ghi nhận rule nào không áp dụng được ở HTML mode để đưa vào caveat README).

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/demo/evidence/bad-report.json apps/web/public/demo/bad.html
git commit -m "feat(demo): capture bad.html app report (evidence)"
```

---

## Task 4: Dựng `good.html` bằng cách áp dụng gợi ý trong `bad-report.json`

**Files:**
- Create: `apps/web/public/demo/good.html`

> **Nguyên tắc closed-loop:** mỗi sửa đổi ở `good.html` phải tương ứng 1 `issue` trong `bad-report.json`. Dưới đây là `good.html` mục tiêu (kết quả kỳ vọng của việc áp dụng gợi ý). **Step 2** bắt buộc đối chiếu với report thật và chỉnh wording/độ dài cho khớp gợi ý app đưa.

- [ ] **Step 1: Viết `good.html`**

File: `apps/web/public/demo/good.html`
```html
<!doctype html>
<!-- ✅ language-tag -->
<html lang="vi">
<head>
  <meta charset="utf-8">
  <!-- ✅ viewport-meta -->
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- ✅ title-tag: 50–60 ký tự, có keyword + brand -->
  <title>Cà Phê Arabica Cầu Đất 250g – Rang Mộc | Núi Cao Coffee</title>
  <!-- ✅ meta-description: 150–160 ký tự -->
  <meta name="description" content="Cà phê Arabica Cầu Đất 250g rang mộc nguyên chất từ vùng cao 1.650m. Hương hoa, hậu ngọt, axit thanh. Giao nhanh, đổi trả 7 ngày. Đặt mua ngay hôm nay.">
  <!-- ✅ canonical-url -->
  <link rel="canonical" href="http://localhost:3001/demo/good.html">
  <!-- ✅ favicon -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <!-- ✅ robots-meta -->
  <meta name="robots" content="index, follow">
  <!-- ✅ open-graph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="Cà Phê Arabica Cầu Đất 250g – Rang Mộc">
  <meta property="og:description" content="Arabica Cầu Đất rang mộc nguyên chất, hương hoa hậu ngọt. Đặt mua tại Núi Cao Coffee.">
  <meta property="og:image" content="http://localhost:3001/demo/assets/product.svg">
  <meta property="og:url" content="http://localhost:3001/demo/good.html">
  <!-- ✅ twitter-card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Cà Phê Arabica Cầu Đất 250g – Rang Mộc">
  <meta name="twitter:description" content="Arabica Cầu Đất rang mộc nguyên chất, hương hoa hậu ngọt.">
  <meta name="twitter:image" content="http://localhost:3001/demo/assets/product.svg">
  <!-- ✅ schema-org: Product + Offer + AggregateRating + BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Cà Phê Arabica Cầu Đất 250g – Rang Mộc",
    "image": "http://localhost:3001/demo/assets/product.svg",
    "description": "Cà phê Arabica Cầu Đất 250g rang mộc nguyên chất từ vùng cao 1.650m.",
    "brand": { "@type": "Brand", "name": "Núi Cao Coffee" },
    "offers": {
      "@type": "Offer",
      "price": "145000",
      "priceCurrency": "VND",
      "availability": "https://schema.org/InStock",
      "url": "http://localhost:3001/demo/good.html"
    },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "126" }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": "http://localhost:3001/demo/good.html" },
      { "@type": "ListItem", "position": 2, "name": "Cà phê hạt", "item": "http://localhost:3001/demo/good.html#ca-phe-hat" },
      { "@type": "ListItem", "position": 3, "name": "Arabica Cầu Đất 250g" }
    ]
  }
  </script>
  <style>
    :root{--bg:#faf6ef;--ink:#2c1d12;--muted:#6b5743;--accent:#9a5b27;--card:#fff;--line:#e7dccb}
    *{box-sizing:border-box}
    body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;color:var(--ink);background:var(--bg);line-height:1.6}
    header{display:flex;align-items:center;gap:10px;padding:16px 24px;border-bottom:1px solid var(--line)}
    header img{width:36px;height:36px}
    nav a{margin-left:16px;color:var(--muted);text-decoration:none;font-size:14px}
    main{max-width:980px;margin:0 auto;padding:24px}
    .hero{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center}
    .hero img{width:100%;height:auto;border-radius:16px;border:1px solid var(--line)}
    h1{font-size:30px;line-height:1.25;margin:0 0 8px}
    .price{font-size:28px;color:var(--accent);font-weight:700;margin:12px 0}
    .buy{display:inline-block;background:var(--accent);color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600}
    section{margin-top:40px}
    h2{font-size:22px;border-left:4px solid var(--accent);padding-left:10px}
    h3{font-size:17px;margin-bottom:4px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
    footer{border-top:1px solid var(--line);margin-top:48px;padding:24px;color:var(--muted);font-size:13px}
    @media(max-width:720px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header>
    <img src="assets/badge.svg" width="36" height="36" alt="Logo Núi Cao Coffee" loading="lazy">
    <strong>Núi Cao Coffee</strong>
    <!-- ✅ internal-links -->
    <nav>
      <a href="/demo/good.html#mo-ta">Mô tả</a>
      <a href="/demo/good.html#danh-gia">Đánh giá</a>
      <a href="/demo/bad.html">Sản phẩm khác</a>
    </nav>
  </header>

  <main>
    <div class="hero">
      <!-- ✅ image-alt + image-optimization -->
      <img src="assets/product.svg" width="640" height="640"
           alt="Túi cà phê Arabica Cầu Đất 250g rang mộc của Núi Cao Coffee" loading="lazy">
      <div>
        <!-- ✅ h1-tag: đúng 1 h1 chứa keyword -->
        <h1>Cà Phê Arabica Cầu Đất 250g – Rang Mộc</h1>
        <p>Hạt Arabica trồng ở độ cao 1.650m vùng Cầu Đất, rang mộc giữ trọn hương hoa và hậu ngọt tự nhiên.</p>
        <div class="price">145.000đ</div>
        <!-- ✅ broken-links: href hợp lệ -->
        <a class="buy" href="/demo/good.html#dat-mua">Đặt mua ngay</a>
      </div>
    </div>

    <!-- ✅ heading-hierarchy: h1 → h2 → h3 -->
    <section id="mo-ta">
      <h2>Mô tả sản phẩm</h2>
      <p>Arabica Cầu Đất là dòng cà phê đặc sản nổi tiếng của Đà Lạt. Mỗi mẻ được rang mộc thủ công, không pha trộn, giữ nguyên đặc trưng vùng trồng.</p>
      <div class="grid">
        <div class="card"><h3>Vùng trồng</h3><p>Cầu Đất, Đà Lạt — độ cao 1.650m, khí hậu mát quanh năm.</p></div>
        <div class="card"><h3>Hương vị</h3><p>Hương hoa nhẹ, vị chua thanh, hậu ngọt kéo dài.</p></div>
        <div class="card"><h3>Cách rang</h3><p>Rang mộc medium, đóng gói van 1 chiều giữ hương.</p></div>
      </div>
    </section>

    <section id="danh-gia">
      <h2>Đánh giá khách hàng</h2>
      <h3>Minh — 5★</h3>
      <p>Pha phin rất hợp, hương thơm tự nhiên, sẽ mua lại.</p>
      <h3>Lan — 5★</h3>
      <p>Đóng gói chắc chắn, cà phê tươi, vị sạch.</p>
    </section>

    <section>
      <h2>Nguồn gốc &amp; chứng nhận</h2>
      <p>Tham khảo thêm về vùng trồng tại
        <!-- ✅ external-links: có rel -->
        <a href="https://vi.wikipedia.org/wiki/C%E1%BA%A7u_%C4%90%E1%BA%A5t" rel="noopener nofollow" target="_blank">Cầu Đất (Wikipedia)</a>.
      </p>
    </section>
  </main>

  <footer>© 2026 Núi Cao Coffee · Cà phê đặc sản Cầu Đất</footer>
</body>
</html>
```

- [ ] **Step 2: Đối chiếu từng issue trong `bad-report.json` với `good.html`**

Run:
```bash
node -e "const r=require('./apps/web/public/demo/evidence/bad-report.json');for(const i of r.issues){console.log('-',i.ruleId,'|',i.title,'=>',(i.suggestion&&i.suggestion.text)||'(no suggestion)')}"
```
Với MỖI dòng in ra: xác nhận `good.html` đã xử lý đúng theo `suggestion.text`. Nếu gợi ý app khác giả định (vd yêu cầu độ dài title khác, hoặc field schema khác) → **sửa `good.html` cho khớp gợi ý app**, không giữ giả định. Ghi lại cặp (issue → cách sửa) để dùng ở Task 6.

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/demo/good.html
git commit -m "feat(demo): add good.html derived from app suggestions"
```

---

## Task 5: Chạy app trên `good.html` → lưu `good-report.json` + verify cải thiện

**Files:**
- Create: `apps/web/public/demo/evidence/good-report.json`

- [ ] **Step 1: Gọi app trên good.html**

Run:
```bash
node packages/seo-check-cli/dist/cli.js \
  --file apps/web/public/demo/good.html --mode html \
  --keyword "cà phê arabica cầu đất" --enrich llm --language vi \
  --format json > apps/web/public/demo/evidence/good-report.json
```
(Dùng cùng `--enrich` mode đã dùng ở Task 3 để so sánh công bằng.)

- [ ] **Step 2: Verify điểm tăng rõ rệt + issues giảm**

Run:
```bash
node -e "const b=require('./apps/web/public/demo/evidence/bad-report.json'),g=require('./apps/web/public/demo/evidence/good-report.json');console.log('BAD',b.score,'->','GOOD',g.score);console.log('issues',b.issues.length,'->',g.issues.length);console.log('remaining',g.issues.map(i=>i.ruleId).join(','))"
```
Expected: `GOOD` score cao hơn rõ rệt (mục tiêu ≥ 85; tối thiểu chấp nhận: cao hơn BAD ≥ 40 điểm). `issues` GOOD giảm mạnh. `remaining` chỉ còn các rule không thể đạt ở localhost/html-mode (vd `https-check`).

- [ ] **Step 3: Nếu GOOD chưa đạt → vòng lặp sửa**

Nếu còn issue *có thể sửa* trong `good.html` (không phải transport/localhost) → áp dụng tiếp `suggestion` của issue đó vào `good.html`, chạy lại Step 1–2. Tối đa 3 vòng. Issue còn lại không sửa được ở localhost → đưa vào caveat README (Task 6), không ép điểm.

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/demo/evidence/good-report.json apps/web/public/demo/good.html
git commit -m "feat(demo): capture good.html app report (evidence)"
```

---

## Task 6: Viết `README.md` bảng truy vết (từ output thật)

**Files:**
- Create: `apps/web/public/demo/README.md`

- [ ] **Step 1: Sinh khung bảng truy vết từ bad-report.json**

Run (in markdown rows ra để dán/đối chiếu):
```bash
node -e "const b=require('./apps/web/public/demo/evidence/bad-report.json');for(const i of b.issues){const s=(i.suggestion&&i.suggestion.text)||'';console.log('| '+i.ruleId+' | '+i.title.replace(/\|/g,'/')+' | '+s.replace(/\|/g,'/').replace(/\n/g,' ')+' |  | ✅ |')}"
```

- [ ] **Step 2: Viết README hoàn chỉnh**

File: `apps/web/public/demo/README.md` (thay `<BAD_SCORE>`/`<GOOD_SCORE>` bằng số thật từ 2 report; dán các dòng bảng từ Step 1 rồi điền cột "Đã sửa ở GOOD" theo Task 4 Step 2):
```markdown
# Demo SEO before/after — Cà Phê Arabica Cầu Đất

Cặp trang minh hoạ vòng lặp **đóng** của hệ thống SEO Analyst:
`bad.html` → app phát hiện lỗi + đề xuất (AI suggestions) → áp dụng đề xuất → `good.html`.

## Cách chạy demo

1. `npm run docker:up` (gateway + web).
2. Mở `http://localhost:3001/demo/bad.html` → bấm extension → score thấp.
3. Mở `http://localhost:3001/demo/good.html` → bấm extension → score cao.
4. Đối chiếu bằng chứng: `evidence/bad-report.json` ↔ `evidence/good-report.json`.

## Kết quả

| | Score | Số issues |
|---|---|---|
| bad.html  | <BAD_SCORE>  | <BAD_ISSUES> |
| good.html | <GOOD_SCORE> | <GOOD_ISSUES> |

## Bảng truy vết: lỗi app báo → gợi ý app → việc đã làm

> Cột "Issue app báo" và "Gợi ý app đưa" lấy **nguyên văn** từ `evidence/bad-report.json`.

| Rule | Issue app báo (BAD) | Gợi ý app đưa | Đã sửa ở GOOD |
|---|---|---|---|
| <dán các dòng từ Step 1, điền cột cuối> |

## Caveat (rule không đạt được ở localhost/HTML mode)

- `https-check`: trang chạy `http://localhost` → không thể đạt trên môi trường demo.
- <liệt kê các rule còn trong good-report.json không sửa được, kèm lý do>.
```

- [ ] **Step 3: Verify không còn placeholder**

Run: `grep -nE "<BAD_SCORE>|<GOOD_SCORE>|<BAD_ISSUES>|<GOOD_ISSUES>|dán các dòng" apps/web/public/demo/README.md`
Expected: KHÔNG có dòng nào in ra (đã thay hết bằng số/nội dung thật).

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/demo/README.md
git commit -m "docs(demo): add before/after traceability README"
```

---

## Task 7: Verify tổng thể qua web server thật

**Files:** (không tạo file)

- [ ] **Step 1: Hai trang serve được ở localhost:3001**

Run:
```bash
for p in bad good; do echo -n "$p "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/demo/$p.html; done
```
Expected: `bad 200` và `good 200`. (Cần web dev/đã `docker:up`.)

- [ ] **Step 2: Annotation không lọt vào nội dung hiển thị của bad**

Run: `curl -s http://localhost:3001/demo/bad.html | grep -c "<!-- ❌"`
Expected: > 0 (annotation tồn tại trong nguồn dạng comment, không phải text hiển thị).

- [ ] **Step 3: (Tùy chọn) Test bằng extension thật cho ảnh slide**

Load extension (`apps/extension/.output/chrome-mv3-dev`), mở 2 trang, bấm extension, chụp popup BAD (đỏ) và GOOD (xanh) cho slide bảo vệ.

- [ ] **Step 4: Verify sạch & tổng kết**

Run: `git log --oneline -8 && ls -R apps/web/public/demo`
Expected: thấy đủ các commit demo + cây file đúng cấu trúc §File Structure.

---

## Self-review notes (đã rà)

- **Spec coverage:** closed-loop (§1)→Task 3/4/5; cấu trúc file (§2)→Task 1–6; sản phẩm/ngôn ngữ (§3)→Task 2/4; điểm mục tiêu + caveat (§4)→Task 5/6; mapping rule (§5)→Task 2; bảng truy vết (§6)→Task 6; annotation (§7)→Task 2 + Task 7 Step 2; contract/lệnh (§8)→Task 0/3/5; phạm vi (§9)→không sửa app, tái dùng CLI; tiêu chí thành công (§10)→Task 5 verify + Task 7.
- **Placeholder:** README placeholder `<...>` có Step verify (Task 6 Step 3) ép thay hết; bad.html PADDING có hướng dẫn cụ thể.
- **Type/hằng số:** `targetKeyword`, brand, canonical URL, lệnh CLI thống nhất ở khối "Hằng số" và mọi task.
```
