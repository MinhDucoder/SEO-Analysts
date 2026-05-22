/**
 * Demo policy content (Vietnamese). Single source — rendered identically in
 * both locales for now. TODO: translate to EN. `titleKey` maps to the i18n
 * key `policy.<titleKey>`; `id` is the in-page anchor used by footer links.
 */
export interface PolicySection {
  id: string;
  titleKey: "terms" | "privacy" | "payment";
  paragraphs: string[];
}

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: "dieu-khoan",
    titleKey: "terms",
    paragraphs: [
      "Khi sử dụng SEO Analyst, bạn đồng ý dùng dịch vụ đúng mục đích phân tích SEO hợp pháp cho website mình sở hữu hoặc được uỷ quyền.",
      "Bạn không được lạm dụng hệ thống để tấn công, dò quét trái phép, hoặc gây quá tải lên website của bên thứ ba.",
      "Chúng tôi có quyền tạm khoá tài khoản vi phạm mà không hoàn phí cho phần thời gian còn lại.",
    ],
  },
  {
    id: "bao-mat",
    titleKey: "privacy",
    paragraphs: [
      "Chúng tôi chỉ thu thập thông tin cần thiết để vận hành dịch vụ: email, thông tin gói cước, và dữ liệu audit bạn tạo ra.",
      "Mật khẩu được băm an toàn; chúng tôi không bao giờ lưu mật khẩu dạng văn bản thuần.",
      "Dữ liệu audit của bạn không được chia sẻ cho bên thứ ba ngoài mục đích cung cấp dịch vụ.",
    ],
  },
  {
    id: "thanh-toan",
    titleKey: "payment",
    paragraphs: [
      "Thanh toán qua chuyển khoản VietQR. Gói được kích hoạt ngay sau khi giao dịch được đối soát thành công.",
      "Phí đã thanh toán không hoàn lại cho phần thời gian đã sử dụng. Trường hợp lỗi hệ thống khiến bạn không dùng được gói, vui lòng liên hệ hỗ trợ để được xử lý.",
      "Gói tự động hết hạn vào cuối chu kỳ; bạn cần thanh toán lại để gia hạn. Không có tự động trừ tiền định kỳ.",
    ],
  },
];
