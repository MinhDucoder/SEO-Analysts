import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '@repo/shared';

export const REQUIRE_FEATURE_KEY = 'require_feature';
export const RequireFeature = (flag: FeatureFlag) => SetMetadata(REQUIRE_FEATURE_KEY, flag);
