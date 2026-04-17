/**
 * Detects document language using a simple heuristic:
 *   - If the text contains any Vietnamese diacritic character → 'vi'
 *   - Otherwise → 'en'
 *
 * This is intentionally simple: the platform only supports EN and VI today
 * and callers may override via the `language` field on KeywordRequest.
 */
const VIETNAMESE_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

export type LanguageCode = 'en' | 'vi';

export function detectLanguage(text: string): LanguageCode {
  if (!text) return 'en';
  return VIETNAMESE_CHARS.test(text) ? 'vi' : 'en';
}
