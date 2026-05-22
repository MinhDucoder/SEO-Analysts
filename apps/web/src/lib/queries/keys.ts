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
  admin: {
    all: () => ["admin"] as const,
    stats: (period: number) => ["admin", "stats", period] as const,
    users: (filters: Record<string, unknown>) =>
      ["admin", "users", filters] as const,
    rules: () => ["admin", "rules"] as const,
  },
  /**
   * Billing keys — populated by slug 5 (subscriptions-vietqr).
   *   billing.plans()        → GET /plans
   *   billing.subscription() → GET /me/subscription
   *   billing.intents()      → GET /billing/payment-intents
   *   billing.intent(id)     → GET /billing/payment-intents/:id
   */
  billing: {
    plans: () => ["billing", "plans"] as const,
    subscription: () => ["billing", "subscription"] as const,
    intents: () => ["billing", "intents"] as const,
    intent: (id: string) => ["billing", "intent", id] as const,
  },
  /**
   * SEO tools keys — public tools under /tools/*. Each tool is a mutation
   * (POST), so these serve as stable mutationKeys for devtools/dedupe.
   */
  tools: {
    all: ["tools"] as const,
    google: () => ["tools", "google"] as const,
    social: () => ["tools", "social"] as const,
    schema: () => ["tools", "schema"] as const,
    sitemap: () => ["tools", "sitemap"] as const,
    favicon: () => ["tools", "favicon"] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
