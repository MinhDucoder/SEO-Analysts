"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-container-lowest group-[.toaster]:text-on-surface group-[.toaster]:border-outline-variant group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-on-surface-variant",
          actionButton: "group-[.toast]:bg-primary-container group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-surface-container group-[.toast]:text-on-surface-variant",
        },
      }}
      {...props}
    />
  );
}
