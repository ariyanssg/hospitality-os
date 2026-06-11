import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { maybeRequestContext } from '../context/request-context';
import { PermissionDeniedError, UnauthenticatedError } from '../errors/domain-errors';
import { AUTHENTICATED_ONLY_KEY, PERMISSION_KEY, PUBLIC_KEY } from './decorators';

/**
 * Global guard (doc 04 §6 step 4). Resolution order:
 *  - @Public            → allow (no auth, no tenancy)
 *  - otherwise          → a request context (valid session) is required
 *  - @RequirePermission → every listed permission must be in the decision set
 *  - @AuthenticatedOnly → valid session is sufficient
 *  - none of the above  → fail closed (and the route is flagged by the coverage CI check)
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) {
      return true;
    }

    const ctx = maybeRequestContext();
    if (!ctx) {
      throw new UnauthenticatedError();
    }

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, targets);
    if (required && required.length > 0) {
      const missing = required.find((p) => !ctx.permissions.has(p));
      if (missing) {
        throw new PermissionDeniedError(missing);
      }
      return true;
    }

    if (this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_ONLY_KEY, targets)) {
      return true;
    }

    // No authorization declared on a protected route — fail closed.
    throw new PermissionDeniedError('route.undeclared');
  }
}
