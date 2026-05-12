/**
 * Centralized TanStack Query key factory. Every useQuery/useMutation in the
 * app MUST source its key from this object so invalidation stays grep-safe.
 *
 * Populated incrementally per slug:
 *   - slug 2 auth-flow:          queryKeys.auth.*       (this)
 *   - slug 4 audits-list-create: queryKeys.audits.*
 *   - slug 5 audits-detail:      queryKeys.audits.detail, .status
 *   - slug 7 admin-panel:        queryKeys.admin.*
 *
 * Reference pattern documented in docs/design/30-frontend-architecture.md §6.2.
 */

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  audits: {
    all: () => ["audits"] as const,
    list: (filters: Record<string, unknown>) => ["audits", "list", filters] as const,
    recent: (opts: { limit?: number; dateFrom?: string }) =>
      ["audits", "recent", opts] as const,
    detail: (id: string) => ["audits", "detail", id] as const,
    status: (id: string) => ["audits", "status", id] as const,
    compare: (audit1: string, audit2: string) =>
      ["audits", "compare", audit1, audit2] as const,
  },
  scheduled: {
    all: () => ["scheduled"] as const,
    list: () => ["scheduled", "list"] as const,
    detail: (id: string) => ["scheduled", "detail", id] as const,
  },
  shared: {
    detail: (token: string) => ["shared", "detail", token] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
