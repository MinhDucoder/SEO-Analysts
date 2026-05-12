"use client";

import * as React from "react";
import { Copy, Loader2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCreateShareLink,
  useRevokeShareLink,
} from "@/lib/queries/use-audits";

export interface ShareDialogProps {
  auditId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Pencil AuditDetail/Modal/Share. Mints a public share link on demand:
 *
 *   1. First open → "Generate share link" CTA. POST /audits/:id/share.
 *   2. After creation → readonly input with the URL + Copy + Revoke.
 *   3. Revoke → DELETE /audits/:id/share, falls back to step 1.
 *
 * The token lives in local state for the lifetime of the dialog —
 * BACKEND-API doesn't return the active token from GET /audits/:id, so
 * we surface what we minted and prompt the user to re-generate after a
 * revoke if they need a new one.
 */
export function ShareDialog({ auditId, open, onOpenChange }: ShareDialogProps) {
  const t = useTranslations("auditDetail.share");
  const createMutation = useCreateShareLink(auditId);
  const revokeMutation = useRevokeShareLink(auditId);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Reset local state every time the dialog re-opens.
  React.useEffect(() => {
    if (open) {
      setShareUrl(null);
      setCopied(false);
    }
  }, [open]);

  const handleCreate = () => {
    createMutation.mutate(undefined, {
      onSuccess: (res) => setShareUrl(res.shareUrl),
      onError: () => toast.error(t("errorCreate")),
    });
  };

  const handleRevoke = () => {
    if (typeof window !== "undefined" && !window.confirm(t("revokeConfirm"))) {
      return;
    }
    revokeMutation.mutate(undefined, {
      onSuccess: () => {
        setShareUrl(null);
        toast.success(t("revokeSuccess"));
      },
      onError: () => toast.error(t("errorRevoke")),
    });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error(t("errorCreate"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="font-ui text-xs font-medium uppercase tracking-wider text-fg-muted">
                {t("linkLabel")}
              </span>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  {copied ? t("copied") : t("copy")}
                </Button>
              </div>
            </div>
            <p className="font-ui text-xs text-fg-muted">{t("helper")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-ui text-sm text-fg-muted">{t("noLink")}</p>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {createMutation.isPending ? t("creating") : t("createCta")}
            </Button>
          </div>
        )}

        <DialogFooter>
          {shareUrl && (
            <Button
              variant="outline"
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              className="text-class-poor hover:bg-class-poor/10 hover:text-class-poor"
            >
              <Trash2 className="h-4 w-4" />
              {revokeMutation.isPending ? t("revoking") : t("revoke")}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
