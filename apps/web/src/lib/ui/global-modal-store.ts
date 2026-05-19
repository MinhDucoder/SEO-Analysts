import { create } from "zustand";

/**
 * Cross-feature modals triggered by the ky `afterResponse` interceptor.
 * `kind: null` keeps both modals dismissed; setting `kind` opens the
 * matching modal. Only one modal is in flight at a time — back-to-back
 * 403/429 responses overwrite each other (the latest one wins), which
 * matches the user-visible reality.
 */
export type GlobalModalKind = "accountLocked" | "rateLimit" | null;

interface GlobalModalState {
  kind: GlobalModalKind;
  /** For rateLimit: server-suggested wait time in seconds (Retry-After). */
  retryAfterSec: number;
  /** For accountLocked: support email surfaced in the modal copy. */
  contactEmail: string;

  open: (input:
    | { kind: "accountLocked"; contactEmail?: string }
    | { kind: "rateLimit"; retryAfterSec: number }
  ) => void;
  close: () => void;
}

const DEFAULT_CONTACT_EMAIL = "support@seo.local";

export const useGlobalModalStore = create<GlobalModalState>((set) => ({
  kind: null,
  retryAfterSec: 0,
  contactEmail: DEFAULT_CONTACT_EMAIL,

  open: (input) => {
    if (input.kind === "accountLocked") {
      set({
        kind: "accountLocked",
        contactEmail: input.contactEmail ?? DEFAULT_CONTACT_EMAIL,
      });
    } else {
      set({
        kind: "rateLimit",
        retryAfterSec: Math.max(0, Math.floor(input.retryAfterSec)),
      });
    }
  },
  close: () => set({ kind: null }),
}));
