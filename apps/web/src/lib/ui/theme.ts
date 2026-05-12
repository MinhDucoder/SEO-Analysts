"use client";

import * as React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Theme store: 3-state preference (light/dark/system). System mode resolves
 * via `prefers-color-scheme` media query at runtime.
 *
 * The store ONLY persists user preference. The actual `data-theme` attribute
 * on `<html>` is applied by `<ThemeApplier>` (mounted in providers.tsx) so
 * server-rendered HTML never assumes the wrong theme.
 */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: "seo-analyst-theme",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Hook that returns the *resolved* theme (system → light or dark) and reacts
 * to media-query changes when preference is 'system'.
 */
export function useResolvedTheme(): ResolvedTheme {
  const preference = useThemeStore((s) => s.preference);
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return preference === "system" ? systemTheme : preference;
}

/**
 * Mount this once at the root (inside Providers). Syncs `data-theme` attr on
 * `<html>` whenever preference or system pref changes.
 */
export function ThemeApplier() {
  const resolved = useResolvedTheme();
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);
  return null;
}

// SSR-safe re-export so callers can choose to render the current resolution
// in a Server Component default (will hydrate to user pref shortly after).
export { resolveSystemTheme };
