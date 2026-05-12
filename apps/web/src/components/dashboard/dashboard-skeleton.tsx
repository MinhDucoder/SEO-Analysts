import { Skeleton } from "@/components/ui/skeleton";

/**
 * Pencil skeleton for the dashboard. Mirrors the bento grid: hero,
 * 4 stat cards, trend chart, recent audits — all animated placeholders.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Skeleton className="col-span-12 h-44 rounded-lg lg:col-span-5" />
        <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7 lg:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Skeleton className="col-span-12 h-72 rounded-lg lg:col-span-7" />
        <Skeleton className="col-span-12 h-72 rounded-lg lg:col-span-5" />
      </div>
    </div>
  );
}
