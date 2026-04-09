import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PdfGenerator } from '../../src/pdf/pdf.generator';
import { Classification } from '@repo/shared';
import { makeAnalyzeResult } from '../../src/report/test-fixtures/analyze-result.fixture';
import { makeKeywordResult } from '../../src/report/test-fixtures/keyword-result.fixture';
import { makeCwv } from '../../src/report/test-fixtures/cwv.fixture';

const fakePage = {
  setContent: vi.fn().mockResolvedValue(undefined),
  pdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
  close: vi.fn().mockResolvedValue(undefined),
};
const fakeContext = {
  newPage: vi.fn().mockResolvedValue(fakePage),
  close: vi.fn().mockResolvedValue(undefined),
};
const fakeBrowser = { newContext: vi.fn().mockResolvedValue(fakeContext) };
const browserPool: any = { acquire: () => fakeBrowser };

describe('PdfGenerator', () => {
  let gen: PdfGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    gen = new PdfGenerator(browserPool);
  });

  it('renders Handlebars HTML, calls page.pdf, and returns binary + filename', async () => {
    const buf = await gen.generate({
      auditId: 'aud-1',
      url: 'https://example.com/',
      domain: 'example.com',
      finalScore: 80,
      classification: Classification.EXCELLENT,
      analyze: makeAnalyzeResult(),
      keywords: makeKeywordResult().keywords,
      cwv: makeCwv(),
      categoryScores: makeAnalyzeResult().categoryScores,
    });

    expect(fakePage.setContent).toHaveBeenCalledOnce();
    const html = (fakePage.setContent.mock.calls[0] as any[])[0] as string;
    expect(html).toContain('SEO Audit Report');
    expect(html).toContain('example.com');
    expect(html).toContain('80');
    expect(fakePage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'A4', printBackground: true }),
    );
    expect(buf.pdf).toBeInstanceOf(Buffer);
    expect(buf.filename).toMatch(/^seo-report-example\.com-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(fakePage.close).toHaveBeenCalled();
    expect(fakeContext.close).toHaveBeenCalled();
  });

  it('limits topKeywords to 20 entries', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      keyword: `kw${i}`,
      frequency: 1,
      densityPercent: 0.1,
      inTitle: false,
      inH1: false,
      inFirstParagraph: false,
      inMetaDescription: false,
      rank: i + 1,
      isTarget: false,
    }));
    await gen.generate({
      auditId: 'a',
      url: 'https://x.com/',
      domain: 'x.com',
      finalScore: 50,
      classification: Classification.FAIR,
      analyze: makeAnalyzeResult(),
      keywords: many,
      cwv: makeCwv(),
      categoryScores: [],
    });
    const html = (fakePage.setContent.mock.calls[0] as any[])[0] as string;
    expect((html.match(/<tr>/g) ?? []).length).toBeLessThanOrEqual(21); // 1 header + 20 rows
  });
});
