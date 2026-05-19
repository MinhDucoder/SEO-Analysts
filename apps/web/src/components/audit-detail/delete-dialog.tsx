"use client";

import { Loader2, TriangleAlert } from "lucide-react";
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
import { useRouter } from "@/i18n/navigation";
import { useDeleteAudit } from "@/lib/queries/use-audits";
import { ROUTES } from "@/lib/constants";

export interface DeleteDialogProps {
  auditId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Pencil AuditDetail/Modal/Delete. Confirm + DELETE /audits/:id +
 * toast + bounce back to /audits.
 */
export function DeleteDialog({ auditId, open, onOpenChange }: DeleteDialogProps) {
  const t = useTranslations("auditDetail.delete");
  const router = useRouter();
  const deleteMutation = useDeleteAudit();

  const handleConfirm = () => {
    deleteMutation.mutate(auditId, {
      onSuccess: () => {
        toast.success(t("success"));
        onOpenChange(false);
        router.replace(ROUTES.audits);
      },
      onError: () => toast.error(t("fail")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-class-poor" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="font-ui text-sm text-fg">{t("body")}</p>
          <p className="font-mono text-xs text-fg-subtle">
            {t("auditIdLabel")}: {auditId}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {deleteMutation.isPending ? t("submitting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
