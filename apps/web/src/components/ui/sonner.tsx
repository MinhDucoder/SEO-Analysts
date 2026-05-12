"use client";

import * as React from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

/**
 * Sonner toast container styled with Pencil tokens.
 * Position: top-right desktop, top-center mobile (handled by Sonner default).
 * Phase 4 AppShell/WithToastStack reference: 24px from edge, 12px gap.
 */
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="system"
      position="top-right"
      offset={24}
      gap={12}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-bg-elevated group-[.toaster]:text-fg group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-fg-muted",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-class-excellent/40",
          error: "group-[.toaster]:border-class-poor/40",
          warning: "group-[.toaster]:border-class-fair/40",
          info: "group-[.toaster]:border-status-active/40",
        },
      }}
      {...props}
    />
  );
}
