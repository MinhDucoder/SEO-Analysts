"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGlobalModalStore } from "@/lib/ui/global-modal-store";

/**
 * Surfaced by the ky 429 interceptor. Countdown ticks down to zero
 * locally so the user has a visual cue for when retries are safe; the
 * gateway is the actual gate.
 */
export function RateLimitModal() {
  const kind = useGlobalModalStore((s) => s.kind);
  const initialRetry = useGlobalModalStore((s) => s.retryAfterSec);
  const close = useGlobalModalStore((s) => s.close);
  const t = useTranslations("globalModal.rateLimit");

  const open = kind === "rateLimit";
  const [remaining, setRemaining] = React.useState(initialRetry);

  React.useEffect(() => {
    if (!open) return;
    setRemaining(initialRetry);
    if (initialRetry <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((s) => (s <= 1 ? 0 : s - 1));
    }, 1_000);
    return () => window.clearInterval(id);
  }, [open, initialRetry]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-class-fair/10 text-class-fair">
            <Clock className="h-8 w-8" aria-hidden />
          </div>
          <DialogTitle className="text-center">{t("title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("body")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-1">
          <span className="font-ui text-xs uppercase tracking-wider text-fg-muted">
            {t("retryIn")}
          </span>
          <span className="font-mono text-3xl font-semibold text-fg">
            {t("seconds", { n: remaining })}
          </span>
        </div>
        <div className="flex justify-center">
          <Button variant="secondary" onClick={close}>
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
