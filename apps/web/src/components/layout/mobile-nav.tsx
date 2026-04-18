"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/wordmark";
import { SidebarLink } from "@/components/layout/sidebar-link";
import { UserMenuCard } from "@/components/layout/user-menu-card";
import type { AuthenticatedUser } from "@/lib/api/types";
import { SIDEBAR_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile navigation drawer (< lg). Renders a hamburger button that opens
 * a Radix Dialog slid in from the left, matching sidebar styling.
 * Clicking any nav item or the overlay closes the drawer.
 */
export interface MobileNavProps {
  user: AuthenticatedUser | null;
  className?: string;
}

export function MobileNav({ user, className }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const items = SIDEBAR_NAV.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

  return (
    <div className={cn("lg:hidden", className)}>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DialogPrimitive.Trigger>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw]",
              "bg-sidebar-bg rounded-r-2xl shadow-xl py-6 flex flex-col",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            )}
            aria-label="Menu điều hướng"
          >
            <DialogPrimitive.Title className="sr-only">
              Điều hướng
            </DialogPrimitive.Title>

            <div className="px-6 mb-8 flex items-center justify-between">
              <Wordmark variant="light" />
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đóng menu"
                  className="text-sidebar-text hover:text-sidebar-text-hover hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>

            <nav className="flex-1 space-y-1" aria-label="Danh mục">
              {items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </nav>

            <div className="mt-auto px-4 pt-4">
              <UserMenuCard user={user} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
