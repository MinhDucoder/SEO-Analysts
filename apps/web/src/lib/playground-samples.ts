import type { PublicCheckRequest } from '@/types/api';

export interface PlaygroundSample {
  id: string;
  label: string;
  description: string;
  request: PublicCheckRequest;
}

export const PLAYGROUND_SAMPLES: PlaygroundSample[] = [
  {
    id: 'html-short-blog',
    label: 'Short blog (HTML, VN)',
    description: 'Bài blog ngắn — test content-only 16 rules.',
    request: {
      input: {
        type: 'html',
        html: '<html><head><title>Blog SEO 2026</title><meta name="description" content="Tổng hợp xu hướng SEO 2026." /></head><body><h1>SEO 2026 cơ bản</h1><p>Nội dung ngắn để test.</p></body></html>',
      },
      targetKeyword: 'seo 2026',
      options: { enrichMode: 'template', language: 'vi' },
    },
  },
  {
    id: 'markdown-issues',
    label: 'Markdown with issues (VN)',
    description: 'Bài có nhiều lỗi SEO — title ngắn, thiếu H1.',
    request: {
      input: {
        type: 'markdown',
        markdown: '# SEO\n\nbài viết ngắn không có từ khóa chính và không có description.',
      },
      targetKeyword: 'on-page seo',
      options: { enrichMode: 'llm', language: 'vi' },
    },
  },
  {
    id: 'url-blog',
    label: 'URL: Vietnamese blog',
    description: 'Fetch & analyze một URL công khai.',
    request: {
      input: { type: 'url', url: 'https://example.com/seo-blog' },
      targetKeyword: 'seo',
      options: { enrichMode: 'template', language: 'vi' },
    },
  },
];
