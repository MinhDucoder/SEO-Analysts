# /done $ARGUMENTS

Bạn đang thực hiện bước tổng kết task: **$ARGUMENTS**

Thực hiện tuần tự các bước sau:

--------------------------------------------------
STEP 1 — PHÂN TÍCH KỸ THUẬT CHI TIẾT
--------------------------------------------------

1. Thu thập dữ liệu từ git:
   - `git diff --stat` → phạm vi thay đổi (files, insertions, deletions)
   - `git diff` → nội dung thay đổi chi tiết từng file
   - `git log --oneline -10` → context các commit gần đây
   - `git branch --show-current` → branch hiện tại

2. Phân tích từng file thay đổi:
   - Liệt kê từng file với số dòng thêm/xoá
   - Mô tả CỤ THỂ thay đổi gì trong mỗi file (không chỉ nói chung chung)
   - Trích dẫn code snippets quan trọng (before → after)
   - Giải thích TẠI SAO thay đổi đó cần thiết

3. Xác định:
   - Mục tiêu task (1-2 câu rõ ràng)
   - Vấn đề ban đầu (mô tả cụ thể bug/limitation)
   - Root cause (nguyên nhân gốc rễ kỹ thuật)
   - Giải pháp đã thực hiện (mô tả approach và reasoning)
   - Ảnh hưởng hệ thống (components/flows nào bị ảnh hưởng)
   - Rủi ro tiềm ẩn (edge cases, backward compatibility)
   - Hướng cải tiến tiếp theo (actionable next steps)

--------------------------------------------------
STEP 2 — XUẤT FILE TỔNG KẾT
--------------------------------------------------

Tạo file trong thư mục: /tasks/YYYY-MM-DD-ten-task-ngan-gon.md

Quy tắc đặt tên:
- YYYY-MM-DD = ngày hiện tại
- ten-task-ngan-gon = kebab-case, không dấu tiếng Việt, không viết hoa
- Nếu $ARGUMENTS có tên task → dùng làm tên file

Ví dụ: 2026-02-18-fix-login-bug.md

Template nội dung:

```markdown
# Task Summary: [Tiêu đề ngắn gọn mô tả task]

## Thông tin chung

| Field | Value |
|-------|-------|
| Task | $ARGUMENTS |
| Branch | [branch hiện tại] |
| Ngày hoàn thành | YYYY-MM-DD |
| Loại | Bug Fix / Feature Development / Refactor / ... |
| Area | Frontend / Backend / Infra |

---

## Mục tiêu

[1-2 câu mô tả rõ mục tiêu cần đạt được]

## Vấn đề ban đầu

[Mô tả cụ thể vấn đề/bug/limitation. Bao gồm triệu chứng, điều kiện xảy ra, impact lên user/system]

## Root Cause

[Phân tích nguyên nhân gốc rễ kỹ thuật. Giải thích tại sao code cũ gây ra vấn đề]

## Giải pháp chi tiết

### Approach
[Mô tả tổng quan approach đã chọn và lý do]

### Thay đổi theo file

#### `path/to/file1.js` (+X/-Y)
- **Thay đổi**: [Mô tả cụ thể]
- **Lý do**: [Tại sao cần thay đổi này]
- **Code**:
  ```js
  // Before
  [code cũ]

  // After
  [code mới]
  ```

[Lặp lại cho từng file thay đổi]

## Tổng hợp thay đổi

| File | Insertions | Deletions | Mô tả |
|------|-----------|-----------|-------|
| path/to/file1.js | +X | -Y | [mô tả ngắn] |
| **Tổng** | **+X** | **-Y** | |

## Ảnh hưởng hệ thống

- [Component/flow nào bị ảnh hưởng]
- [API endpoints nào thay đổi behavior]
- [Có breaking change không]

## Rủi ro tiềm ẩn

- [Edge case 1]
- [Backward compatibility concern]

## Hướng cải tiến tiếp theo

- [ ] [Action item 1 cụ thể]
- [ ] [Action item 2 cụ thể]
- [ ] [Action item 3 cụ thể]
```

