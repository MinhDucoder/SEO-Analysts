"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Floating "back to top" control. Fades in once the reader is deep enough into
 * the page, then smooth-scrolls to the top. Hidden from a11y/pointer tree while
 * not shown so it never traps focus.
 */
export function PolicyBackToTop({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full",
        "border border-border bg-bg-elevated text-fg-muted shadow-lg backdrop-blur",
        "transition-all duration-300 hover:-translate-y-0.5 hover:text-fg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
