import { IsUrl } from 'class-validator';

export class FaviconCheckerRequestDto {
  @IsUrl({ require_protocol: true })
  url!: string;
}

export interface FaviconIcon {
  source: 'link' | 'manifest' | 'fallback';
  rel?: string;
  href: string;
  exists: boolean;
  status: number;
  format?: 'ico' | 'png' | 'svg' | 'jpg';
  size?: { width: number; height: number };
  fileSizeBytes?: number;
}

export interface FaviconCoverage {
  hasBasic: boolean;
  hasAppleTouch: boolean;
  hasManifest: boolean;
  hasPwaSizes: boolean;
  hasMaskIcon: boolean;
}

export interface FaviconWarning {
  field: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface FaviconCheckerResponse {
  data: {
    icons: FaviconIcon[];
    coverage: FaviconCoverage;
  };
  warnings: FaviconWarning[];
  meta: { quotaUsed: number; quotaLeft: number; cached: boolean };
}
