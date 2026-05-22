import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  errors?: Array<{ field: string; message: string }>;
  /**
   * Machine-readable error identity (RFC 7807 extension member). Preserved
   * from the thrown exception body so clients can branch on it (e.g. show the
   * upgrade modal on `QUOTA_EXCEEDED` / `FEATURE_NOT_AVAILABLE`).
   */
  code?: string;
  // Extension members copied verbatim from coded exceptions (best-effort):
  resetAt?: string;
  featureFlag?: string;
  currentPlan?: string;
  dimension?: string;
  limit?: number;
}

/**
 * Extension members we forward from a coded `HttpException` body onto the
 * problem-details payload. `code` is the contract the web client keys off;
 * the rest are useful context for the matching dialogs (quota reset time,
 * which feature/plan tripped the gate).
 */
const FORWARDED_KEYS = [
  'code',
  'resetAt',
  'featureFlag',
  'currentPlan',
  'dimension',
  'limit',
] as const;

/**
 * Pure mapper: turn any thrown value into an RFC 7807 problem-details object.
 * Extracted so it can be unit-tested without a full `ArgumentsHost`.
 */
export function mapExceptionToProblemDetails(
  exception: unknown,
  instance: string,
  requestId: string,
): ProblemDetails {
  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let title = 'Internal Server Error';
  let detail = 'An unexpected error occurred';
  let errors: Array<{ field: string; message: string }> | undefined;
  let bag: Record<string, unknown> | undefined;

  if (exception instanceof HttpException) {
    status = exception.getStatus();
    const res = exception.getResponse();
    if (typeof res === 'string') {
      detail = res;
      title = exception.message;
    } else if (typeof res === 'object' && res !== null) {
      const r = res as { message?: string | string[]; error?: string };
      title = r.error ?? exception.message;
      if (Array.isArray(r.message)) {
        detail = 'Validation failed';
        errors = r.message.map((m) => ({ field: 'body', message: m }));
      } else {
        detail = r.message ?? exception.message;
      }
      bag = res as Record<string, unknown>;
    }
  } else if (exception instanceof Error) {
    detail = exception.message;
  }

  const problem: ProblemDetails = {
    type: `https://httpstatuses.com/${status}`,
    title,
    status,
    detail,
    instance,
    requestId,
    ...(errors ? { errors } : {}),
  };

  // Forward machine-readable extension members from coded exceptions so the
  // web client can branch on `code` (RFC 7807 allows extension members).
  if (bag) {
    const out = problem as unknown as Record<string, unknown>;
    for (const key of FORWARDED_KEYS) {
      if (bag[key] !== undefined) out[key] = bag[key];
    }
  }

  return problem;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    if (
      !(exception instanceof HttpException) &&
      exception instanceof Error
    ) {
      this.logger.error(exception.stack);
    }

    const problem = mapExceptionToProblemDetails(
      exception,
      request.url,
      request.requestId ?? 'unknown',
    );

    response
      .status(problem.status)
      .setHeader('Content-Type', 'application/problem+json')
      .json(problem);
  }
}
