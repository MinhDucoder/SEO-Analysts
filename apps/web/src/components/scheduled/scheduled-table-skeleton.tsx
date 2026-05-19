import { Skeleton } from "@/components/ui/skeleton";

export interface ScheduledTableSkeletonProps {
  rows?: number;
}

export function ScheduledTableSkeleton({ rows = 5 }: ScheduledTableSkeletonProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-elevated">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-border bg-bg-overlay/40">
          <tr>
            {Array.from({ length: 7 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: 6 }).map((_, c) => (
                <td key={c} className="px-4 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>
              ))}
              <td className="px-4 py-4">
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
