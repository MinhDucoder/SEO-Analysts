'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return <SonnerToaster position="top-right" richColors closeButton />;
}

export { toast };
