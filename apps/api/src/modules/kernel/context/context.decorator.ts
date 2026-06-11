import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { getRequestContext, type RequestContext } from './request-context';

/** Injects the immutable RequestContext into a handler parameter. */
export const Ctx = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): RequestContext => getRequestContext(),
);
