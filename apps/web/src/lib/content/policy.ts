/**
 * Policy content (Vietnamese). Single source — rendered identically in both
 * locales for now. TODO: translate to EN. `titleKey` maps to the i18n key
 * `policy.<titleKey>`; `id` is the in-page anchor used by footer + TOC links.
 *
 * Each section is split into numbered sub-clauses (`blocks`) so the page reads
 * like a real legal document: heading → prose → optional bullet list.
 */

/** A numbered sub-clause inside a policy section. */
export interface PolicyBlock {
  /** Sub-clause heading (VI). */
  heading: string;
  /** Body paragraphs (VI). Optional when the block is list-only. */
  paragraphs?: string[];
  /** Optional bullet list rendered under the paragraphs. */
  list?: string[];
}

export interface PolicySection {
  id: string;
  titleKey: "terms" | "privacy" | "payment";
  /** One-line lead shown under the heading. */
  summary: string;
  blocks: PolicyBlock[];
}

/** Effective/last-revised date for the legal docs (ISO). Bump on real edits. */
export const POLICY_UPDATED_AT = "2026-05-20";

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: "dieu-khoan",
    titleKey: "terms",
    summary: "Quyền và nghĩa vụ của bạn khi sử dụng nền tảng phân tích SEO.",
    blocks: [
      {
        heading: "Chấp nhận điều khoản",
        paragraphs: [
          "Khi tạo tài khoản hoặc sử dụng bất kỳ tính năng nào của SEO Analyst, bạn xác nhận đã đọc, hiểu và đồng ý chịu ràng buộc bởi toàn bộ điều khoản này cùng các chính sách được dẫn chiếu.",
          "Nếu bạn sử dụng dịch vụ thay mặt cho một tổ chức, bạn cam kết có đủ thẩm quyền để ràng buộc tổ chức đó với các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.",
        ],
      },
      {
        heading: "Phạm vi dịch vụ",
        paragraphs: [
          "SEO Analyst cung cấp công cụ phân tích SEO on-page, kiểm tra Core Web Vitals, phân tích từ khóa và tạo báo cáo cho các website mà bạn sở hữu hoặc được ủy quyền hợp pháp để phân tích.",
          "Dịch vụ phục vụ mục đích đánh giá và tối ưu kỹ thuật. Kết quả phân tích mang tính tham khảo, không phải tư vấn pháp lý và không cam kết bất kỳ thứ hạng tìm kiếm cụ thể nào trên Google hay công cụ tìm kiếm khác.",
        ],
      },
      {
        heading: "Tài khoản và bảo mật đăng nhập",
        paragraphs: [
          "Bạn chịu trách nhiệm giữ bí mật thông tin đăng nhập và cho mọi hoạt động phát sinh dưới tài khoản của mình. Vui lòng dùng mật khẩu mạnh và không chia sẻ tài khoản cho người khác.",
          "Hãy thông báo cho chúng tôi ngay khi phát hiện truy cập trái phép hoặc dấu hiệu lộ thông tin đăng nhập để chúng tôi hỗ trợ kịp thời.",
        ],
      },
      {
        heading: "Hành vi bị cấm",
        paragraphs: ["Khi sử dụng dịch vụ, bạn đồng ý không thực hiện các hành vi sau:"],
        list: [
          "Phân tích, dò quét hoặc audit website không thuộc sở hữu của bạn và chưa được chủ sở hữu ủy quyền.",
          "Gây quá tải, tấn công từ chối dịch vụ (DoS) hoặc làm gián đoạn hoạt động của website bên thứ ba.",
          "Cố tình vượt giới hạn tần suất (rate limit), tạo nhiều tài khoản để né hạn mức, hoặc tự động hóa truy cập trái phép.",
          "Dịch ngược, can thiệp, dò tìm lỗ hổng hệ thống ngoài chương trình được cho phép, hoặc sao chép dịch vụ.",
          "Sử dụng dịch vụ cho nội dung vi phạm pháp luật, lừa đảo, hoặc xâm phạm quyền của bên thứ ba.",
        ],
      },
      {
        heading: "Giới hạn sử dụng theo gói",
        paragraphs: [
          "Mỗi gói cước có hạn mức audit, tần suất chạy và bộ tính năng riêng. Khi bạn vượt hạn mức trong một chu kỳ, một số thao tác có thể bị tạm chặn cho tới đầu chu kỳ kế tiếp hoặc cho tới khi bạn nâng cấp gói.",
          "Chúng tôi có thể áp dụng giới hạn kỹ thuật hợp lý để bảo vệ sự ổn định của hệ thống và trải nghiệm chung của tất cả người dùng.",
        ],
      },
      {
        heading: "Tạm khóa và chấm dứt",
        paragraphs: [
          "Chúng tôi có quyền tạm khóa hoặc chấm dứt tài khoản vi phạm điều khoản mà không hoàn phí cho phần thời gian còn lại. Với vi phạm nghiêm trọng hoặc gây rủi ro an ninh, tài khoản có thể bị khóa ngay lập tức.",
          "Bạn có thể ngừng sử dụng và yêu cầu đóng tài khoản bất cứ lúc nào; việc đóng tài khoản được xử lý theo Chính sách bảo mật bên dưới.",
        ],
      },
      {
        heading: "Thay đổi điều khoản & giới hạn trách nhiệm",
        paragraphs: [
          "Điều khoản có thể được cập nhật theo thời gian. Với thay đổi quan trọng, chúng tôi sẽ thông báo qua email hoặc ngay trên trang này. Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa bạn chấp nhận nội dung mới.",
          "Dịch vụ được cung cấp trên cơ sở “nguyên trạng”. Chúng tôi nỗ lực bảo đảm độ chính xác và sẵn sàng của hệ thống nhưng không chịu trách nhiệm cho các quyết định kinh doanh được đưa ra chỉ dựa trên kết quả phân tích.",
        ],
      },
    ],
  },
  {
    id: "bao-mat",
    titleKey: "privacy",
    summary: "Cách chúng tôi thu thập, lưu trữ và bảo vệ dữ liệu của bạn.",
    blocks: [
      {
        heading: "Thông tin chúng tôi thu thập",
        paragraphs: ["Chúng tôi chỉ thu thập thông tin cần thiết để vận hành dịch vụ, bao gồm:"],
        list: [
          "Thông tin tài khoản: email, tên hiển thị và mật khẩu (được lưu ở dạng đã băm, không phải văn bản thuần).",
          "Dữ liệu sử dụng: các URL bạn yêu cầu audit, kết quả phân tích, điểm số và lịch sử báo cáo.",
          "Thông tin thanh toán: mã giao dịch VietQR và gói cước. Chúng tôi không lưu số thẻ hay thông tin đăng nhập ngân hàng của bạn.",
          "Dữ liệu kỹ thuật: địa chỉ IP, loại trình duyệt và nhật ký hệ thống, phục vụ vận hành, gỡ lỗi và chống lạm dụng.",
        ],
      },
      {
        heading: "Mục đích sử dụng dữ liệu",
        paragraphs: ["Dữ liệu của bạn được dùng cho các mục đích sau:"],
        list: [
          "Cung cấp, duy trì và cải thiện các tính năng phân tích SEO.",
          "Gửi thông báo giao dịch, cảnh báo bảo mật và phản hồi yêu cầu hỗ trợ.",
          "Phát hiện, ngăn chặn gian lận, lạm dụng và các hành vi vi phạm điều khoản.",
          "Tuân thủ nghĩa vụ pháp lý khi có yêu cầu hợp pháp từ cơ quan có thẩm quyền.",
        ],
      },
      {
        heading: "Bảo vệ dữ liệu",
        paragraphs: [
          "Mật khẩu được băm bằng thuật toán một chiều; chúng tôi không bao giờ lưu hoặc gửi mật khẩu ở dạng văn bản thuần. Mọi kết nối tới dịch vụ được mã hóa qua HTTPS.",
          "Hệ thống áp dụng phân tách cơ sở dữ liệu theo từng dịch vụ và nguyên tắc truy cập tối thiểu, nhằm giảm thiểu rủi ro rò rỉ và hạn chế phạm vi truy cập nội bộ.",
        ],
      },
      {
        heading: "Chia sẻ với bên thứ ba",
        paragraphs: [
          "Chúng tôi không bán dữ liệu cá nhân của bạn. Dữ liệu chỉ được chia sẻ với các nhà cung cấp hạ tầng thiết yếu (lưu trữ, gửi email, đối soát thanh toán) trong phạm vi cần thiết và theo cam kết bảo mật.",
          "Dữ liệu audit của bạn không được chia sẻ cho bên thứ ba ngoài mục đích cung cấp dịch vụ, trừ khi có yêu cầu hợp pháp theo quy định của pháp luật.",
        ],
      },
      {
        heading: "Lưu trữ và xóa dữ liệu",
        paragraphs: [
          "Dữ liệu audit được lưu trong suốt thời gian tài khoản của bạn hoạt động; bạn có thể chủ động xóa từng audit bất cứ lúc nào.",
          "Khi bạn đóng tài khoản, dữ liệu cá nhân sẽ được xóa hoặc ẩn danh trong một khoảng thời gian hợp lý, ngoại trừ phần dữ liệu bắt buộc phải lưu giữ theo quy định pháp luật hoặc để giải quyết tranh chấp.",
        ],
      },
      {
        heading: "Quyền của bạn",
        paragraphs: ["Đối với dữ liệu cá nhân của mình, bạn có quyền:"],
        list: [
          "Truy cập, chỉnh sửa hoặc cập nhật thông tin tài khoản.",
          "Yêu cầu xuất hoặc xóa dữ liệu cá nhân trong phạm vi pháp luật cho phép.",
          "Rút lại đồng ý nhận email tiếp thị bất cứ lúc nào mà không ảnh hưởng tới email giao dịch thiết yếu.",
        ],
      },
      {
        heading: "Cookie và lưu trữ cục bộ",
        paragraphs: [
          "Chúng tôi dùng cookie và bộ nhớ cục bộ (localStorage) cho việc duy trì đăng nhập, ghi nhớ tùy chọn giao diện (giao diện sáng/tối, ngôn ngữ) và đo lường vận hành cơ bản.",
          "Chúng tôi không sử dụng cookie cho mục đích quảng cáo theo dõi xuyên trang. Mọi thắc mắc về quyền riêng tư, vui lòng liên hệ qua email hỗ trợ ở cuối trang.",
        ],
      },
    ],
  },
  {
    id: "thanh-toan",
    titleKey: "payment",
    summary: "Phương thức thanh toán, kích hoạt gói và điều kiện hoàn tiền.",
    blocks: [
      {
        heading: "Phương thức thanh toán",
        paragraphs: [
          "Hiện tại SEO Analyst nhận thanh toán qua chuyển khoản ngân hàng bằng mã VietQR. Khi chọn gói, hệ thống tạo mã QR kèm số tiền và nội dung chuyển khoản tương ứng.",
          "Bạn quét mã và chuyển đúng số tiền cùng nội dung được hiển thị; hệ thống sẽ tự động đối soát giao dịch qua webhook ngân hàng.",
        ],
      },
      {
        heading: "Kích hoạt gói",
        paragraphs: [
          "Gói được kích hoạt ngay sau khi giao dịch được đối soát thành công, thường trong vòng vài phút kể từ khi chuyển khoản.",
          "Nếu sau khoảng thời gian này gói vẫn chưa được kích hoạt, vui lòng liên hệ hỗ trợ kèm mã giao dịch để chúng tôi kiểm tra và xử lý.",
        ],
      },
      {
        heading: "Chu kỳ, gia hạn và nâng/hạ cấp",
        paragraphs: [
          "Gói có thời hạn theo chu kỳ bạn đã chọn và tự động hết hạn vào cuối chu kỳ. Hệ thống không tự động trừ tiền định kỳ — bạn chủ động thanh toán lại để gia hạn khi cần.",
          "Khi nâng cấp giữa chu kỳ, gói mới có hiệu lực ngay và phần chênh lệch (nếu có) được xử lý theo hướng dẫn tại thời điểm giao dịch. Việc hạ cấp sẽ áp dụng từ chu kỳ kế tiếp.",
        ],
      },
      {
        heading: "Chính sách hoàn tiền",
        paragraphs: [
          "Phí đã thanh toán không được hoàn lại cho phần thời gian đã sử dụng. Chúng tôi có thể xem xét hoàn hoặc bù trừ trong một số trường hợp đặc biệt dưới đây:",
        ],
        list: [
          "Lỗi hệ thống kéo dài khiến bạn không thể sử dụng gói đã mua.",
          "Thanh toán trùng hoặc nhầm số tiền do lỗi kỹ thuật của hệ thống.",
          "Bạn chưa sử dụng bất kỳ tính năng tính phí nào và gửi yêu cầu trong thời gian hợp lý kèm mã giao dịch.",
        ],
      },
      {
        heading: "Hóa đơn và sai sót giao dịch",
        paragraphs: [
          "Chúng tôi cung cấp xác nhận giao dịch qua email sau khi đối soát thành công. Nếu bạn cần chứng từ bổ sung, vui lòng liên hệ hỗ trợ.",
          "Trường hợp chuyển sai số tiền hoặc thiếu nội dung chuyển khoản, việc đối soát có thể bị chậm. Vui lòng giữ lại biên lai và liên hệ hỗ trợ để được xử lý nhanh nhất.",
        ],
      },
    ],
  },
];
