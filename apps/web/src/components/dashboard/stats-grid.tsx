import {
  AlertTriangle,
  BarChart3,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { StatCard, type StatAccent } from "@/components/dashboard/stat-card";
import type { StatValue } from "@/lib/dashboard/aggregates";
import type { DashboardStats } from "@/lib/dashboard/aggregates";

/**
 * 2×2 grid composing 4 StatCards from `computeStats()` output. The stat
 * slugs + icon assignments stay stable across slugs so future
 * /stats/my backend can plug in real values for criticalIssues +
 * pdfsExported.
 */
export interface StatsGridProps {
  stats: DashboardStats;
  className?: string;
}

interface StatConfig {
  key: keyof DashboardStats;
  label: string;
  icon: typeof LayoutDashboard;
  accent: StatAccent;
  placeholder?: string;
}

const STAT_CONFIGS: StatConfig[] = [
  {
    key: "auditsThisMonth",
    label: "Audit tháng này",
    icon: LayoutDashboard,
    accent: "primary",
  },
  {
    key: "avgScore",
    label: "Điểm SEO TB",
    icon: BarChart3,
    accent: "tertiary",
    placeholder: "Chưa đủ dữ liệu",
  },
  {
    key: "criticalIssues",
    label: "Issue quan trọng",
    icon: AlertTriangle,
    accent: "warning",
    placeholder: "Có trong slug tiếp",
  },
  {
    key: "pdfsExported",
    label: "PDF đã xuất",
    icon: FileText,
    accent: "error",
    placeholder: "Có trong slug tiếp",
  },
];

function formatDelta(
  stat: StatValue<number>,
  direction: "higher-better" | "lower-better" = "higher-better",
): { delta: string | null; deltaDirection: "up" | "down" | "flat" } {
  if (stat.delta === null) return { delta: null, deltaDirection: "flat" };
  if (stat.delta === 0) return { delta: "±0", deltaDirection: "flat" };
  const sign = stat.delta > 0 ? "+" : "";
  const isUp = stat.delta > 0;
  const visualUp =
    direction === "higher-better" ? isUp : !isUp;
  return {
    delta: `${sign}${stat.delta}`,
    deltaDirection: visualUp ? "up" : "down",
  };
}

export function StatsGrid({ stats, className }: StatsGridProps) {
  return (
    <div
      className={[
        "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {STAT_CONFIGS.map((cfg) => {
        const stat = stats[cfg.key];
        const { delta, deltaDirection } = formatDelta(stat);
        return (
          <StatCard
            key={cfg.key}
            icon={cfg.icon}
            label={cfg.label}
            value={stat.value}
            delta={delta ?? undefined}
            deltaDirection={deltaDirection}
            accent={cfg.accent}
            placeholder={cfg.placeholder}
          />
        );
      })}
    </div>
  );
}
