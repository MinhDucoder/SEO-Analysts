import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { imageSize } from 'image-size';
import { LiteFetcherService } from './lite-fetcher.service';
import {
  SocialPreviewRequestDto,
  SocialPreviewResponse,
  SocialPreviewWarning,
  SocialPreviewData,
} from '../dto/social-preview.dto';

const OG_ASPECT = 1.91; // recommended og:image aspect ratio (1.91:1)
const ASPECT_TOLERANCE = 0.05; // ±5%
const IMAGE_MAX_BYTES = 1024 * 1024; // 1 MB cap for og:image probe

@Injectable()
export class SocialPreviewService {
  constructor(private readonly fetcher: LiteFetcherService) {}

  executeManual(dto: SocialPreviewRequestDto): Omit<SocialPreviewResponse, 'meta'> {
    const data: SocialPreviewData = {
      url: dto.url,
      ogTitle: dto.ogTitle,
      ogDescription: dto.ogDescription,
      ogImage: dto.ogImage,
      ogSiteName: dto.ogSiteName,
      ogType: dto.ogType,
      twitterCard: dto.twitterCard,
      twitterTitle: dto.twitterTitle,
      twitterDescription: dto.twitterDescription,
      twitterImage: dto.twitterImage,
    };
    return { data, warnings: this.computeWarnings(data) };
  }

  async executeFromUrl(
    dto: SocialPreviewRequestDto,
  ): Promise<{ data: SocialPreviewData; warnings: SocialPreviewWarning[]; cached: boolean }> {
    const res = await this.fetcher.get(dto.fetchUrl!);
    const $ = cheerio.load(res.body);
    const og = (p: string) => $(`meta[property="og:${p}"]`).attr('content')?.trim() || undefined;
    const tw = (n: string) => $(`meta[name="twitter:${n}"]`).attr('content')?.trim() || undefined;

    const resolve = (href?: string) => {
      if (!href) return undefined;
      try {
        return new URL(href, res.url).toString();
      } catch {
        return href;
      }
    };

    const data: SocialPreviewData = {
      url: res.url,
      ogTitle: og('title'),
      ogDescription: og('description'),
      ogImage: resolve(og('image')),
      ogSiteName: og('site_name'),
      ogType: og('type'),
      twitterCard: tw('card'),
      twitterTitle: tw('title'),
      twitterDescription: tw('description'),
      twitterImage: resolve(tw('image')),
    };

    if (data.ogImage) {
      data.ogImageMeta = await this.probeImage(data.ogImage);
    }

    return { data, warnings: this.computeWarnings(data), cached: !!res.cached };
  }

  private async probeImage(
    url: string,
  ): Promise<{ width: number; height: number; bytes: number } | undefined> {
    try {
      const img = await this.fetcher.get(url, { maxBytes: IMAGE_MAX_BYTES });
      const dims = imageSize(img.bodyBuffer);
      if (!dims.width || !dims.height) return undefined;
      return { width: dims.width, height: dims.height, bytes: img.bodyBuffer.length };
    } catch {
      return undefined;
    }
  }

  private computeWarnings(data: SocialPreviewData): SocialPreviewWarning[] {
    const w: SocialPreviewWarning[] = [];

    if (!data.ogImage) {
      w.push({ field: 'og:image', severity: 'error', message: 'Missing og:image.' });
    }

    if (data.ogTitle && data.ogTitle.length > 60) {
      w.push({
        field: 'og:title',
        severity: 'warn',
        message: `og:title is ${data.ogTitle.length} chars; recommended ≤ 60.`,
      });
    }

    if (data.ogImageMeta) {
      const aspect = data.ogImageMeta.width / data.ogImageMeta.height;
      if (Math.abs(aspect - OG_ASPECT) / OG_ASPECT > ASPECT_TOLERANCE) {
        w.push({
          field: 'og:image',
          severity: 'warn',
          message: `og:image aspect ${aspect.toFixed(2)}:1; recommended 1.91:1.`,
        });
      }
    }

    if (!data.twitterCard) {
      w.push({
        field: 'twitter:card',
        severity: 'info',
        message: 'No twitter:card; X falls back to OG tags.',
      });
    }

    if (!data.twitterImage && data.ogImage) {
      w.push({
        field: 'twitter:image',
        severity: 'info',
        message: 'No twitter:image; the OG image is used on X.',
      });
    }

    return w;
  }
}
