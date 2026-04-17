export interface KeywordCount {
  keyword: string;
  frequency: number;
}

/**
 * Counts occurrences of each token in the provided list.
 * Input is expected to already be lowercased + stopword-filtered.
 */
export function calculateTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

/**
 * Returns the top-N keywords sorted by frequency descending.
 * Ties are broken alphabetically to ensure deterministic output
 * (critical for snapshot tests and report reproducibility).
 */
export function topNKeywords(tf: Map<string, number>, n: number): KeywordCount[] {
  return Array.from(tf.entries())
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.keyword.localeCompare(b.keyword);
    })
    .slice(0, n);
}
