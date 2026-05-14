// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  shouldUseHtmlMode,
  serializeMinimalHtml,
  HTML_PAYLOAD_MAX_BYTES,
} from '../lib/scraper';

describe('shouldUseHtmlMode', () => {
  it.each([
    'https://example.com/blog/post-1',
    'https://example.com/',
    'https://example.com/products/123',
  ])('public URL %s → URL mode', (url) => {
    expect(shouldUseHtmlMode(url)).toBe(false);
  });

  it.each([
    'https://example.com/admin',
    'https://example.com/wp-admin/post.php?id=1',
    'https://example.com/dashboard/overview',
    'https://example.com/settings/api-keys',
    'https://example.com/account/profile',
    'https://example.com/draft/abc',
    'https://example.com/preview/post-1',
    'https://example.com/editor',
    'http://localhost:3000/',
    'http://127.0.0.1/api',
    'http://example.com/post', // non-https public → unreachable for gateway-fetch
    'chrome://newtab/',
    'about:blank',
  ])('auth-gated / unreachable URL %s → HTML mode', (url) => {
    expect(shouldUseHtmlMode(url)).toBe(true);
  });
});

describe('serializeMinimalHtml', () => {
  function parse(html: string): Document {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  it('strips script, style, noscript, iframe, svg, template', () => {
    const doc = parse(`
      <!doctype html><html><head>
        <title>T</title>
        <style>body{}</style>
        <script>/* trackingSentinelABC */ var x = 1;</script>
      </head><body>
        <main>hello</main>
        <noscript>nope</noscript>
        <iframe></iframe>
        <svg><circle/></svg>
        <template><div>tpl</div></template>
      </body></html>
    `);
    const out = serializeMinimalHtml(doc);
    expect(out).toContain('<title>T</title>');
    expect(out).toContain('<main>hello</main>');
    expect(out).not.toContain('trackingSentinelABC');
    expect(out).not.toContain('<style');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<svg');
    expect(out).not.toContain('<noscript');
    expect(out).not.toContain('<template');
  });

  it('removes [hidden] elements', () => {
    const doc = parse(
      '<!doctype html><html><body><p>shown</p><p hidden>gone</p></body></html>',
    );
    const out = serializeMinimalHtml(doc);
    expect(out).toContain('shown');
    expect(out).not.toContain('gone');
  });

  it('strips inline event handlers', () => {
    const doc = parse(
      '<!doctype html><html><body><button onclick="x()" onerror="y()" data-keep="1">k</button></body></html>',
    );
    const out = serializeMinimalHtml(doc);
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
    expect(out).toContain('data-keep');
  });

  it('throws when the result exceeds HTML_PAYLOAD_MAX_BYTES', () => {
    const filler = 'x'.repeat(HTML_PAYLOAD_MAX_BYTES);
    const doc = parse(`<!doctype html><html><body><p>${filler}</p></body></html>`);
    expect(() => serializeMinimalHtml(doc)).toThrow(/exceeds the/);
  });

  it('emits a doctype prefix and the root html element', () => {
    const doc = parse(
      '<!doctype html><html lang="vi"><head><title>x</title></head><body>y</body></html>',
    );
    const out = serializeMinimalHtml(doc);
    expect(out.startsWith('<!doctype html>')).toBe(true);
    expect(out).toMatch(/<html[^>]*>[\s\S]*<\/html>/);
  });

  describe('aggressive mode', () => {
    it('strips nav, footer, aside, header[role=banner] and role=navigation/complementary', () => {
      const doc = parse(`
        <!doctype html><html><head><title>T</title></head><body>
          <header role="banner">brand</header>
          <nav>NAV_LINKS</nav>
          <aside>ASIDE_AD</aside>
          <div role="navigation">ROLE_NAV</div>
          <div role="complementary">ROLE_COMP</div>
          <main>main content kept</main>
          <footer>FOOTER_LINKS</footer>
        </body></html>
      `);
      const out = serializeMinimalHtml(doc, { aggressive: true });
      expect(out).toContain('main content kept');
      expect(out).toContain('<title>T</title>');
      expect(out).not.toContain('NAV_LINKS');
      expect(out).not.toContain('FOOTER_LINKS');
      expect(out).not.toContain('ASIDE_AD');
      expect(out).not.toContain('ROLE_NAV');
      expect(out).not.toContain('ROLE_COMP');
      expect(out).not.toContain('brand');
    });

    it('default (non-aggressive) keeps nav and footer', () => {
      const doc = parse(
        '<!doctype html><html><body><nav>KEEP_NAV</nav><main>m</main><footer>KEEP_FOOTER</footer></body></html>',
      );
      const out = serializeMinimalHtml(doc);
      expect(out).toContain('KEEP_NAV');
      expect(out).toContain('KEEP_FOOTER');
    });
  });
});
