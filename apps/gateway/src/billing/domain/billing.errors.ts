import { HttpException, HttpStatus } from '@nestjs/common';

export class FeatureNotAvailableError extends HttpException {
  constructor(featureFlag: string, currentPlan: string) {
    super(
      {
        code: 'FEATURE_NOT_AVAILABLE',
        message: `Tính năng "${featureFlag}" không có trong gói "${currentPlan}". Nâng cấp để sử dụng.`,
        featureFlag,
        currentPlan,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class QuotaExceededError extends HttpException {
  constructor(dimension: string, limit: number, resetAt: Date) {
    super(
      {
        code: 'QUOTA_EXCEEDED',
        message: `Đã đạt giới hạn ${limit} cho "${dimension}". Reset vào ${resetAt.toISOString()}.`,
        dimension,
        limit,
        resetAt: resetAt.toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class IntentAlreadyExistsError extends HttpException {
  constructor(existingIntentId: string) {
    super(
      {
        code: 'INTENT_ALREADY_EXISTS',
        message: 'Bạn đã có một mã thanh toán đang chờ. Vui lòng hoàn tất hoặc đợi hết hạn.',
        existingIntentId,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidWebhookSignatureError extends HttpException {
  constructor() {
    super(
      { code: 'WEBHOOK_INVALID_SIGNATURE', message: 'Invalid webhook token' },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
