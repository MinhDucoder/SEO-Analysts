import { describe, it, expect } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  PayloadTooLargeException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { mapExceptionToPublicApiError } from '../../src/public-api/filters/public-api-exception.filter';

describe('mapExceptionToPublicApiError', () => {
  it('preserves an already-tagged code from the exception body (e.g. ApiKeyGuard)', () => {
    const ex = new UnauthorizedException({
      code: 'INVALID_API_KEY',
      message: 'Invalid or revoked API key',
    });
    const r = mapExceptionToPublicApiError(ex);
    expect(r.statusCode).toBe(401);
    expect(r.code).toBe('INVALID_API_KEY');
    expect(r.message).toBe('Invalid or revoked API key');
  });

  it('preserves KEY_DISABLED from ForbiddenException body', () => {
    const ex = new ForbiddenException({
      code: 'KEY_DISABLED',
      message: 'Associated user is disabled',
    });
    const r = mapExceptionToPublicApiError(ex);
    expect(r.statusCode).toBe(403);
    expect(r.code).toBe('KEY_DISABLED');
  });

  it('maps PayloadTooLargeException to PAYLOAD_TOO_LARGE', () => {
    const ex = new PayloadTooLargeException('Body too large');
    const r = mapExceptionToPublicApiError(ex);
    expect(r.statusCode).toBe(413);
    expect(r.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('maps ServiceUnavailableException to SERVICE_UNAVAILABLE', () => {
    const ex = new ServiceUnavailableException('Maintenance');
    const r = mapExceptionToPublicApiError(ex);
    expect(r.statusCode).toBe(503);
    expect(r.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('maps validation BadRequest with array message to MISSING_TARGET_KEYWORD when msg matches', () => {
    const ex = new BadRequestException({
      message: ['targetKeyword must not be empty'],
      error: 'Bad Request',
    });
    const r = mapExceptionToPublicApiError(ex);
    expect(r.statusCode).toBe(400);
    expect(r.code).toBe('MISSING_TARGET_KEYWORD');
    expect(r.error).toBe('ValidationError');
  });

  it('maps validation BadRequest mentioning input.type to INPUT_TYPE_MISMATCH', () => {
    const ex = new BadRequestException({
      message: ['input.type must match exactly one of input.url / input.markdown / input.html'],
    });
    const r = mapExceptionToPublicApiError(ex);
    expect(r.code).toBe('INPUT_TYPE_MISMATCH');
  });

  it('maps validation 422 mentioning markdown to INVALID_MARKDOWN', () => {
    const ex = new HttpException({ message: ['markdown is too long'] }, 422);
    const r = mapExceptionToPublicApiError(ex);
    expect(r.statusCode).toBe(422);
    expect(r.code).toBe('INVALID_MARKDOWN');
  });

  it('maps unknown 502 to ANALYZER_UNAVAILABLE', () => {
    const ex = new HttpException('analyzer down', 502);
    const r = mapExceptionToPublicApiError(ex);
    expect(r.statusCode).toBe(502);
    expect(r.code).toBe('ANALYZER_UNAVAILABLE');
  });

  it('falls back to INTERNAL for plain Error (non-HTTP)', () => {
    const r = mapExceptionToPublicApiError(new Error('boom'));
    expect(r.statusCode).toBe(500);
    expect(r.code).toBe('INTERNAL');
    expect(r.message).toBe('boom');
  });

  it('falls back to INTERNAL for thrown non-Error values', () => {
    const r = mapExceptionToPublicApiError('string thrown');
    expect(r.statusCode).toBe(500);
    expect(r.code).toBe('INTERNAL');
  });

  it('joins array validation messages with "; " for the message field', () => {
    const ex = new BadRequestException({
      message: ['targetKeyword must not be empty', 'input.type is required'],
    });
    const r = mapExceptionToPublicApiError(ex);
    expect(r.message).toContain('targetKeyword');
    expect(r.message).toContain('input.type');
    expect(r.details).toEqual([
      'targetKeyword must not be empty',
      'input.type is required',
    ]);
  });
});
