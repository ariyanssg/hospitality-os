/**
 * Typed domain errors (doc 14 §2) mapped centrally to RFC 9457 problem+json (doc 08 §2).
 * Never throw strings; never catch-and-swallow.
 */
export type ProblemFieldError = { field?: string; code: string; stayDate?: string };

export class DomainError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: string,
    readonly title: string,
    readonly detail?: string,
    readonly fieldErrors?: ProblemFieldError[],
  ) {
    super(title);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(detail: string, fieldErrors: ProblemFieldError[]) {
    super(422, 'VALIDATION_FAILED', 'Validation failed', detail, fieldErrors);
  }
}

export class PermissionDeniedError extends DomainError {
  constructor(missingPermission: string) {
    super(
      403,
      'PERMISSION_DENIED',
      'You do not have permission to perform this action',
      `Missing permission: ${missingPermission}`,
      [{ code: 'MISSING_PERMISSION', field: missingPermission }],
    );
  }
}

export class UnauthenticatedError extends DomainError {
  constructor() {
    super(401, 'UNAUTHENTICATED', 'Authentication required');
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super(404, 'NOT_FOUND', `${entity} not found`);
  }
}

export class AvailabilityConflictError extends DomainError {
  constructor(detail: string, fieldErrors?: ProblemFieldError[]) {
    super(409, 'AVAILABILITY_CONFLICT', 'No availability for requested room type', detail, fieldErrors);
  }
}

export class StateConflictError extends DomainError {
  constructor(detail: string) {
    super(409, 'STATE_CONFLICT', 'The resource is not in a valid state for this action', detail);
  }
}

export class BusinessDateClosedError extends DomainError {
  constructor(detail: string) {
    super(409, 'BUSINESS_DATE_CLOSED', 'The business date is closed for posting', detail);
  }
}

export class IdempotencyConflictError extends DomainError {
  constructor() {
    super(422, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key reused with a different request body');
  }
}
