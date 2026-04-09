import type { LanguageCode } from './language-detector';

/**
 * English stopwords — common function words that carry little SEO signal.
 * Derived from the NLTK default English stoplist, trimmed to ~170 entries.
 */
export const EN_STOPWORDS: ReadonlySet<string> = new Set<string>([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an',
  'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do',
  'does', 'doing', 'done', 'down', 'during', 'each', 'either', 'else', 'every',
  'few', 'for', 'from', 'further', 'get', 'got', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'may', 'me', 'might',
  'mine', 'more', 'most', 'much', 'must', 'my', 'myself', 'neither', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'one', 'only', 'or', 'other', 'ought',
  'our', 'ours', 'ourselves', 'out', 'over', 'quite', 'really', 'same',
  'shall', 'she', 'should', 'since', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'though', 'through', 'to', 'too', 'truly', 'under', 'until',
  'up', 'upon', 'us', 'very', 'was', 'we', 'well', 'were', 'what', 'when',
  'where', 'whether', 'which', 'while', 'who', 'whom', 'whose', 'why', 'will',
  'with', 'within', 'without', 'would', 'yet', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'll', 've', 're', 'don', 'didn', 'doesn', 'isn', 'wasn', 'weren',
  'won', 'wouldn', 'shouldn', 'couldn', 'aren', 'ain', 'hadn', 'hasn', 'haven',
  'mightn', 'mustn', 'needn', 'shan',
]);

/**
 * Vietnamese stopwords — common function words, pronouns, prepositions,
 * and temporal markers. ~180 entries covering everyday written Vietnamese.
 */
export const VI_STOPWORDS: ReadonlySet<string> = new Set<string>([
  'của', 'và', 'là', 'cho', 'các', 'được', 'có', 'đã', 'trong', 'một',
  'để', 'những', 'khi', 'với', 'như', 'này', 'đó', 'thì', 'mà', 'lại',
  'đang', 'sẽ', 'rằng', 'nhưng', 'nếu', 'tại', 'trên', 'dưới', 'về', 'từ',
  'đến', 'bằng', 'vì', 'do', 'bởi', 'sau', 'trước', 'hoặc', 'cũng', 'vẫn',
  'rất', 'nhiều', 'ít', 'hơn', 'kém', 'chỉ', 'lên', 'xuống', 'ra', 'vào',
  'qua', 'nữa', 'đi', 'tới', 'thế', 'vậy', 'đây', 'kia', 'ấy', 'nào',
  'gì', 'ai', 'sao', 'đâu', 'bao', 'mấy', 'giờ', 'lúc', 'ngày', 'tháng',
  'năm', 'sáng', 'trưa', 'chiều', 'tối', 'đêm', 'không', 'chưa', 'đừng',
  'phải', 'cần', 'nên', 'muốn', 'làm', 'việc', 'người', 'cái', 'chiếc',
  'con', 'tôi', 'tao', 'tớ', 'mình', 'bạn', 'mày', 'họ', 'chúng', 'ta',
  'anh', 'chị', 'em', 'ông', 'bà', 'cô', 'chú', 'bác', 'dì', 'mẹ',
  'cha', 'bố', 'ba', 'con', 'cháu', 'thầy', 'cậu', 'mợ', 'dượng', 'bằng',
  'theo', 'cùng', 'giữa', 'trước', 'sau', 'trong', 'ngoài', 'ở', 'tại', 'nơi',
  'chỗ', 'đâu', 'kìa', 'nọ', 'nay', 'mai', 'hôm', 'tuần', 'chứ', 'à',
  'ừ', 'ờ', 'ạ', 'nhé', 'nhỉ', 'đấy', 'thôi', 'hả', 'vâng', 'dạ',
  'không', 'chẳng', 'chả', 'cứ', 'lắm', 'thật', 'quá', 'cực', 'siêu', 'khá',
  'hơi', 'tương', 'đối', 'đủ', 'nữa', 'thêm', 'bớt', 'đều', 'cả', 'toàn',
  'từng', 'mọi', 'mỗi', 'vài', 'dăm', 'nhỡ', 'lỡ', 'tuy', 'song', 'dẫu',
]);

/**
 * Returns the appropriate stopword set for the given language code.
 */
export function getStopwords(language: LanguageCode): ReadonlySet<string> {
  return language === 'vi' ? VI_STOPWORDS : EN_STOPWORDS;
}
