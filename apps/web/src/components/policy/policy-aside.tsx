"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TocItem {
  id: string;
  label: string;
}

interface PolicyAsideProps {
  items: TocItem[];
  tocTitle: string;
  printLabel: string;
}

/**
 * Sticky table of contents with scroll-spy. Highlights the section currently
 * in view via IntersectionObserver and smooth-scrolls on click (updating the
 * hash without a jump). Print affordance triggers the browser dialog.
 */
export function PolicyAside({ items, tocTitle, printLabel }: PolicyAsideProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Top-most intersecting section wins.
        const [first] = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (first) setActive(first.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label={tocTitle} className="text-sm">
      <p className="mb-3 px-3 font-mono text-xs uppercase tracking-widest text-fg-subtle">
        {tocTitle}
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {items.map((item, i) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group -ml-px flex items-center gap-2.5 border-l-2 py-1.5 pl-3 transition-colors",
                  isActive
                    ? "border-fg font-medium text-fg"
                    : "border-transparent text-fg-subtle hover:border-border-strong hover:text-fg-muted",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[0.7rem] tabular-nums transition-colors",
                    isActive ? "text-fg-muted" : "text-fg-disabled",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => window.print()}
        className={cn(
          "mt-5 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-fg-subtle transition-colors",
          "hover:bg-bg-overlay hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Printer className="h-3.5 w-3.5" />
        {printLabel}
      </button>
    </nav>
  );
}
