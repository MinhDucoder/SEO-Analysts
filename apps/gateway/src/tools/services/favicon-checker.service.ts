import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { imageSize } from 'image-size';
import { LiteFetcherService } from './lite-fetcher.service';
import {
  FaviconCheckerResponse,
  FaviconCoverage,
  FaviconIcon,
  FaviconWarning,
} from '../dto/favicon-checker.dto';

const MANIFEST_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ICON_DIM_MAX_BYTES = 500_000; // only compute dims for icons under 500 KB

const LINK_RELS = [
  'icon',
  'shortcut icon',
  'apple-touch-icon',
  'apple-touch-icon-precomposed',
  'mask-icon',
];

interface Candidate {
  source: FaviconIcon['source'];
  rel?: string;
  href: string;
}

@Injectable()
export class FaviconCheckerService {
  constructor(private readonly fetcher: LiteFetcherService) {}

  async execute(
    url: string,
  ): Promise<{ data: FaviconCheckerResponse['data']; warnings: FaviconWarning[]; cached: boolean }> {
    const page = await this.fetcher.get(url);
    const $ = cheerio.load(page.body);
    const baseUrl = page.url;

    const candidates: Candidate[] = [];
    const seen = new Set<string>();
    const add = (source: Candidate['source'], href: string | undefined, rel?: string) => {
      if (!href) return;
      let abs: string;
      try {
        abs = new URL(href, baseUrl).toString();
      } catch {
        return;
      }
      if (seen.has(abs)) return;
      seen.add(abs);
      candidates.push({ source, rel, href: abs });
    };

    for (const rel of LINK_RELS) {
      $(`link[rel="${rel}"]`).each((_, el) => add('link', $(el).attr('href'), rel));
    }

    // Web app manifest → parse its icons.
    const manifestHref = $('link[rel="manifest"]').attr('href');
    let manifestParsed = false;
    let manifestIcons: Array<{ src?: string; sizes?: string; type?: string }> = [];
    if (manifestHref) {
      try {
        const m = await this.fetcher.get(new URL(manifestHref, baseUrl).toString(), {
          maxBytes: MANIFEST_MAX_BYTES,
        });
        const json = JSON.parse(m.body);
        if (Array.isArray(json?.icons)) {
          manifestIcons = json.icons;
          manifestParsed = true;
        }
      } catch {
        /* manifest missing / unparseable */
      }
    }
    for (const ic of manifestIcons) add('manifest', ic.src);

    // Always probe the conventional fallback.
    add('fallback', '/favicon.ico');

    const icons: FaviconIcon[] = [];
    for (const c of candidates) {
      icons.push(await this.probe(c));
    }

    const hasPwaSizes = manifestIcons.some((ic) =>
      String(ic.sizes ?? '')
        .split(/\s+/)
        .some((s) => parseInt(s, 10) >= 192),
    );
    const coverage = this.computeCoverage(icons, manifestParsed, hasPwaSizes);

    return {
      data: { icons, coverage },
      warnings: this.computeWarnings(icons, coverage),
      cached: !!page.cached,
    };
  }

  private async probe(c: Candidate): Promise<FaviconIcon> {
    const icon: FaviconIcon = {
      source: c.source,
      rel: c.rel,
      href: c.href,
      exists: false,
      status: 0,
    };
    try {
      const head = await this.fetcher.head(c.href);
      icon.status = head.status;
      icon.exists = head.status >= 200 && head.status < 400;
      icon.format = this.detectFormat(c.href, head.contentType);
      if (icon.exists && (head.contentLength === undefined || head.contentLength < ICON_DIM_MAX_BYTES)) {
        try {
          const img = await this.fetcher.get(c.href, { maxBytes: ICON_DIM_MAX_BYTES });
          icon.fileSizeBytes = img.bodyBuffer.length;
          const dims = imageSize(img.bodyBuffer);
          if (dims.width && dims.height) icon.size = { width: dims.width, height: dims.height };
        } catch {
          /* dimensions are best-effort */
        }
      }
    } catch {
      icon.exists = false;
      icon.status = 0;
    }
    return icon;
  }

  private detectFormat(href: string, contentType: string): FaviconIcon['format'] | undefined {
    const ct = (contentType || '').toLowerCase();
    if (ct.includes('png')) return 'png';
    if (ct.includes('svg')) return 'svg';
    if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
    if (ct.includes('icon') || ct.includes('ico')) return 'ico';
    const ext = (href.split('?')[0] ?? href).split('.').pop()?.toLowerCase();
    if (ext === 'png') return 'png';
    if (ext === 'svg') return 'svg';
    if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
    if (ext === 'ico') return 'ico';
    return undefined;
  }

  private computeCoverage(
    icons: FaviconIcon[],
    hasManifest: boolean,
    hasPwaSizes: boolean,
  ): FaviconCoverage {
    const existing = icons.filter((i) => i.exists);
    return {
      hasBasic: existing.some(
        (i) => i.source === 'fallback' || i.rel === 'icon' || i.rel === 'shortcut icon',
      ),
      hasAppleTouch: existing.some(
        (i) => i.rel === 'apple-touch-icon' || i.rel === 'apple-touch-icon-precomposed',
      ),
      hasManifest,
      hasPwaSizes,
      hasMaskIcon: existing.some((i) => i.rel === 'mask-icon'),
    };
  }

  private computeWarnings(icons: FaviconIcon[], coverage: FaviconCoverage): FaviconWarning[] {
    const w: FaviconWarning[] = [];
    if (!coverage.hasBasic) {
      w.push({ field: 'icon', severity: 'warn', message: 'No basic favicon found.' });
    }
    if (!coverage.hasAppleTouch) {
      w.push({
        field: 'apple-touch-icon',
        severity: 'info',
        message: 'No apple-touch-icon for the iOS home screen.',
      });
    }
    if (!coverage.hasManifest) {
      w.push({ field: 'manifest', severity: 'info', message: 'No web app manifest.' });
    } else if (!coverage.hasPwaSizes) {
      w.push({
        field: 'manifest',
        severity: 'info',
        message: 'Manifest is missing 192px+ PWA icons.',
      });
    }
    for (const i of icons) {
      if (!i.exists) {
        w.push({
          field: 'icon',
          severity: 'warn',
          message: `Icon not reachable: ${i.href} (status ${i.status}).`,
        });
      }
    }
    return w;
  }
}
