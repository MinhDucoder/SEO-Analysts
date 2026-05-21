"use client";

import { create } from "zustand";

interface State {
  open: boolean;
  title: string;
  message: string;
  resetAt: string | null;
  show: (input: { title?: string; message: string; resetAt?: string | null }) => void;
  close: () => void;
}

export const useQuotaDialog = create<State>((set) => ({
  open: false,
  title: "Đã đạt giới hạn",
  message: "",
  resetAt: null,
  show: ({ title, message, resetAt }) =>
    set({ open: true, title: title ?? "Đã đạt giới hạn", message, resetAt: resetAt ?? null }),
  close: () => set({ open: false, message: "", resetAt: null }),
}));
