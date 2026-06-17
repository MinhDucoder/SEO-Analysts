# Spec: Cặp trang demo SEO "before/after" (closed-loop)

- **Ngày:** 2026-06-17
- **Branch:** improve/main
- **Trạng thái:** Design — chờ duyệt spec trước khi lập plan
- **Mục đích (C):** Demo bảo vệ đồ án + cover rule. Hai trang bán hàng tĩnh để load
  vào Chrome, bấm extension (hoặc gọi `/api/v1/public/check`), xem điểm + issues
  chênh lệch rõ rệt giữa bản BAD và bản GOOD.

## 1. Câu chuyện cốt lõi — Closed-loop (KHÔNG thương lượng)

Bản GOOD **không** được dựng độc lập. Nó là **kết quả thực thi đúng các gợi ý mà
chính app sinh ra** cho bản BAD. Vòng lặp:

```
① bad.html  ──chạy app──▶  ② bad-report.json
                            (score thấp + issues[] + AI suggestions)
                                      │  ③ export report
                                      ▼
                            ④ Áp dụng từng AI suggestion lên HTML
                              (bám đúng suggestion.text/rationale, không tự bịa hướng)
                                      ▼
                            ⑤ good.html  ──chạy lại app──▶ good-report.json
                                                          (score cao + sạch)
```

Hai lớp "AI" cần phân biệt khi trình bày:
1. **AI của app** — nằm trong `report.json` (gọi với `enrichMode: 'llm'`). Đây LÀ hướng fix.
2. **Khâu thực thi** — Claude đọc `bad-report.json` rồi sửa HTML theo đúng từng
   `suggestion`. Không nghĩ hướng mới.

**Thông điệp bảo vệ:** *"App tự phát hiện lỗi VÀ tự đề xuất cách sửa. Bản good là
kết quả thực thi đúng các đề xuất đó — bằng chứng là 2 file report.json export ra,
đối chiếu trực tiếp."*

### Hệ quả về thứ tự dựng (quan trọng)
Phải dựng `bad.html` TRƯỚC → chạy app lấy report → MỚI dựng `good.html` từ report.
Không được viết good song song với bad.

## 2. Cấu trúc file

```
apps/web/public/demo/
├── bad.html              # single-file, SEO kém, cố tình vi phạm ~18 rule
├── good.html             # single-file, SEO chuẩn — DẪN XUẤT từ bad-report.json
├── assets/               # 2–3 ảnh sản phẩm dùng chung (jpg nhẹ)
├── evidence/
│   ├── bad-report.json   # report THẬT của app trên bad.html
│   └── good-report.json  # report THẬT của app trên good.html
└── README.md             # bảng truy vết 4 cột (xem §6)
```

Truy cập khi demo: `http://localhost:3001/demo/bad.html` và `/demo/good.html`.
(Phương án hosting đã chốt = B: đặt trong `apps/web/public/` để có URL/HTTP thật,
nằm sẵn trong host_permissions của extension.)

## 3. Sản phẩm & ngôn ngữ

- **Sản phẩm:** "Cà phê Arabica Cầu Đất 250g – Rang Mộc". Cùng nội dung gốc (giá,
  mô tả, review, ảnh) cho cả 2 trang để **cô lập biến SEO**.
- **Ngôn ngữ nội dung:** Tiếng Việt, `lang="vi"`.
- **Thị giác:** BAD dựng cẩu thả (inline style sơ sài) — xấu cả thị giác lẫn SEO.
  GOOD polished (palette cà phê ấm, typography, hierarchy rõ) — tương phản kép.
- **targetKeyword** dùng khi gọi API: `"cà phê arabica cầu đất"`.

## 4. Mục tiêu điểm

- **BAD ≈ 30–40** (poor/đỏ) · **GOOD ≈ 90–95** (excellent/xanh).
- Điểm là **mục tiêu**, không phải cam kết tuyệt đối. Sau khi gọi app thật, nếu
  một vài rule transport/URL không đạt được trên localhost, ta GHI vào README
  thay vì ép số. Cụ thể caveat: `https-check` chạy trên `http://localhost` gần như
  chắc fail; `http-status`/`url-structure` phụ thuộc cách Next serve file tĩnh.
  → Trong khâu code sẽ ĐỌC rule thật (`apps/seo-analyzer/.../rules/`) để chốt
  điểm khả thi trước khi hứa con số trong slide.

## 5. Bảng mapping rule (kế hoạch cố ý vi phạm)

22 rule, 6 nhóm. Đây là *dự kiến* BAD vi phạm gì; bảng truy vết §6 mới là sự thật
sau khi app chấm.