Lưu ý quan trọng:
- PHẢI trích dẫn code snippets cho mọi thay đổi quan trọng (before/after)
- PHẢI giải thích LÝ DO cho từng thay đổi, không chỉ mô tả WHAT mà còn WHY
- Nếu git diff quá lớn (>500 dòng): nhóm theo module, vẫn giữ code snippets cho thay đổi chính
- Không bỏ qua file nào trong diff, kể cả config files

--------------------------------------------------
STEP 3 — GỬI NOTION VIA API
--------------------------------------------------

Sử dụng biến môi trường:
- Database ID: $NOTION_DATABASE_ID
- API Key: $NOTION_API_KEY
- Notion-Version: 2022-06-28

Mapping property (đúng schema database):

Title = Task title (type: title)
Type = Suy luận (Bug Fix / Feature Development / Refactor / Tech Deep Dive / Performance Investigation / knowLegde) (type: select)
Status = Solved (type: status, options: Not Started / In Progress / Solved / Archived)
Tech Stack = Suy luận từ git diff (type: multi_select, options: React / Next.js / Node.js / NestJS / TypeScript / PostgreSQL / Prisma / Redis / BullMQ / Docker / Socket.IO / Playwright / Cheerio / Lighthouse / Tailwind CSS / shadcn/ui / Vercel / Railway / Supabase / AI / Document / CLI / Mindset)
Keywords = Suy luận từ nội dung (type: multi_select, options: error-handling / authentication / optimization / database-query / api-integration / security / performance / testing / deployment / debugging / meta tag)
Date Started = Nếu có trong task-summary thì dùng, nếu không dùng hôm nay (type: date)
Date Resolved = Hôm nay (type: date)
Priority = Medium mặc định (type: select, options: Critical / High / Medium / Low)
Reusability Score = Suy luận (type: select, options: Very High / High / Medium / Low)

Format JSON:

```json
{
  "parent": { "database_id": "$NOTION_DATABASE_ID" },
  "properties": {
    "Title": { "title": [{ "text": { "content": "..." }}]},
    "Type": { "select": { "name": "..." }},
    "Status": { "status": { "name": "Solved" }},
    "Tech Stack": { "multi_select": [{ "name": "..." }] },
    "Keywords": { "multi_select": [{ "name": "..." }] },
    "Date Started": { "date": { "start": "YYYY-MM-DD" } },
    "Date Resolved": { "date": { "start": "YYYY-MM-DD" } },
    "Priority": { "select": { "name": "Medium" } },
    "Reusability Score": { "select": { "name": "Medium" } }
  }
}
```

--------------------------------------------------
STEP 4 — BODY CONTENT CHO NOTION
--------------------------------------------------

Chuyển markdown thành Notion block types:

- Headings → heading_2, heading_3
- Paragraphs → paragraph
- Bullet lists → bulleted_list_item
- Numbered lists → numbered_list_item
- Code blocks → code (language: js/ts/bash/json)
- Tables → table + table_row
- Checkboxes → to_do
- Dividers → divider
- Bold/italic → annotations

Giới hạn Notion API:
- rich_text content ≤ 2000 ký tự → tách thành nhiều text objects
- ≤ 100 children blocks per request → dùng append blocks nếu nhiều hơn
- Before/After code → tách thành 2 code blocks riêng

--------------------------------------------------
QUY TẮC ỔN ĐỊNH
--------------------------------------------------

- Không bỏ qua bước phân tích git diff
- Không tạo file sai format tên
- Không gửi Notion nếu thiếu property bắt buộc
- Nếu thiếu thông tin → suy luận hợp lý từ code context
- Không hỏi lại user trừ khi thiếu critical data
- PHẢI có code snippets trong task summary
- PHẢI giải thích WHY, không chỉ WHAT
- Notion children PHẢI có code blocks

--------------------------------------------------
OUTPUT CUỐI CÙNG
--------------------------------------------------

1. Hiển thị đường dẫn file task-summary vừa tạo
2. Gọi Notion API bằng curl để tạo page (kèm children blocks)
3. Hiển thị link Notion page sau khi tạo thành công
4. Hiển thị bảng tóm tắt: Task file | Notion link | Status | Type | Files changed
