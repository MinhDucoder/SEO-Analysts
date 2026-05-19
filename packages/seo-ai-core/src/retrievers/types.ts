export interface RetrievedDoc {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RetrieverSearchOptions {
  topK?: number;
  /** Optional minimum score threshold; docs below are filtered out. */
  minScore?: number;
}

export interface IRetriever {
  search(query: string, opts?: RetrieverSearchOptions): Promise<RetrievedDoc[]>;
}
