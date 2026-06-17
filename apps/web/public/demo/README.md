# Demo SEO before/after — Cà Phê Arabica Cầu Đất

Cặp trang minh hoạ **vòng lặp đóng (closed-loop)** của hệ thống SEO Analyst:

> `bad.html` → app phát hiện lỗi + đưa gợi ý sửa → áp dụng đúng các gợi ý → `good.html`.

`bad.html` là **một trang bán hàng cơ bản, trông như shop thật** (có header, nav,
ảnh, giá, mô tả, đánh giá, footer) — nhưng **không làm SEO** (thiếu meta, og,
schema, alt, canonical, h1 đúng nghĩa, lang, viewport; sót `noindex`). Đây là kịch
bản rất hay gặp ngoài thực tế.

`good.html` **không** được dựng tuỳ ý — mỗi sửa đổi bám theo một gợi ý có thật
trong `evidence/bad-report.json` (xem bảng truy vết bên dưới).

## Kết quả

| | Điểm SEO | Số rule còn lỗi |
|---|---|---|
| **bad.html**  | **22 / 100** (poor) | 14 |
| **good.html** | **81 / 100** (good) | 4 |

Điểm theo nhóm (scoreBreakdown):

| Nhóm | bad | good |
|---|---|---|
| meta | 0 | 50¹ |
| headings | 0 | 100 |
| images | 0 | 100 |
| links | 100 | 100 |
| technical | 13 | 81² |
| content | 100 | 100 |

¹ meta chưa đạt 100 do bug parser og/twitter của app — xem Caveat.
² technical chưa 100 do `https_check` (localhost http) + `canonical_url` (html-mode) — xem Caveat.

> Trang bad đã đạt sẵn nhóm **links** (100) vì có thanh nav nội bộ thật — đúng tinh
> thần "shop thật nhưng quên SEO". Tương phản nằm ở meta/headings/images/technical.

## Cách chạy demo

```bash
# 1. Bật stack (gateway + seo-analyzer + DB + Redis)
colima start
docker-compose --env-file .env.docker up -d --no-deps seo-analyzer gateway   # html-mode chỉ cần 2 service này

# 2. Phục vụ 2 trang (web app, hoặc static server bất kỳ)
#    Trang được thiết kế cho http://localhost:3001/demo/{bad,good}.html

# 3a. Test bằng Chrome extension: mở 2 URL → bấm extension → so điểm.
# 3b. Hoặc tái tạo bằng chứng bằng CLI:
export SEO_API_KEY="sk_test_..."   # tạo tại /settings/api-keys hoặc qua API
node packages/seo-check-cli/dist/cli.js --file apps/web/public/demo/bad.html  --mode html --keyword "cà phê arabica cầu đất" --enrich llm --language vi --format json
node packages/seo-check-cli/dist/cli.js --file apps/web/public/demo/good.html --mode html --keyword "cà phê arabica cầu đất" --enrich llm --language vi --format json
```

Bằng chứng đã lưu: [`evidence/bad-report.json`](evidence/bad-report.json) ↔ [`evidence/good-report.json`](evidence/good-report.json).

## Bảng truy vết: lỗi app báo → gợi ý app → việc đã làm

Cột "Issue app báo" và "Gợi ý app đưa" lấy **nguyên văn** từ `evidence/bad-report.json`
(`issues[].title`, `issues[].suggestion.text`).

| Rule | Issue app báo (BAD) | Gợi ý app đưa | Đã sửa ở GOOD | Pass? |
|---|---|---|---|---|
| title_tag | Title length 14 is out of range | Add a title between 50 and 60 characters that includes the primary keyword. | `<title>` 55 ký tự, chứa keyword + brand | ✅ |
| meta_description | Meta description is missing | Add a meta description between 120 and 160 characters. | `<meta name=description>` 151 ký tự | ✅ |
| h1_tag | No H1 tag found | Add exactly one H1 that describes the page topic. | Đúng 1 `<h1>` chứa keyword (thay vì div) | ✅ |
| heading_hierarchy | Heading hierarchy has major structural issues | Start with a single H1, then use H2/H3 in order without jumping levels. | h1 → h2 → h3 đúng thứ tự | ✅ |
| image_alt | Only 0% of images have alt text | Add descriptive alt attributes to improve accessibility and SEO. | `alt` mô tả cho 100% ảnh | ✅ |
| robots_meta | Page has noindex directive | Remove noindex if the page should appear in search results. | `content="index, follow"` | ✅ |
| viewport_meta | Viewport meta tag is missing | Add `<meta name="viewport" content="width=device-width, initial-scale=1">`. | Đã thêm viewport | ✅ |
| schema_org | No structured data (JSON-LD) found | Add schema.org JSON-LD for Article, Product, FAQ, etc. | JSON-LD Product+Offer+AggregateRating + Breadcrumb (2 block) | ✅ |
| language_tag | HTML lang attribute is missing | Add lang attribute to `<html>` element. | `<html lang="vi">` | ✅ |
| favicon | Favicon is missing | Add `<link rel="icon" href="/favicon.ico">`. | `<link rel="icon" href="/favicon.svg">` | ✅ |
| open_graph | No Open Graph tags found | Add og:title, og:description, and og:image for better social sharing. | Đã thêm đủ og:* — **nhưng app vẫn báo thiếu** (bug parser, xem Caveat) | ⚠️ |
| twitter_card | Twitter card is missing | Add `<meta name="twitter:card" content="summary_large_image">`. | Đã thêm đủ twitter:* — **nhưng app vẫn báo thiếu** (bug parser, xem Caveat) | ⚠️ |
| canonical_url | Canonical URL is missing | Add `<link rel="canonical" href="...">`. | Đã thêm canonical — good báo "khác domain" do html-mode không có URL gốc | ⚠️ |
| https_check | Page is served over HTTP | Install a TLS certificate and redirect HTTP to HTTPS. | Không thể đạt trên `localhost` http | ⚠️ |

**10 rule chuyển fail → pass** nhờ áp dụng gợi ý của app. (Nhóm `links` bad đã đạt
sẵn nên không nằm trong danh sách "fix".)

## Caveat (4 rule còn báo ở GOOD — không phải lỗi của trang)

1. **open_graph & twitter_card** — *bug của app, không phải của trang.*
   `page-data-builder` lưu key đã bỏ tiền tố (`title`, `card`…) nhưng rule lại tra
   key có tiền tố (`og:title`, `twitter:card`) → không trang nào pass được 2 rule
   này, kể cả trang đúng chuẩn. `good.html` **đã có đầy đủ** thẻ og:* và twitter:*
   (xem source). Bug đã được ghi nhận để sửa riêng (ngoài phạm vi demo này).
2. **canonical_url** — `good.html` có `<link rel="canonical">` hợp lệ; app báo "khác
   domain" vì chạy ở **html-mode** (gửi HTML, không có URL gốc để so khớp). Ở
   url-mode trên domain thật, rule này pass.
3. **https_check** — trang phục vụ qua `http://localhost` nên không thể đạt; trên
   domain production có TLS sẽ pass.

→ Trên môi trường production thật (url-mode + HTTPS) và sau khi sửa bug og/twitter,
`good.html` sẽ đạt ~95+.

## Annotation

`bad.html` có chú thích `<!-- ❌ ... -->` ngay cạnh mỗi chỗ vi phạm. Đây là HTML
comment → **không hiển thị** trên trang và **không bị scrape** (không ảnh hưởng điểm).
