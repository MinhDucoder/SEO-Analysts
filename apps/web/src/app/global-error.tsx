"use client";

/**
 * Top-level error boundary. The root layout is a pass-through (no <html>/<body>)
 * because those live in app/[locale]/layout.tsx. A global-error therefore MUST
 * render its own <html>/<body> — it replaces the entire tree when an error is
 * thrown above the locale layout (e.g. in middleware-adjacent rendering or the
 * [locale] layout itself, before NextIntlClientProvider mounts).
 *
 * Keep it self-contained: no intl, no Providers, inline styles only (Tailwind /
 * globals.css are loaded inside the locale layout, which is gone at this point).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0A0A0B",
          color: "#fafafa",
        }}
      >
        <main style={{ maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 16px" }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              fontSize: 14,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #2a2a2e",
              background: "#fafafa",
              color: "#0A0A0B",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
