import { Skeleton } from "@/components/ui/skeleton";

/**
 * Page-level Suspense fallback for /dashboard. Shown on initial
 * navigation while the route component chunk + React Query hydrate.
 * Mirror of the in-page DashboardSkeleton so transitions don't flash.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Skeleton className="col-span-12 lg:col-span-4 h-80" />
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <Skeleton className="col-span-12 lg:col-span-8 h-80" />
        <Skeleton className="col-span-12 lg:col-span-4 h-80" />
      </div>
    </div>
  );
}
