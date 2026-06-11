import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { maybeRequestContext } from '../context/request-context';
import { DomainError } from './domain-errors';

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: unknown[];
  correlationId: string;
}

/**
 * Maps every thrown error to RFC 9457 problem+json with a stable `code` and `correlationId`
 * (doc 08 §2). The correlationId ties the response to logs and audit rows (doc 14 §5).
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger('Problem');

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const correlationId = maybeRequestContext()?.correlationId ?? 'unknown';

    let body: ProblemBody;

    if (exception instanceof DomainError) {
      body = {
        type: `https://docs.vela.dev/errors/${exception.code.toLowerCase().replace(/_/g, '-')}`,
        title: exception.title,
        status: exception.httpStatus,
        code: exception.code,
        detail: exception.detail,
        errors: exception.fieldErrors,
        correlationId,
      };
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const detail = typeof res === 'string' ? res : ((res as { message?: string }).message ?? exception.message);
      body = {
        type: 'about:blank',
        title: exception.message,
        status,
        code: mapHttpCode(status),
        detail,
        correlationId,
      };
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      body = {
        type: 'about:blank',
        title: 'Internal server error',
        status: 500,
        code: 'INTERNAL_ERROR',
        correlationId,
      };
    }

    void reply
      .status(body.status)
      .header('content-type', 'application/problem+json')
      .send(body);
  }
}

function mapHttpCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'PERMISSION_DENIED';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'STATE_CONFLICT';
    case 422:
      return 'VALIDATION_FAILED';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'ERROR';
  }
}
