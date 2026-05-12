import { Skeleton } from "@/components/ui/skeleton";

export function SharedReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
