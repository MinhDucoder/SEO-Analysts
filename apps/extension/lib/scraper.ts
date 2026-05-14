/**
 * URL-vs-HTML mode picker + minimal HTML serializer for content-script
 * use. Tested with happy-dom; runs in a real DOM at runtime.
 *
 * Design rationale (`docs/superpowers/specs/2026-04-29-chrome-ext-design.md`
 * § 7, § 8):
 *   - URL mode (preferred): client only sends the URL, gateway fetches
 *     the page server-side. Consistent UA + crawl semantics + cache.
 *   - HTML mode (fallback): client serialises the live DOM. Necessary
 *     for auth-gated pages the gateway can't reach.
 *
 * The picker errs on the side of URL mode: anything that smells like a
 * dashboard / admin / draft / preview URL → HTML mode. Localhost +
 * non-https URLs also fall back to HTML because the gateway can't fetch
 * them. The exact list lives in `AUTH_GATED_PATTERNS` so it's auditable.
 */

const AUTH_GATED_PATTERNS = [
  /\/admin(\/|$|\?)/i,
  /\/dashboard(\/|$|\?)/i,
  /\/wp-admin(\/|$|\?)/i,
  /\/account(\/|$|\?)/i,
  /\/settings(\/|$|\?)/i,
  /\/draft(\/|$|\?)/i,
  /\/preview(\/|$|\?)/i,
  /\/editor(\/|$|\?)/i,
];

/** Public for testing. */
export function shouldUseHtmlMode(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    // unparseable URL → fall back to HTML (the gateway would reject
    // the URL mode with INVALID_URL anyway).
    return true;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return true;
  if (u.protocol === 'http:' && u.hostname !== 'localhost') {
    // gateway will likely 4xx http:// public pages — better to scrape.
    return true;
  }
  if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  if (AUTH_GATED_PATTERNS.some((re) => re.test(u.pathname + u.search))) {
    return true;
  }
  return false;
}

/** Bytes the gateway will reject on the JSON body. Mirror of
 * `PUBLIC_API_RATE_LIMITS.PAYLOAD_MAX_BYTES` in `@repo/shared`. Kept
 * local so the extension doesn't pull the whole package. */
export const HTML_PAYLOAD_MAX_BYTES = 200 * 1024;

/**
 * Strip noise (script, style, hidden elements, comments, inline event
 * handlers) and return a string that's safe to send to the gateway.
 * Caps the output at `HTML_PAYLOAD_MAX_BYTES` to match the gateway's
 * limit; throws if the page is still too large after stripping so the
 * popup can branch to a clearer toast than the gateway's 413.
 */
export function serializeMinimalHtml(doc: Document): string {
  const clone = doc.cloneNode(true) as Document;

  // Remove resource-heavy nodes that contribute nothing to SEO scoring.
  for (const sel of ['script', 'style', 'noscript', 'iframe', 'svg', 'template']) {
    for (const el of Array.from(clone.querySelectorAll(sel))) el.remove();
  }
  // Remove explicitly-hidden elements (display:none / hidden attr).
  for (const el of Array.from(clone.querySelectorAll('[hidden]'))) el.remove();
  // Strip inline event handlers (`onclick`, `onerror`, etc.) — Cheerio
  // on the gateway doesn't execute them, but stripping shrinks the
  // payload and makes the request auditable.
  for (const el of Array.from(clone.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
  }

  const html = `<!doctype html>\n${clone.documentElement.outerHTML}`;
  const bytes = new TextEncoder().encode(html).byteLength;
  if (bytes > HTML_PAYLOAD_MAX_BYTES) {
    throw new Error(
      `HTML payload is ${bytes} bytes after stripping — exceeds the ` +
        `${HTML_PAYLOAD_MAX_BYTES}-byte cap. Try the URL mode instead.`,
    );
  }
  return html;
}
