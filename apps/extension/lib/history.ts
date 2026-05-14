/**
 * Per-device audit history. Spec § 2.3 (docs/extension/02-design.md):
 * keep the last 20 audit headers + their full responses, FIFO drop
 * when capped or when chrome.storage.local goes over 4 MB.
 *
 * Storage shape:
 *   chrome.storage.local.history     = HistoryEntry[]            (≤ 20, newest first)
 *   chrome.storage.local['ah:<id>']  = PublicCheckResponse blob  (per entry)
 *
 * The list lives in a single key so reading "give me my history" is
 * one IO round-trip; blobs are sharded so we can lazy-load the full
 * response on entry click.
 */
import type { PublicCheckResponse } from './api-types';
import type { PublicApiLanguage } from './types';

export const HISTORY_MAX_ENTRIES = 20;
const HISTORY_LIST_KEY = 'history';
const HISTORY_BLOB_PREFIX = 'ah:';
const QUOTA_HIGH_WATERMARK_BYTES = 4 * 1024 * 1024; // 4 MB — leave 1 MB headroom under the 5 MB cap.

export interface HistoryEntry {
  id: string;
  ranAt: number;
  url: string;
  keyword: string;
  language: PublicApiLanguage;
  score: number;
  issueCount: number;
  cached: boolean;
  requestId: string;
  blobKey: string;
}

export interface AddHistoryCtx {
  url: string;
  keyword: string;
  language: PublicApiLanguage;
}

async function readList(): Promise<HistoryEntry[]> {
  try {
    const out = (await chrome.storage.local.get(HISTORY_LIST_KEY)) as Record<
      string,
      unknown
    >;
    const v = out[HISTORY_LIST_KEY];
    return Array.isArray(v) ? (v as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeList(list: HistoryEntry[]): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_LIST_KEY]: list });
}

async function bytesInUse(): Promise<number> {
  try {
    if (typeof chrome.storage.local.getBytesInUse === 'function') {
      return await chrome.storage.local.getBytesInUse();
    }
  } catch {
    // older browsers may not expose getBytesInUse — fall through.
  }
  return 0;
}

function newId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  return readList();
}

export async function getHistoryResult(
  id: string,
): Promise<PublicCheckResponse | null> {
  const key = `${HISTORY_BLOB_PREFIX}${id}`;
  try {
    const out = (await chrome.storage.local.get(key)) as Record<string, unknown>;
    const v = out[key];
    return v ? (v as PublicCheckResponse) : null;
  } catch {
    return null;
  }
}

export async function addHistoryEntry(
  result: PublicCheckResponse,
  ctx: AddHistoryCtx,
): Promise<HistoryEntry> {
  const id = newId();
  const entry: HistoryEntry = {
    id,
    ranAt: Date.now(),
    url: ctx.url,
    keyword: ctx.keyword,
    language: ctx.language,
    score: result.score,
    issueCount: result.issues.length,
    cached: result.meta.cached,
    requestId: result.meta.requestId,
    blobKey: `${HISTORY_BLOB_PREFIX}${id}`,
  };

  const list = await readList();
  list.unshift(entry);
  while (list.length > HISTORY_MAX_ENTRIES) {
    const dropped = list.pop();
    if (dropped) await chrome.storage.local.remove(dropped.blobKey);
  }

  await chrome.storage.local.set({
    [HISTORY_LIST_KEY]: list,
    [entry.blobKey]: result,
  });

  // After writing, evict oldest entries while we sit above the quota
  // watermark. Cheaper than running before-write since the new entry's
  // size depends on the response payload we just want to keep.
  let used = await bytesInUse();
  while (used > QUOTA_HIGH_WATERMARK_BYTES && list.length > 1) {
    const dropped = list.pop();
    if (!dropped) break;
    await chrome.storage.local.remove(dropped.blobKey);
    await writeList(list);
    used = await bytesInUse();
  }

  return entry;
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const list = await readList();
  const filtered = list.filter((e) => e.id !== id);
  await writeList(filtered);
  await chrome.storage.local.remove(`${HISTORY_BLOB_PREFIX}${id}`);
}

export async function clearHistory(): Promise<void> {
  const list = await readList();
  if (list.length > 0) {
    await chrome.storage.local.remove(list.map((e) => e.blobKey));
  }
  await chrome.storage.local.remove(HISTORY_LIST_KEY);
}
