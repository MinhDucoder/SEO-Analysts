# Formatting Rules — Chi tiết định dạng DOCX

## Page Setup

```
Khổ giấy:  A4 (width=12240, height=15840 DXA)
Lề trên:   1 inch  (1440 DXA)
Lề dưới:   1 inch  (1440 DXA)
Lề trái:   1 inch  (1440 DXA)
Lề phải:   1 inch  (1440 DXA)
Header:    0.5 inch (720 DXA) cách mép
Footer:    0.5 inch (720 DXA) cách mép
```

## Font & Size

| Style | Font Family | Size | Color | Weight |
|---|---|---|---|---|
| Normal (body) | Calibri (minorHAnsi) | 12pt (sz=24) | #000000 | Regular |
| Heading 1 | Calibri Light (majorHAnsi) | 20pt (sz=40) | #0F4761 | Bold |
| Heading 2 | Calibri Light (majorHAnsi) | 16pt (sz=32) | #0F4761 | Bold |
| Heading 3 | Calibri Light (majorHAnsi) | 14pt (sz=28) | #0F4761 | Bold |

**Ngôn ngữ mặc định:** vi-VN (Vietnamese)

## Spacing

### Body text (Normal)

```
Line spacing:    ~1.15 (line=278, lineRule=auto)
Space after:     8pt   (after=160 twentieths-of-a-point)
Space before:    0pt
```

### Heading 1 (Chương)

```
Space before:    18pt  (before=360)
Space after:     4pt   (after=80)
```

### Heading 2 (Mục)

```
Space before:    8pt   (before=160)
Space after:     4pt   (after=80)
```

### Heading 3 (Tiểu mục)

```
Space before:    8pt   (before=160)
Space after:     4pt   (after=80)
```

## DXA Conversion Reference

| Đơn vị | 1 inch | 1 pt |
|---|---|---|
| DXA (twentieths of a point) | 1440 | 20 |
| Half-points (sz) | — | 2 |

Ví dụ: font 12pt → sz=24, spacing 8pt → 160 DXA

## Library Usage Note

Khi dùng `python-docx` hoặc `docx-js`:

| Giá trị | python-docx | Ghi chú |
|---|---|---|
| A4 width | `Inches(8.27)` | KHÔNG dùng 8.5 (đó là Letter) |
| A4 height | `Inches(11.69)` | KHÔNG dùng 11 (đó là Letter) |
| Margins | `Inches(1)` | Tất cả 4 lề |
| Color #0F4761 | `RGBColor(0x0F, 0x47, 0x61)` | Cho heading 1/2/3 |
| Imports | `from docx.shared import Pt, Inches, RGBColor` | |
| Line spacing | `WD_LINE_SPACING.MULTIPLE`, value `1.15` | |

## Validation Checklist

Sau khi tạo DOCX, kiểm tra:

- [ ] Page size = A4, margins = 1 inch all sides
- [ ] Body font = Calibri 12pt black
- [ ] Heading fonts = Calibri Light, đúng size, color #0F4761
- [ ] Line spacing ~1.15
- [ ] Space after paragraph = 8pt
- [ ] Heading spacing: H1 before=18pt, H2/H3 before=8pt
- [ ] Language = vi-VN
