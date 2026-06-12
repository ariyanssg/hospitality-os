/**
 * The PUBLIC API of the kernel module. Other modules import ONLY from here (enforced by the
 * boundaries lint rule); reaching into kernel internals is a CI failure.
 */
export { KernelModule } from './kernel.module';

export { DbService } from './db/db.service';
export { UnitOfWork } from './db/unit-of-work';
export type { UowHelpers, AuditEntry } from './db/unit-of-work';
export { BusinessDateService } from './business-date/business-date.service';
export { ContextService } from './context/context.service';
export { AuthService } from './auth/auth.service';
export { PasswordAuthService } from './auth/password-auth.service';

export {
  getRequestContext,
  maybeRequestContext,
  runWithContext,
  enterContext,
  beginContextScope,
  setRequestContext,
} from './context/request-context';
export type { RequestContext } from './context/request-context';
export { Ctx } from './context/context.decorator';

export {
  RequirePermission,
  Public,
  AuthenticatedOnly,
  PERMISSION_KEY,
  PUBLIC_KEY,
  AUTHENTICATED_ONLY_KEY,
} from './permissions/decorators';
export { ZodValidationPipe } from './http/zod-validation.pipe';

export { Money } from './money/money';
export type { MoneyJSON } from './money/money';

export * from './errors/domain-errors';

export { runOutboxRelay } from './outbox/outbox-relay';
export { IdempotentConsumer } from './outbox/idempotent-consumer';
export { runWebhookDispatcher } from './webhooks/webhook-dispatcher';
