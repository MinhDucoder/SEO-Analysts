"use client";

import { useAuthBootstrap } from "@/lib/auth/hooks";

/**
 * Side-effect-only client component. Runs `useAuthBootstrap` exactly once
 * on mount to silently refresh (if there's a valid cookie) and hydrate the
 * auth store before guarded children render.
 *
 * Mounted inside QueryClientProvider in `app/providers.tsx`.
 */
export function AuthBootstrap() {
  useAuthBootstrap();
  return null;
}
