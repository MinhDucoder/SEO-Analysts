/**
 * Centralized TanStack Query key factory. Every useQuery/useMutation in the
 * app MUST source its key from this object so invalidation stays grep-safe.
 *
 * Slug 1 ships this as an empty template. Subsequent slugs populate:
 *   - slug 2 auth-flow:          queryKeys.auth.*
 *   - slug 4 audits-list-create: queryKeys.audits.*
 *   - slug 5 audits-detail:      queryKeys.audits.detail, .status
 *   - slug 7 admin-panel:        queryKeys.admin.*
 *
 * Reference pattern documented in docs/design/30-frontend-architecture.md §6.2.
 */

export const queryKeys = {
  // Populated by downstream slugs.
} as const;

export type QueryKeys = typeof queryKeys;
