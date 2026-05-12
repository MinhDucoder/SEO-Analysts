"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Persistent UI preferences — non-critical chrome state.
 * Currently: sidebar collapsed flag.
 */
interface UiPrefsState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiPrefs = create<UiPrefsState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "seo-analyst-ui-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
