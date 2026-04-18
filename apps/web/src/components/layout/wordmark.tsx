import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Brand wordmark block. Default "light" variant is dark-bg friendly
 * (sidebar); "on-surface" variant is light-bg friendly (auth pages
 * landing). Tagline uses uppercase tracking styling.
 */
export interface WordmarkProps {
  variant?: "light" | "on-surface";
  className?: string;
  showTagline?: boolean;
}

export function Wordmark({
  variant = "light",
  className,
  showTagline = true,
}: WordmarkProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <h1
        className={cn(
          "font-headline font-bold tracking-tight text-h4",
          variant === "light" ? "text-white" : "text-on-surface",
        )}
      >
        {APP_NAME}
      </h1>
      {showTagline && (
        <p
          className={cn(
            "mt-1 text-micro font-medium uppercase tracking-widest",
            variant === "light" ? "text-slate-400" : "text-on-surface-variant",
          )}
        >
          {APP_TAGLINE}
        </p>
      )}
    </div>
  );
}
