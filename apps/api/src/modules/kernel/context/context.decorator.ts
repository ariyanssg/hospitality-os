import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import {
  getAnyRequestContext,
  getRequestContext,
  type AnyRequestContext,
  type RequestContext,
} from './request-context';

/** Injects the immutable RequestContext into a handler parameter. Throws without an active tenant. */
export const Ctx = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): RequestContext => getRequestContext(),
);

/**
 * Injects the context whether or not a tenant is active — for /me and platform (superadmin) routes,
 * which must serve sessions that have no active hotel.
 */
export const AnyCtx = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): AnyRequestContext => getAnyRequestContext(),
);
