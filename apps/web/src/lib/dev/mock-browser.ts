/**
 * Boots the MSW browser worker for dev bypass mode. Dynamically imports
 * `msw/browser` so the worker bundle stays out of normal dev/prod chunks
 * — only loaded when bypass is enabled.
 *
 * Idempotent: subsequent calls return the same start promise.
 */

let started: Promise<void> | null = null;

export function startMockWorker(): Promise<void> {
  if (started) return started;
  started = (async () => {
    const { setupWorker } = await import("msw/browser");
    const { mockHandlers } = await import("@/lib/dev/mock-handlers");
    const worker = setupWorker(...mockHandlers);
    await worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: { url: "/mockServiceWorker.js" },
    });
    // eslint-disable-next-line no-console
    console.info(
      `[dev-bypass] MSW worker started — ${mockHandlers.length} handlers registered.`,
    );
  })();
  return started;
}
