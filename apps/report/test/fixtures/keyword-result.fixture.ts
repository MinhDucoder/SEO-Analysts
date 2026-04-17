import { KeywordResult } from '../../src/report/domain/keyword-result.interface';

export function makeKeywordResult(overrides: Partial<KeywordResult> = {}): KeywordResult {
  return {
    auditId: '00000000-0000-0000-0000-000000000001',
    keywords: [
      {
        keyword: 'seo',
        frequency: 18,
        densityPercent: 2.4,
        inTitle: true,
        inH1: false,
        inFirstParagraph: true,
        inMetaDescription: true,
        rank: 1,
        isTarget: true,
      },
      {
        keyword: 'analysis',
        frequency: 12,
        densityPercent: 1.6,
        inTitle: false,
        inH1: false,
        inFirstParagraph: true,
        inMetaDescription: false,
        rank: 2,
        isTarget: false,
      },
    ],
    ...overrides,
  };
}
