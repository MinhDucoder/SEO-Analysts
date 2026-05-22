/** Demo pricing FAQ (Vietnamese). TODO: translate to EN. */
export interface FaqItem {
  q: string;
  a: string;
}

export const PRICING_FAQ: FaqItem[] = [
  {
    q: "Tôi có thể đổi gói bất cứ lúc nào không?",
    a: "Có. Bạn có thể nâng cấp bất cứ lúc nào; gói mới kích hoạt ngay sau khi thanh toán được đối soát.",
  },
  {
    q: "Thanh toán bằng cách nào?",
    a: "Chuyển khoản qua mã VietQR hiển thị ở bước thanh toán. Hệ thống tự đối soát và kích hoạt gói.",
  },
  {
    q: "Hết hạn gói thì dữ liệu audit của tôi có mất không?",
    a: "Dữ liệu được giữ theo thời gian lưu lịch sử của gói tại thời điểm tạo. Gói Free giữ 7 ngày, Pro 90 ngày, Business vĩnh viễn.",
  },
  {
    q: "Có hoàn tiền không?",
    a: "Phí đã dùng không hoàn lại. Xem chi tiết ở mục Chính sách thanh toán & hoàn tiền.",
  },
];
