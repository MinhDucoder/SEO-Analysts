# Document Structure — Cấu trúc báo cáo đồ án

## Contents
- [Chương 1 — Tổng quan](#chương-1--tổng-quan-về-bài-toán-công-nghệ-công-cụ)
- [Chương 2 — Phân tích & thiết kế](#chương-2--phân-tích--thiết-kế-hệ-thống)
- [Chương 3 — Xây dựng ứng dụng](#chương-3--xây-dựng-ứng-dụng)
- [Chương 4 — Kiểm thử & triển khai](#chương-4--kiểm-thử-và-triển-khai-sản-phẩm)
- [Kết luận](#kết-luận)
- [Tài liệu tham khảo](#danh-mục-tài-liệu-tham-khảo)
- [Phụ lục](#phụ-lục)

## Tổng quan 7 phần

```
1. Chương 1 — Tổng quan            (20-25 trang)
2. Chương 2 — Phân tích & thiết kế (>= 20 trang)
3. Chương 3 — Xây dựng ứng dụng
4. Chương 4 — Kiểm thử & triển khai
5. Kết luận                         (KHÔNG phải chương)
6. Tài liệu tham khảo              (15-20 tài liệu)
7. Phụ lục                          (>= 30 trang, số trang riêng)
```

---

## Chương 1 — Tổng quan về bài toán, công nghệ, công cụ

**Yêu cầu: 20-25 trang**

### 1.1 Hiện trạng
- Chi tiết vấn đề cần giải quyết
- Phần mềm/hệ thống hiện tại (nếu có)
- Vướng mắc, hạn chế hiện tại
- Dẫn dắt tới yêu cầu bài toán

### 1.2 Bài toán
- Yêu cầu hệ thống tổng thể
- Yêu cầu chức năng (functional requirements)
- Yêu cầu phi chức năng (non-functional requirements)
- Đối tượng người dùng

### 1.3 Công nghệ & công cụ
- Công cụ phân tích thiết kế (PTTK)
- Công nghệ lập trình (ngôn ngữ, framework)
- Công cụ quản lý dự án (Trello, Jira, Git...)
- Cơ sở dữ liệu (CSDL)
- Công cụ đồ họa (nếu có)

**QUAN TRỌNG:** Mỗi công nghệ/công cụ PHẢI dẫn nguồn tài liệu tham khảo.

### 1.4 Quy trình phát triển phần mềm
- Mô hình phát triển áp dụng (Agile, Waterfall, Scrum...)
- Lý do chọn mô hình

---

## Chương 2 — Phân tích & thiết kế hệ thống

**Yêu cầu: >= 20 trang**

Chọn MỘT trong hai hướng (hoặc kết hợp):

### Hướng cấu trúc
- **BFD** (Business Flow Diagram) — luồng nghiệp vụ
- **DFD** (Data Flow Diagram) — luồng dữ liệu
- **ERD** (Entity Relationship Diagram) — quan hệ thực thể

**LƯU Ý:** ERD khác Class Diagram. Không nhầm lẫn.

### Hướng đối tượng
- **Use Case Diagram** — xác định tác nhân, nghiệp vụ chính
- **Sequence Diagram** — luồng xử lý theo thời gian
- **Class Diagram** — cấu trúc lớp

**QUAN TRỌNG:** Mọi biểu đồ PHẢI kèm phần phân tích giải thích bên dưới. Không chỉ đặt hình mà không giải thích.

---

## Chương 3 — Xây dựng ứng dụng

### 3.1 Kiến trúc hệ thống
- Sơ đồ kiến trúc tổng thể
- Giải thích các tầng/lớp

### 3.2 Triển khai xây dựng
- Quản lý source code (Git, GitHub...)
- Quản lý tiến độ (Trello, Jira — kèm screenshot)
- Quy trình CI/CD (nếu có)

### 3.3 Một số kết quả

#### 3.3.1 Giao diện & chức năng dành cho quản lý (admin)
- Screenshot + mô tả chức năng
- Luồng thao tác

#### 3.3.2 Giao diện & chức năng dành cho khách
- Screenshot + mô tả chức năng
- Luồng thao tác

---

## Chương 4 — Kiểm thử (và Triển khai) sản phẩm

### 4.1 Kiểm thử
- Chiến lược kiểm thử (unit, integration, E2E...)
- Thiết kế test case (bảng test case)
- Kết quả kiểm thử (pass/fail + evidence)

### 4.2 Triển khai dự án (nếu có)
- Host ở đâu (VPS, cloud, on-premise)
- Triển khai như thế nào (Docker, CI/CD pipeline...)
- URL truy cập (nếu public)

---

## Kết luận

**KHÔNG phải chương — KHÔNG đánh số chương.**

**KHÔNG chia tiểu mục** — viết thành các đoạn văn liên tục, liền mạch.

Nội dung bao gồm:
- Kiến thức, kỹ năng đạt được
- Sản phẩm so với mục tiêu ban đầu và yêu cầu thực tế
- Ưu điểm / nhược điểm của sản phẩm
- Hướng phát triển tương lai
- Chi tiết kỹ năng mềm (làm việc nhóm, sử dụng công cụ...)

---

## Danh mục Tài liệu Tham khảo

**KHÔNG đánh số chương** — xếp độc lập sau Kết luận.

**Số lượng:** 15-20 tài liệu

### Sắp xếp
Theo thể loại:
1. Sách
2. Website / Bài báo
3. Tài liệu kỹ thuật

Hoặc theo ngôn ngữ (Tiếng Việt → Tiếng Anh).

Trong mỗi nhóm: sắp xếp ABC theo tên tác giả.

### Quy tắc
- Website **PHẢI** ghi ngày truy cập
- Ưu tiên nguồn uy tín: trường đại học lớn, công ty lớn, tổng cục thống kê, báo cáo thường niên
- Format nhất quán cho mỗi loại tài liệu

### Ví dụ format

```
[Sách]
Nguyễn Văn A (2023). Tên sách. Nhà xuất bản ABC.

[Website]
Tên tác giả hoặc tổ chức (năm). "Tên bài viết". URL. Truy cập ngày DD/MM/YYYY.

[Tài liệu kỹ thuật]
Tên tổ chức (năm). Tên tài liệu. Version X.X.
```

---

## Phụ lục

**Yêu cầu: >= 30 trang**

**Đánh số trang RIÊNG BIỆT:** PL-1, PL-2, ... hoặc i, ii, iii, ...

### Nội dung bắt buộc:
1. **Bảng phân công và tự đánh giá thành viên**
   - Ai làm gì, tỷ lệ đóng góp
   - Tự đánh giá của mỗi thành viên

2. **Khảo sát**
   - Bảng câu hỏi khảo sát
   - Kết quả phỏng vấn
   - Tài liệu khảo sát (tiếng Anh và/hoặc tiếng Việt)

3. **Test case chi tiết**
   - Bảng test case đầy đủ (mở rộng từ Chương 4)
   - Evidence screenshots

