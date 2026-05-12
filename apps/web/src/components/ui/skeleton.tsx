import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-bg-overlay",
        "relative overflow-hidden",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-bg-elevated/40 before:to-transparent before:animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}