| Nhóm | Rule | BAD (cố tình) | GOOD (mục tiêu) |
|---|---|---|---|
| Meta | title-tag | "Cà phê" (quá ngắn) | 50–60 ký tự, keyword + brand |
| Meta | meta-description | thiếu | 150–160 ký tự hấp dẫn |
| Meta | open-graph | không có | og:title/description/image/url/type |
| Meta | twitter-card | không có | summary_large_image đầy đủ |
| Heading | h1-tag | không có h1 (div to thay thế) | đúng 1 h1 chứa keyword |
| Heading | heading-hierarchy | nhảy cóc h1→h4 | h1→h2→h3 trật tự |
| Image | image-alt | ảnh không alt | alt mô tả mọi ảnh |
| Image | image-optimization | không width/height/lazy, ảnh nặng | dimensions + loading=lazy |
| Link | internal-links | ~0 | vài link nội bộ (/demo/...) |
| Link | external-links | thiếu rel | external có rel hợp lý |
| Link | broken-links | href="#" / hỏng | link hợp lệ |
| Tech | canonical-url | không có | `<link rel=canonical>` |
| Tech | favicon | không có | có favicon |
| Tech | schema-org | không có | JSON-LD Product+Offer+AggregateRating+Breadcrumb |
| Tech | language-tag | không `lang` | `lang="vi"` |
| Tech | viewport-meta | không có | có viewport |
| Tech | robots-meta | `noindex,nofollow` (lỗi chí mạng) | index,follow (hoặc bỏ hợp lý) |
| Tech | https-check | (transport — ghi caveat) | (ghi caveat README) |
| Tech | http-status | (phụ thuộc serve) | 200 |
| Tech | url-structure | (filename based) | path sạch |
| Content | readability | nhồi keyword / 1 khối text dài | đoạn ngắn, mạch lạc |
| Perf | page-size | phình (ảnh base64 to) | gọn nhẹ |

## 6. Artifact trình bày: bảng truy vết (README.md)

Cột "Issue app báo" và "Gợi ý app đưa" lấy **nguyên văn** từ `bad-report.json`
(`issues[].title`, `issues[].suggestion.text`). KHÔNG tự chế.

| Rule | Issue app báo (BAD) | Gợi ý app đưa (nguyên văn) | Đã sửa ở GOOD | Pass? |
|---|---|---|---|---|
| meta-description | … | … | … | ✅ |
| schema-org | … | … | … | ✅ |
| … | … | … | … | … |

Kèm: score BAD vs GOOD (lấy từ `meta`/`score` của 2 report), và caveat các rule
không đạt được trên localhost.

## 7. Annotation trên trang

HTML comment ngay cạnh chỗ vi phạm trong `bad.html`, ví dụ:
`<!-- ❌ meta-description: thiếu hoàn toàn (app báo ở bad-report.json) -->`
→ vô hình, KHÔNG bị scrape (Cheerio bỏ qua comment) → không nhiễu điểm. Bảng đầy
đủ nằm ở README.

## 8. Cách lấy report.json (contract & lệnh)

Endpoint: `POST /api/v1/public/check` (gateway, cổng 3000).
Auth: `Authorization: Bearer sk_(live|test)_...` (tạo key ở `/settings/api-keys`).

Request (HTML mode, bật AI suggestions):
```json
{
  "input": { "type": "html", "html": "<!doctype html>..." },
  "targetKeyword": "cà phê arabica cầu đất",
  "options": { "enrichMode": "llm", "language": "vi", "includeSummary": true }
}
```
Response rút gọn (đầy đủ tại `apps/extension/lib/api-types.ts`):
```
{ score, scoreBreakdown, issues[]: { ruleId, severity, category, title,
  description, suggestion: { type, text, rationale } | null, docRef },
  summary?, meta: { contentStats, ruleVersion, suggestionSource, ... } }
```

Lệnh khởi động stack (đã chốt = ghi rõ trong spec):
```bash
# 1. Bật full stack (gateway + DB×3 + Redis + các service)
npm run docker:up                 # dùng .env.docker

# 2. Tạo 1 API key (qua web /settings/api-keys hoặc seed) → export
export SEO_KEY="sk_test_..."

# 3. Gọi check cho BAD rồi GOOD, lưu evidence
#    (script nhỏ đọc file html → POST → ghi evidence/*.json; chi tiết ở plan)
```

> Lưu ý: vì `input.type=html`, một số rule URL/transport (https, http-status,
> canonical so khớp URL) dựa trên `resolvedUrl` hoặc bị skip. Khâu code phải đọc
> rule thật để biết rule nào dùng URL nào, rồi điều chỉnh kỳ vọng điểm.

## 9. Phạm vi (YAGNI)

TRONG phạm vi:
- 2 file HTML single-file + assets + README + 2 evidence JSON.
- 1 script nhỏ gọi `/public/check` và lưu evidence (Node, dùng `fetch`).

NGOÀI phạm vi:
- Không sửa code app/extension/gateway.
- Không tự động hóa CI cho demo.
- Không tạo nhiều sản phẩm/biến thể — đúng 1 cặp.
- Không chụp/annotate ảnh popup tự động (có thể chụp tay khi demo nếu muốn slide).

## 10. Tiêu chí thành công

1. `bad.html` mở được ở `localhost:3001/demo/bad.html`, app chấm điểm thấp (~30–40),
   `bad-report.json` chứa issues + AI suggestions thật.
2. `good.html` được dựng **chỉ** bằng cách áp dụng suggestion trong `bad-report.json`;
   mỗi thay đổi truy được về 1 dòng trong README.
3. App chấm `good.html` cao hơn rõ rệt (~90+ hoặc mức cao nhất khả thi trên localhost,
   có caveat ghi rõ).
4. README đối chiếu BAD↔GOOD đầy đủ, dùng nguyên văn output của app.
5. Cả hai trang là single-file, không phụ thuộc build, mở trực tiếp được.
