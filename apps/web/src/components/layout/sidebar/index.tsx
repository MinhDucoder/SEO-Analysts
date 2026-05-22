"use client";

import {
  BarChart3,
  Clock,
  GitCompare,
  LayoutDashboard,
  List,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarHeader } from "./header";
import { SidebarFooter } from "./footer";
import { NavItem } from "./nav-item";
import { useUiPrefs } from "@/lib/ui/prefs";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/constants";

/**
 * Pencil Component/AppShell/Sidebar/Container — compose Header + Nav + Footer.
 * 240px expanded, 64px collapsed.
 */
export function Sidebar() {
  const collapsed = useUiPrefs((s) => s.sidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin)();
  const tNav = useTranslations("nav");

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-bg-elevated transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
      aria-label="Primary navigation"
    >
      <SidebarHeader collapsed={collapsed} />

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto py-3",
          collapsed ? "items-center px-2" : "px-3",
        )}
      >
        <NavItem
          href={ROUTES.dashboard}
          icon={LayoutDashboard}
          label={tNav("dashboard")}
          collapsed={collapsed}
        />
        <NavItem href={ROUTES.audits} icon={List} label={tNav("audits")} collapsed={collapsed} />
        <NavItem
          href="/scheduled"
          icon={Clock}
          label={tNav("scheduled")}
          collapsed={collapsed}
        />
        <NavItem
          href="/audits/compare"
          icon={GitCompare}
          label={tNav("compare")}
          collapsed={collapsed}
        />
        <NavItem
          href={ROUTES.pricing}
          icon={Sparkles}
          label={tNav("pricing")}
          collapsed={collapsed}
        />
        <NavItem
          href={ROUTES.settingsProfile}
          icon={Settings}
          label={tNav("settings")}
          collapsed={collapsed}
        />

        {isAdmin && (
          <>
            <div
              className={cn(
                "mt-3 px-2 font-ui text-xs uppercase tracking-wider text-fg-subtle",
                collapsed && "hidden",
              )}
            >
              {tNav("admin")}
            </div>
            <NavItem
              href={ROUTES.adminStats}
              icon={BarChart3}
              label={tNav("stats")}
              collapsed={collapsed}
            />
            <NavItem
              href={ROUTES.adminUsers}
              icon={Users}
              label={tNav("users")}
              collapsed={collapsed}
            />
            <NavItem
              href={ROUTES.adminRules}
              icon={ShieldCheck}
              label={tNav("rules")}
              collapsed={collapsed}
            />
          </>
        )}
      </nav>

      <SidebarFooter
        collapsed={collapsed}
        user={user ? { fullName: user.fullName, email: user.email } : null}
      />
    </aside>
  );
}
