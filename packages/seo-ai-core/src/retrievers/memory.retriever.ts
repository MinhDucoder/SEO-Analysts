import { createHash } from 'node:crypto';
import type { IRetriever, RetrievedDoc, RetrieverSearchOptions } from './types.js';

export interface MemoryDoc {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

const VECTOR_DIM = 64;
const DEFAULT_TOP_K = 5;

interface IndexedDoc extends MemoryDoc {
  vector: Float32Array;
}

export class MemoryRetriever implements IRetriever {
  private readonly indexed: IndexedDoc[];

  constructor(docs: MemoryDoc[]) {
    this.indexed = docs.map((d) => ({ ...d, vector: embedText(d.content) }));
  }

  async search(query: string, opts: RetrieverSearchOptions = {}): Promise<RetrievedDoc[]> {
    if (this.indexed.length === 0) return [];

    const qVec = embedText(query);
    const scored: RetrievedDoc[] = this.indexed.map((d) => ({
      id: d.id,
      content: d.content,
      score: cosine(qVec, d.vector),
      metadata: d.metadata,
    }));

    const minScore = opts.minScore ?? -Infinity;
    const filtered = scored.filter((d) => d.score >= minScore);
    filtered.sort((a, b) => b.score - a.score);

    const topK = Math.min(opts.topK ?? DEFAULT_TOP_K, filtered.length);
    return filtered.slice(0, topK);
  }
}

/**
 * Deterministic fake embedding: tokenize → hash each token to a bucket
 * (0..VECTOR_DIM-1) → count frequency → L2-normalize. Captures word overlap
 * cheaply so the retriever produces sensible relative rankings without an
 * embedding API. NOT semantic — replace with real embeddings in Phase 3.
 */
function embedText(text: string): Float32Array {
  const tokens = tokenize(text);
  const v = new Float32Array(VECTOR_DIM);
  for (const t of tokens) {
    const bucket = hashToBucket(t);
    v[bucket]! += 1;
  }
  return l2Normalize(v);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hashToBucket(token: string): number {
  const h = createHash('sha256').update(token).digest();
  const u32 = h.readUInt32BE(0);
  return u32 % VECTOR_DIM;
}

function l2Normalize(v: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) sumSq += v[i]! * v[i]!;
  const norm = Math.sqrt(sumSq) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i]! / norm;
  return out;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}
