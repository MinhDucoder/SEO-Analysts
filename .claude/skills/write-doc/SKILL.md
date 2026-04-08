---
name: writing-docx-report
description: Use when user asks to create báo cáo đồ án, khóa luận, luận văn tốt nghiệp, tiểu luận as .docx file, or needs python-docx code with Vietnamese academic formatting (A4, Calibri, heading hierarchy, 7-part chapter structure)
---

# Writing DOCX Report

Tạo báo cáo DOCX theo chuẩn định dạng học thuật Việt Nam (A4, Calibri, 7 chương).

## When to Use

- User yêu cầu tạo báo cáo DOCX, báo cáo đồ án, khóa luận, luận văn
- User cần document theo format học thuật tiếng Việt
- Cần generate file `.docx` với formatting cụ thể (margins, fonts, headings)
- Cần dùng python-docx hoặc docx-js để generate file Word theo chuẩn
- Keywords: "báo cáo", "đồ án", "khóa luận", "luận văn", "tốt nghiệp", "tiểu luận", "DOCX", "Word", "python-docx", "mẫu report"

**Không dùng khi:** Tạo docs đơn giản không cần formatting chuẩn, hoặc tạo PDF/HTML.

## Quick Reference — Formatting

| Thành phần | Giá trị |
|---|---|
| Khổ giấy | A4 — lề 1 inch (all sides) |
| Font body | Calibri 12pt, đen |
| Heading 1 | Calibri Light 20pt, #0F4761 |
| Heading 2 | Calibri Light 16pt, #0F4761 |
| Heading 3 | Calibri Light 14pt, #0F4761 |
| Giãn dòng | ~1.15 (line=278, lineRule=auto) |
| Spacing after | 8pt (after=160) |
| Ngôn ngữ | vi-VN |

Chi tiết đầy đủ: xem [formatting-rules.md](formatting-rules.md)

## Quick Reference — Cấu trúc tài liệu

| Phần | Nội dung | Yêu cầu |
|---|---|---|
| Chương 1 | Tổng quan bài toán, công nghệ | 20-25 trang |
| Chương 2 | Phân tích & thiết kế | >= 20 trang |
| Chương 3 | Xây dựng ứng dụng | Kiến trúc + kết quả |
| Chương 4 | Kiểm thử & triển khai | Test case + kết quả |
| Kết luận | Đoạn văn liền mạch | KHÔNG chia tiểu mục |
| Tài liệu tham khảo | 15-20 tài liệu | Xếp theo thể loại |
| Phụ lục | Phân công, khảo sát, test | >= 30 trang, số trang riêng |

Chi tiết đầy đủ: xem [document-structure.md](document-structure.md)

## Utility Scripts

**generate_template.py** — Tạo DOCX template đã format sẵn:

```bash
# Minimal (chỉ styles, sample headings)
python scripts/generate_template.py output.docx --title "Tên đồ án"

# Skeleton (full 7-part structure với placeholders)
python scripts/generate_template.py output.docx --title "Tên đồ án" --skeleton
```

**validate_docx.py** — Kiểm tra DOCX đúng rules:

```bash
# Check formatting (page, fonts, spacing)
python scripts/validate_docx.py report.docx

# Check formatting + structure (7 phần + kết luận rules)
python scripts/validate_docx.py report.docx --strict
```

Requires: `pip install python-docx`

## Workflow

1. **Generate template**: Run `generate_template.py --skeleton` để có template đúng format
2. **Đọc rules**: Load `formatting-rules.md` + `document-structure.md` khi cần tra cứu
3. **Build content**: Điền nội dung theo cấu trúc 7 phần bắt buộc
4. **Validate**: Run `validate_docx.py --strict` → fix lỗi → validate lại
5. **Export**: Lưu file .docx khi validation 100% passed

## Common Mistakes

| Lỗi | Cách sửa |
|---|---|
| Dùng font Times New Roman | Body: Calibri, Heading: Calibri Light |
| Heading color đen | Heading 1/2/3 phải dùng #0F4761 |
| Kết luận chia tiểu mục | Kết luận viết liền mạch, KHÔNG chia mục |
| Tài liệu tham khảo đánh số chương | TLTK không phải chương, xếp độc lập |
| Phụ lục dùng số trang chung | Phụ lục đánh số trang riêng (PL-1, PL-2...) |
| Biểu đồ không có phân tích | Mọi biểu đồ PHẢI kèm phân tích giải thích |
| Công nghệ không dẫn nguồn | Mọi công nghệ/công cụ PHẢI dẫn nguồn TLTK |
| Website tham khảo thiếu ngày | Website PHẢI ghi ngày truy cập |
