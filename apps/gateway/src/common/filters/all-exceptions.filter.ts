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
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let errors: Array<{ field: string; message: string }> | undefined;

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
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      this.logger.error(exception.stack);
    }

    const problem: ProblemDetails = {
      type: `https://httpstatuses.com/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      requestId: request.requestId ?? 'unknown',
      ...(errors ? { errors } : {}),
    };

    response
      .status(status)
      .setHeader('Content-Type', 'application/problem+json')
      .json(problem);
  }
}
