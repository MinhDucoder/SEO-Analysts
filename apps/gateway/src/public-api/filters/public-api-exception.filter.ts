/**
 * @file Translates raw exceptions thrown anywhere downstream of a
 * /public/* controller into the documented JSON contract:
 *   { statusCode, error, code, message, requestId, details? }
 *
 * The `code` field is what `docs/public-api/error-codes.md` promises is
 * stable across versions. NestJS built-in exceptions (PayloadTooLarge,
 * BadRequest from class-validator, etc.) don't carry a `code`, so this
 * filter infers one from the status + message. Exceptions that already
 * carry a `code` (e.g. ApiKeyGuard's INVALID_API_KEY) are preserved.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface PublicApiErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: unknown;
}

const STATUS_TO_CODE: Record<number, string> = {
  400: 'INVALID_JSON',
  401: 'INVALID_API_KEY',
  403: 'KEY_DISABLED',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'INPUT_TYPE_MISMATCH',
  424: 'URL_FETCH_FAILED',
  429: 'RATE_LIMIT_EXCEEDED',
  502: 'ANALYZER_UNAVAILABLE',
  503: 'SERVICE_UNAVAILABLE',
};

function inferValidationCode(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('targetkeyword')) return 'MISSING_TARGET_KEYWORD';
  if (m.includes('input.type') || m.includes('oneoftypematching')) {
    return 'INPUT_TYPE_MISMATCH';
  }
  if (m.includes('url')) return 'INVALID_URL';
  if (m.includes('markdown')) return 'INVALID_MARKDOWN';
  return 'INPUT_TYPE_MISMATCH';
}

export function mapExceptionToPublicApiError(exception: unknown): PublicApiErrorBody {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const body =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>)
        : { message: String(raw) };

    // Preserve already-tagged errors (ApiKeyGuard, controller-thrown, etc.)
    if (typeof body.code === 'string') {
      return {
        statusCode: status,
        error: typeof body.error === 'string' ? body.error : exception.name,
        code: body.code,
        message:
          typeof body.message === 'string' ? body.message : exception.message,
        details: body.details,
      };
    }

    // class-validator BadRequest comes back as { message: string[] }.
    if (status === 400 || status === 422) {
      const msgs = Array.isArray(body.message)
        ? (body.message as unknown[]).map(String)
        : [String(body.message ?? exception.message)];
      return {
        statusCode: status,
        error: 'ValidationError',
        code: inferValidationCode(msgs.join(' ')),
        message: msgs.join('; ') || 'Validation failed',
        details: msgs.length > 1 ? msgs : undefined,
      };
    }

    return {
      statusCode: status,
      error: typeof body.error === 'string' ? body.error : exception.name,
      code: STATUS_TO_CODE[status] ?? 'INTERNAL',
      message:
        typeof body.message === 'string' ? body.message : exception.message,
    };
  }

  // Non-HTTP errors → 500 INTERNAL
  return {
    statusCode: 500,
    error: 'InternalServerError',
    code: 'INTERNAL',
    message: exception instanceof Error ? exception.message : 'Internal server error',
  };
}

@Catch()
export class PublicApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const mapped = mapExceptionToPublicApiError(exception);
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? undefined;

    response.status(mapped.statusCode).json({
      ...mapped,
      ...(requestId ? { requestId } : {}),
    });
  }
}
