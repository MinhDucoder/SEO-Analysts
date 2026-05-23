import { SetMetadata } from '@nestjs/common';
import { QuotaDimension } from '@repo/shared';

export const REQUIRE_QUOTA_KEY = 'require_quota';
export const RequireQuota = (dimension: QuotaDimension, opts: { increment?: number } = {}) =>
  SetMetadata(REQUIRE_QUOTA_KEY, { dimension, increment: opts.increment ?? 1 });
