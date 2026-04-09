export interface KeywordAnalyzeInput {
  auditId: string;
  textContent: string;
  url: string;
  title?: string;
  h1Text?: string;
  metaDescription?: string;
  targetKeyword?: string;
  language?: string; // if omitted/empty → auto-detect
}
