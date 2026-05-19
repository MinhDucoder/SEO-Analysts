"use client";

import { Gauge, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useUiPrefs } from "@/lib/ui/prefs";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/constants";

interface SidebarHeaderProps {
  collapsed: boolean;
}

/**
 * Pencil Component/AppShell/Sidebar/Header — logo mark + wordmark (when
 * expanded) + collapse toggle. 56px tall, matches Pencil sidebarHeader.
 */
export function SidebarHeader({ collapsed }: SidebarHeaderProps) {
  const toggle = useUiPrefs((s) => s.toggleSidebar);
  return (
    <div
      className={cn(
        "flex h-14 items-center border-b border-border",
        collapsed ? "justify-center px-2" : "justify-between px-4",
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Gauge className="h-6 w-6 flex-shrink-0 text-fg" aria-hidden />
        {!collapsed && (
          <span className="truncate font-ui text-base font-semibold text-fg">{APP_NAME}</span>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors",
          "hover:bg-bg-overlay hover:text-fg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "absolute right-2",
        )}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </div>
  );
}
