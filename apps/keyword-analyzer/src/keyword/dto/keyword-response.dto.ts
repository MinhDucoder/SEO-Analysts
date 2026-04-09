export interface KeywordResultDto {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  rank: number;
}

export interface TargetKeywordAnalysisDto {
  keyword: string;
  frequency: number;
  densityPercent: number;
  inTitle: boolean;
  inH1: boolean;
  inFirstParagraph: boolean;
  inMetaDescription: boolean;
  isStuffing: boolean;
  verdict: string;
}

export interface KeywordAnalyzeOutput {
  auditId: string;
  keywords: KeywordResultDto[];
  totalWords: number;
  uniqueWords: number;
  targetAnalysis?: TargetKeywordAnalysisDto;
}
