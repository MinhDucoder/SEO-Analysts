/**
 * @file Vietnamese localization for /public/check issue text.
 *
 * Maps (ruleId, status, evidence) -> Vietnamese `description` + template
 * `suggestion`. SEO technical terms (title tag, meta description, canonical,
 * alt text, H1, schema.org, ...) are intentionally kept in English (see
 * EN_TERMS). Returns null for unknown rule ids so callers fall back to the
 * English source string. Pure module — no NestJS DI, safe to unit test.
 *
 * Vietnamese is self-contained guidance, NOT a literal translation of each
 * English branch, so it stays correct if a rule tweaks its thresholds. Only
 * the 26 rules reachable in content_only mode are covered (the 4 rules with a
 * `requires` flag never surface through /public/check).
 */

export type IssueStatus = 'warn' | 'fail';
type Evidence = Record<string, unknown>;

interface Localized {
  message: string;
  suggestion: string | null;
}
type Localizer = (status: IssueStatus, ev: Evidence) => Localized;

/** SEO technical terms kept in English across every Vietnamese string. */
export const EN_TERMS = [
  'title tag', 'meta description', 'canonical URL', 'alt text', 'H1', 'heading',
  'schema.org', 'structured data', 'Open Graph', 'Twitter card', 'viewport',
  'robots meta', 'favicon', 'HTTPS', 'internal link', 'external link',
  'readability', 'Flesch Reading Ease', 'llms.txt', 'target keyword',
  'primary keyword', 'SERP', 'AI bot', 'entity markup', 'citation',
  'authoritative source', 'rich result', 'link equity', 'topic cluster',
  'JSON-LD', 'rel=noopener',
] as const;

// ---- evidence helpers (never throw, never yield "undefined" text) ----
const num = (ev: Evidence, key: string): number | undefined =>
  typeof ev[key] === 'number' ? (ev[key] as number) : undefined;
const list = (ev: Evidence, key: string): unknown[] =>
  Array.isArray(ev[key]) ? (ev[key] as unknown[]) : [];
const strList = (ev: Evidence, key: string): string[] =>
  list(ev, key).filter((x): x is string => typeof x === 'string');

