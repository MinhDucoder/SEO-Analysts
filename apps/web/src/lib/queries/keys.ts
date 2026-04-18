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
} as const;

export type QueryKeys = typeof queryKeys;
