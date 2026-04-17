import { describe, expect, it } from 'vitest';
import { detectLanguage } from '../../src/keyword/domain/language-detector';

describe('detectLanguage', () => {
  it('returns "vi" when text contains Vietnamese diacritics', () => {
    expect(detectLanguage('Tôi yêu Việt Nam')).toBe('vi');
    expect(detectLanguage('Đây là một bài viết về SEO')).toBe('vi');
    expect(detectLanguage('Công nghệ phần mềm')).toBe('vi');
  });

  it('returns "en" for plain ASCII English text', () => {
    expect(detectLanguage('The quick brown fox jumps over the lazy dog')).toBe('en');
    expect(detectLanguage('SEO best practices in 2026')).toBe('en');
  });

  it('returns "en" for empty or whitespace-only text', () => {
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('   ')).toBe('en');
  });

  it('detects a single Vietnamese character mixed in English', () => {
    expect(detectLanguage('Welcome to Hà Nội city')).toBe('vi');
  });

  it('is case-insensitive for diacritics', () => {
    expect(detectLanguage('ĐẠI HỌC BÁCH KHOA')).toBe('vi');
  });
});
