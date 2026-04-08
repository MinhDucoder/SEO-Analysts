# /knowledge $ARGUMENTS

Bạn đang thực hiện bước tổng hợp kiến thức chuyên sâu về: **$ARGUMENTS**

Mục tiêu: Xây dựng Personal Engineering Knowledge Base.

Thực hiện tuần tự các bước sau:

--------------------------------------------------
STEP 1 — THU THẬP & CHUẨN HÓA NGỮ CẢNH
--------------------------------------------------

1. Phân tích toàn bộ conversation gần nhất liên quan đến $ARGUMENTS.
2. Trích xuất có cấu trúc:
   - Core concept (khái niệm chính xác, không mơ hồ)
   - Mental model / framework
   - Architecture pattern (nếu có)
   - Code pattern (nếu có)
   - Anti-pattern / sai lầm thường gặp
   - Insight nâng cao
   - Ứng dụng thực tế

3. Nếu có code:
   - Trích dẫn snippet quan trọng
   - So sánh trước/sau nếu có evolution
   - Giải thích rõ WHY (không chỉ WHAT)

4. Nếu thiếu thông tin → suy luận từ technical context, không hỏi lại user.

--------------------------------------------------
STEP 2 — PHÂN TÍCH Ở MỨC CHUYÊN GIA
--------------------------------------------------

BẮT BUỘC bao gồm:

1. Định nghĩa chuẩn (technical definition)
2. Mental model có thể áp dụng lại
3. Tại sao quan trọng trong bối cảnh 2026 (AI + automation era)
4. So sánh với approach khác
5. Trade-offs
6. Liên hệ trực tiếp với: Backend (NestJS), React (Next.js), SEO Analysis, System Design

Viết theo tư duy: Tech Lead / System Architect / Builder mindset.
Không viết kiểu blog chung chung.

--------------------------------------------------
STEP 3 — XUẤT FILE
--------------------------------------------------

Tạo file tại: /knowledge/YYYY-MM-DD-topic-name.md

Quy tắc:
- YYYY-MM-DD = ngày hiện tại
- topic-name = kebab-case từ $ARGUMENTS (không dấu, không viết hoa)

Template nội dung:

```markdown
# Knowledge Deep Dive: [Topic Title]

## Thông tin chung

| Field | Value |
|-------|-------|
| Topic | $ARGUMENTS |
| Date | YYYY-MM-DD |
| Source | Claude Conversation |
| Category | Architecture / Debugging / AI / Mindset / Performance / ... |

---

## 1. Core Concept

[Giải thích khái niệm chính xác]

---

## 2. Mental Model

[Framework tư duy có thể áp dụng lại]

---

## 3. Why It Matters (AI Era 2026)

[Tại sao quan trọng trong bối cảnh AI thay đổi cách build software]

---

## 4. Deep Technical Analysis

### Architecture View
[Phân tích ở mức hệ thống]

### Code-Level View
```ts
// Example snippet
```

---

## 5. Common Mistakes / Anti-pattern

- ...

---

## 6. Practical Application

Áp dụng vào: Backend (Node.js), React, AI Agent workflow, System Design

---

## 7. Trade-offs

| Approach | Ưu điểm | Nhược điểm | Khi dùng |
|----------|---------|------------|----------|

---

## 8. Reusable Pattern

[Pattern có thể tái sử dụng]

---

## 9. Next Learning Direction

- [ ] Action 1
- [ ] Action 2
- [ ] Action 3
```

--------------------------------------------------
STEP 4 — GỬI NOTION VIA API
--------------------------------------------------

Sử dụng biến môi trường:
- Database ID: $NOTION_DATABASE_ID
- API Key: $NOTION_API_KEY
- Notion-Version: 2022-06-28

Mapping property:

```json
{
  "parent": { "database_id": "$NOTION_DATABASE_ID" },
  "properties": {
    "Title": { "title": [{ "text": { "content": "Knowledge: $ARGUMENTS" }}]},
    "Type": { "select": { "name": "knowLegde" }},
    "Status": { "status": { "name": "Solved" }},
    "Tech Stack": { "multi_select": [{ "name": "..." }] },
    "Keywords": { "multi_select": [{ "name": "..." }] },
    "Date Started": { "date": { "start": "YYYY-MM-DD" } },
    "Date Resolved": { "date": { "start": "YYYY-MM-DD" } },
    "Priority": { "select": { "name": "Medium" } },
    "Reusability Score": { "select": { "name": "High" } }
  }
}
```

--------------------------------------------------
STEP 5 — BODY CONTENT CHO NOTION
--------------------------------------------------

Chuyển markdown thành Notion block types:

- Headings → heading_2, heading_3
- Paragraphs → paragraph
- Bullet lists → bulleted_list_item
- Code blocks → code (language: ts/js/bash/json)
- Tables → table + table_row
- Checkboxes → to_do
- Dividers → divider

Giới hạn:
- rich_text ≤ 2000 ký tự → tách nhiều text objects
- ≤ 100 children blocks → dùng append blocks nếu nhiều hơn

--------------------------------------------------
QUY TẮC ỔN ĐỊNH
--------------------------------------------------

- Không viết lan man, tập trung vào insight
- Không thiếu WHY, mental model, trade-offs
- Phải có ít nhất 1 table và 1 code block nếu liên quan kỹ thuật
- Không gửi Notion nếu thiếu property bắt buộc
- Không hỏi lại user trừ khi thiếu critical data

--------------------------------------------------
OUTPUT CUỐI CÙNG
--------------------------------------------------

1. Hiển thị đường dẫn file knowledge vừa tạo
2. Gọi Notion API bằng curl để tạo page (kèm children blocks)
3. Hiển thị link Notion sau khi tạo thành công
4. Hiển thị bảng: Knowledge File | Notion Link | Category | Reusability
