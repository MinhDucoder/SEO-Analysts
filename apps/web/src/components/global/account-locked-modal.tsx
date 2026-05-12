"use client";

import { Ban } from "lucide-react";
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
import { useAuthStore } from "@/lib/auth/store";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants";

/**
 * Surfaced by the ky 403 interceptor when the gateway reports the account
 * is locked. The user has no way to recover client-side — we offer a
 * support contact mailto and a sign-out CTA that clears the auth store +
 * bounces to /login.
 */
export function AccountLockedModal() {
  const kind = useGlobalModalStore((s) => s.kind);
  const contactEmail = useGlobalModalStore((s) => s.contactEmail);
  const close = useGlobalModalStore((s) => s.close);
  const t = useTranslations("globalModal.accountLocked");
  const router = useRouter();

  const open = kind === "accountLocked";

  const onSignOut = () => {
    useAuthStore.getState().clearAuth();
    close();
    router.replace(ROUTES.login);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-class-poor/10 text-class-poor">
            <Ban className="h-8 w-8" aria-hidden />
          </div>
          <DialogTitle className="text-center">{t("title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("body")}
          </DialogDescription>
        </DialogHeader>
        <p className="text-center font-mono text-sm text-fg">{contactEmail}</p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <a href={`mailto:${contactEmail}`}>{t("contact")}</a>
          </Button>
          <Button variant="destructive" onClick={onSignOut}>
            {t("signOut")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