const CATALOG: Record<string, Localizer> = {
  // ---- content ----
  readability: (status, ev) => {
    const fre = num(ev, 'fre');
    const grade = num(ev, 'grade');
    const score = fre !== undefined ? `Flesch Reading Ease ${fre}${grade !== undefined ? `, grade ${grade}` : ''}` : 'Flesch Reading Ease thấp';
    return status === 'fail'
      ? { message: `Readability rất khó đọc (${score}).`, suggestion: 'Viết lại với câu ngắn (dưới 15 từ) và từ vựng đơn giản. Nhắm Flesch Reading Ease ≥ 60.' }
      : { message: `Readability khá khó đọc (${score}).`, suggestion: 'Rút ngắn câu và dùng từ đơn giản hơn. Nhắm Flesch Reading Ease 60–70 cho độc giả web phổ thông.' };
  },

  // ---- geo ----
  geo_ai_bot_access: (status, ev) => {
    if (status === 'fail') {
      const bots = strList(ev, 'blockedBots');
      const who = bots.length ? `: ${bots.join(', ')}` : '';
      return { message: `${bots.length || 'Một số'} AI bot bị chặn${who}.`, suggestion: 'Bỏ "Disallow: /" cho các AI bot trong robots.txt để đủ điều kiện được AI search trích dẫn.' };
    }
    const warned = strList(ev, 'warnedBots');
    return { message: `${warned.length || 'Một số'} AI bot bị chặn khỏi các đường dẫn quan trọng (/blog, /docs).`, suggestion: warned.length ? `Cân nhắc cho phép /blog và /docs cho ${warned.join(', ')}.` : 'Cân nhắc cho phép /blog và /docs cho các AI bot.' };
  },
  geo_article_schema: (status, ev) => {
    const missing = strList(ev, 'missingFields');
    if (status === 'warn') {
      const f = missing[0] ?? 'một field';
      return { message: `Article schema thiếu field bắt buộc: ${f}.`, suggestion: `Thêm ${f} để đủ điều kiện rich result.` };
    }
    if (missing.length > 0) {
      return { message: `Article schema thiếu ${missing.length} field bắt buộc: ${missing.join(', ')}.`, suggestion: `Thêm ${missing.join(' + ')} vào block JSON-LD.` };
    }
    return { message: 'Không tìm thấy JSON-LD Article/BlogPosting/NewsArticle.', suggestion: 'Thêm Article schema (lưu ý: FAQPage đã deprecated 2026-05-07, dùng Article).' };
  },
  geo_citation_outbound: (status, ev) => {
    const auth = list(ev, 'authoritative').length;
    return status === 'fail'
      ? { message: 'Không có outbound citation tới nguồn uy tín (authoritative source).', suggestion: 'Trích dẫn ≥3 nguồn từ wikipedia, .gov, .edu hoặc các nhà xuất bản lớn.' }
      : { message: `Chỉ có ${auth} authoritative citation.`, suggestion: 'Thêm citation để đạt ≥3, tăng tín hiệu tin cậy cho AI.' };
  },
  geo_direct_answer_intro: (status, ev) => {
    if (status === 'fail') {
      return { message: 'Đoạn mở đầu chưa trả lời trực tiếp chủ đề trang.', suggestion: 'Viết lại câu đầu tiên để trả lời thẳng câu hỏi mà H1 gợi ra.' };
    }
    if (typeof ev.error === 'string') {
      return { message: 'Không thể hoàn tất GEO LLM check.', suggestion: null };
    }
    return { message: 'Chưa có H1 để đánh giá đoạn mở đầu.', suggestion: 'Thêm một H1 mô tả chủ đề trang.' };
  },
  geo_entity_markup: (status, ev) => {
    if (status === 'warn') {
      const age = num(ev, 'ageDays');
      return { message: `dateModified đã cũ${age !== undefined ? ` ${age} ngày` : ''}.`, suggestion: 'Cập nhật dateModified khi sửa bài viết.' };
    }
    return { message: 'Entity markup chưa đạt — cần author (@type=Person) và publisher (@type=Organization) trong Article schema.', suggestion: 'Bổ sung author { "@type": "Person", "name": "..." } và publisher { "@type": "Organization", "name": "..." } vào JSON-LD.' };
  },
  geo_llms_txt_present: (status, ev) => {
    const sizeBytes = num(ev, 'sizeBytes');
    const fetched = sizeBytes !== undefined;
    if (status === 'fail') {
      if (fetched) {
        return { message: 'llms.txt có nhưng thiếu H1 bắt buộc.', suggestion: 'Dòng đầu tiên (non-empty) phải là "# Site Name".' };
      }
      const code = num(ev, 'status');
      return { message: `llms.txt ${code !== undefined ? `trả về ${code}` : 'chưa được tải'}.`, suggestion: 'Tạo /llms.txt — file Markdown có H1 tên site và blockquote tóm tắt. Xem https://llmstxt.org/' };
    }
    if (sizeBytes !== undefined && sizeBytes > 1_000_000) {
      return { message: `llms.txt nặng ${Math.round(sizeBytes / 1024)} KB (>1 MB).`, suggestion: 'Cắt bớt phần không cần thiết; LLM context window ưu tiên bản tóm tắt gọn.' };
    }
    return { message: 'llms.txt có H1 nhưng chưa có blockquote tóm tắt.', suggestion: 'Thêm "> Tóm tắt một dòng" ngay sau H1.' };
  },
  geo_quotable_density: (status, ev) => {
    const d = num(ev, 'density');
    const ds = d !== undefined ? d.toFixed(2) : 'thấp';
    return status === 'fail'
      ? { message: `Quotable density ${ds}/1000 từ (cần ≥3).`, suggestion: 'Thêm table, list hoặc blockquote — hệ thống AI ưu tiên cấu trúc dễ trích xuất.' }
      : { message: `Quotable density ${ds}/1000 từ (cần ≥3).`, suggestion: 'Thêm table, list hoặc blockquote.' };
  },
  geo_semantic_completeness: (status, ev) => {
    const rate = num(ev, 'completionRate');
    if (status === 'fail') {
      const pct = rate !== undefined ? `${Math.round(rate * 100)}%` : 'một phần nhỏ';
      return { message: `Chỉ ${pct} section là self-contained.`, suggestion: 'Viết lại để mỗi section trả lời trọn vẹn heading của nó trong 134+ từ.' };
    }
    if (rate === undefined) {
      return { message: 'Không tìm thấy section H2.', suggestion: 'Thêm các section H2 có cấu trúc.' };
    }
    return { message: `${Math.round(rate * 100)}% hoàn chỉnh; nhắm ≥80%.`, suggestion: 'Mở rộng các section để mỗi phần có thể trích dẫn độc lập.' };
  },

  // ---- headings ----
  h1_tag: (status, ev) => {
    if (status === 'warn') {
      return { message: 'Có H1 nhưng không chứa target keyword.', suggestion: 'Đưa target keyword vào H1 để tăng độ liên quan chủ đề.' };
    }
    const count = num(ev, 'count');
    return count !== undefined && count > 1
      ? { message: `Tìm thấy ${count} thẻ H1; chỉ nên có đúng một.`, suggestion: 'Giữ một H1 duy nhất và hạ các H1 còn lại xuống H2.' }
      : { message: 'Không tìm thấy thẻ H1.', suggestion: 'Thêm đúng một H1 mô tả chủ đề trang.' };
  },
  heading_hierarchy: (status, ev) => {
    if (status === 'warn') {
      return { message: 'Cấu trúc heading nhảy cấp (ví dụ H2 sang H4).', suggestion: 'Tránh nhảy cấp heading — dùng H3 giữa H2 và H4.' };
    }
    const levels = list(ev, 'levels').map((x) => (typeof x === 'number' ? x : 0));
    const total = levels.reduce((a, b) => a + b, 0);
    return total === 0
      ? { message: 'Không tìm thấy heading nào trên trang.', suggestion: 'Cấu trúc nội dung bằng heading H1, H2, H3.' }
      : { message: 'Cấu trúc heading có vấn đề nghiêm trọng (thiếu H1 hoặc nhảy nhiều cấp).', suggestion: 'Bắt đầu bằng một H1 duy nhất, rồi dùng H2/H3 theo thứ tự, không nhảy cấp.' };
  },

  // ---- images ----
  image_alt: (status, ev) => {
    const pct = num(ev, 'percent');
    const p = pct !== undefined ? `${pct}%` : 'một phần';
    return status === 'fail'
      ? { message: `Chỉ ${p} ảnh có alt text.`, suggestion: 'Thêm alt text mô tả để cải thiện accessibility và image SEO.' }
      : { message: `${p} ảnh có alt text.`, suggestion: 'Thêm alt text mô tả cho các ảnh còn lại.' };
  },

  // ---- links ----
  external_links: (status, ev) => {
    if (status === 'fail') {
      const broken = num(ev, 'broken');
      return { message: `${broken ?? 'Một số'} external link trả về 4xx/5xx.`, suggestion: 'Sửa hoặc bỏ các external link bị hỏng.' };
    }
    const missingRel = num(ev, 'missingRel');
    const total = num(ev, 'total');
    const frac = missingRel !== undefined && total !== undefined ? `${missingRel}/${total}` : 'Một số';
    return { message: `${frac} external link thiếu rel=noopener.`, suggestion: 'Thêm rel="noopener noreferrer" cho mọi external link target=_blank.' };
  },
  internal_links: (status, ev) => {
    const count = num(ev, 'count');
    return status === 'fail'
      ? { message: 'Không tìm thấy internal link.', suggestion: 'Thêm internal link tới các trang liên quan trong site.' }
      : { message: `Chỉ tìm thấy ${count ?? 'rất ít'} internal link.`, suggestion: 'Thêm tối thiểu 3 internal link để hỗ trợ crawl và topic cluster.' };
  },

  // ---- meta ----
  meta_description: (status, ev) => {
    const len = num(ev, 'length');
    if (status === 'warn') {
      return { message: `Độ dài meta description ${len ?? ''} chấp nhận được nhưng chưa tối ưu.`.replace(/\s+/g, ' '), suggestion: 'Nhắm 120–160 ký tự để có SERP snippet tốt nhất.' };
    }
    return len === 0
      ? { message: 'Thiếu meta description.', suggestion: 'Thêm meta description dài 120–160 ký tự.' }
      : { message: `Độ dài meta description ${len ?? ''} nằm ngoài khoảng tối ưu.`.replace(/\s+/g, ' '), suggestion: 'Thêm meta description dài 120–160 ký tự.' };
  },
  open_graph: (status, ev) => {
    const present = strList(ev, 'present');
    if (status === 'fail') {
      return { message: 'Không tìm thấy thẻ Open Graph.', suggestion: 'Thêm og:title, og:description và og:image để chia sẻ mạng xã hội tốt hơn.' };
    }
    const missing = ['og:title', 'og:description', 'og:image'].filter((k) => !present.includes(k));
    return { message: `Chỉ có ${present.length}/3 thẻ Open Graph.`, suggestion: missing.length ? `Thêm thẻ còn thiếu: ${missing.join(', ')}.` : 'Bổ sung đủ og:title, og:description, og:image.' };
  },
  title_tag: (status, ev) => {
    const len = num(ev, 'length');
    if (status === 'warn') {
      return { message: `Độ dài title ${len ?? ''} chấp nhận được nhưng chưa tối ưu.`.replace(/\s+/g, ' '), suggestion: 'Điều chỉnh title về 50–60 ký tự để hiển thị tốt trên SERP.' };
    }
    return len === 0
      ? { message: 'Thiếu thẻ title.', suggestion: 'Thêm title 50–60 ký tự, chứa primary keyword.' }
      : { message: `Độ dài title ${len ?? ''} nằm ngoài khoảng tối ưu (50–60 ký tự).`.replace(/\s+/g, ' '), suggestion: 'Thêm title 50–60 ký tự, chứa primary keyword.' };
  },
  twitter_card: () => ({ message: 'Thiếu Twitter card.', suggestion: 'Thêm <meta name="twitter:card" content="summary_large_image">.' }),

  // ---- technical ----
  canonical_url: (status, ev) => {
    if (status === 'warn') {
      return { message: 'Canonical URL trỏ sang domain khác.', suggestion: 'Kiểm tra xem canonical cross-domain có chủ đích không.' };
    }
    return typeof ev.canonical === 'string'
      ? { message: 'Canonical URL bị lỗi định dạng.', suggestion: 'Cung cấp canonical URL tuyệt đối (absolute).' }
      : { message: 'Thiếu canonical URL.', suggestion: 'Thêm <link rel="canonical" href="..."> để chỉ định URL ưu tiên.' };
  },
  favicon: () => ({ message: 'Thiếu favicon.', suggestion: 'Thêm <link rel="icon" href="/favicon.ico">.' }),
  https_check: () => ({ message: 'Trang đang phục vụ qua HTTP.', suggestion: 'Cài chứng chỉ TLS và redirect HTTP sang HTTPS.' }),
  language_tag: () => ({ message: 'Thiếu thuộc tính lang trên thẻ HTML.', suggestion: 'Thêm thuộc tính lang vào <html> (ví dụ lang="vi").' }),
  robots_meta: (status) =>
    status === 'warn'
      ? { message: 'Trang index được nhưng mọi link đều nofollow.', suggestion: 'Cho phép một số link followable để chia sẻ link equity.' }
      : { message: 'Trang có directive noindex.', suggestion: 'Bỏ noindex nếu muốn trang xuất hiện trong kết quả tìm kiếm.' },
  schema_org: () => ({ message: 'Không tìm thấy structured data (JSON-LD).', suggestion: 'Thêm schema.org JSON-LD cho Article, Product, FAQ, v.v.' }),
  url_structure: (status, ev) => {
    const issues = strList(ev, 'issues');
    if (status === 'warn') {
      return { message: `URL có vấn đề nhỏ${issues.length ? `: ${issues.join(', ')}` : ''}.`, suggestion: 'Rút ngắn URL, dùng dấu gạch ngang và chữ thường, hạn chế query string.' };
    }
    return issues.length > 0
      ? { message: `URL có nhiều vấn đề cấu trúc: ${issues.join(', ')}.`, suggestion: 'Viết lại URL ngắn gọn, chữ thường, phân tách bằng dấu gạch ngang và không dùng query string.' }
      : { message: 'URL bị lỗi định dạng.', suggestion: null };
  },
  viewport_meta: (status) =>
    status === 'warn'
      ? { message: 'Có thẻ viewport nhưng chưa responsive.', suggestion: 'Dùng width=device-width để responsive trên mobile.' }
      : { message: 'Thiếu thẻ meta viewport.', suggestion: 'Thêm <meta name="viewport" content="width=device-width, initial-scale=1">.' },
};

/** Rule ids that have a Vietnamese entry (used by the coverage test). */
export const LOCALIZED_RULE_IDS: ReadonlySet<string> = new Set(Object.keys(CATALOG));

/** Vietnamese issue description. null → caller keeps the English `message`. */
export function localizeIssueMessage(
  ruleId: string,
  status: IssueStatus,
  evidence: Evidence,
): string | null {
  const fn = CATALOG[ruleId];
  if (!fn) return null;
  return fn(status, evidence ?? {}).message;
}

/** Vietnamese template-fallback suggestion. null → caller keeps the English one. */
export function localizeTemplateSuggestion(
  ruleId: string,
  status: IssueStatus,
  evidence: Evidence,
): string | null {
  const fn = CATALOG[ruleId];
  if (!fn) return null;
  return fn(status, evidence ?? {}).suggestion;
}
