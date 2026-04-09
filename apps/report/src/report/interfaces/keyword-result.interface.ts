export interface KeywordResultItem {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  rank: number;
  isTarget: boolean;
}

export interface KeywordResult {
  auditId: string;
  keywords: KeywordResultItem[];
}
