import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { mapExceptionToProblemDetails } from '../../src/common/filters/all-exceptions.filter';
import {
  FeatureNotAvailableError,
  QuotaExceededError,
} from '../../src/billing/domain/billing.errors';

describe('mapExceptionToProblemDetails', () => {
  it('preserves code + extension members from a coded 403 (FEATURE_NOT_AVAILABLE)', () => {
    const ex = new FeatureNotAvailableError('pdf_export', 'free');
    const p = mapExceptionToProblemDetails(ex, '/api/v1/audits/x/export', 'req-1');
    expect(p.status).toBe(403);
    expect(p.code).toBe('FEATURE_NOT_AVAILABLE');
    expect(p.featureFlag).toBe('pdf_export');
    expect(p.currentPlan).toBe('free');
    expect(p.detail).toContain('không có trong gói');
  });

  it('preserves QUOTA_EXCEEDED code + resetAt/dimension/limit for 429', () => {
    const resetAt = new Date('2026-06-01T00:00:00.000Z');
    const ex = new QuotaExceededError('audits_monthly', 10, resetAt);
    const p = mapExceptionToProblemDetails(ex, '/api/v1/audits', 'req-2');
    expect(p.status).toBe(429);
    expect(p.code).toBe('QUOTA_EXCEEDED');
    expect(p.resetAt).toBe(resetAt.toISOString());
    expect(p.dimension).toBe('audits_monthly');
    expect(p.limit).toBe(10);
  });

  it('keeps RFC 7807 shape unchanged (no code) for a plain HttpException', () => {
    const ex = new BadRequestException('bad input');
    const p = mapExceptionToProblemDetails(ex, '/x', 'req-3');
    expect(p.status).toBe(400);
    expect(p.detail).toBe('bad input');
    expect(p.code).toBeUndefined();
    expect(p.type).toBe('https://httpstatuses.com/400');
  });

  it('maps validation array message to errors[] without leaking code', () => {
    const ex = new BadRequestException({
      message: ['email must be set'],
      error: 'Bad Request',
    });
    const p = mapExceptionToProblemDetails(ex, '/x', 'req-4');
    expect(p.detail).toBe('Validation failed');
    expect(p.errors).toEqual([{ field: 'body', message: 'email must be set' }]);
    expect(p.code).toBeUndefined();
  });

  it('falls back to 500 for a non-HTTP Error', () => {
    const p = mapExceptionToProblemDetails(new Error('boom'), '/x', 'req-5');
    expect(p.status).toBe(500);
    expect(p.detail).toBe('boom');
    expect(p.code).toBeUndefined();
  });
});
