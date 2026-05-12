import { Skeleton } from "@/components/ui/skeleton";

export function AuditDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-lg" />
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Skeleton className="col-span-12 h-64 rounded-lg lg:col-span-7" />
        <Skeleton className="col-span-12 h-64 rounded-lg lg:col-span-5" />
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
