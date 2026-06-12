import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PasswordAuthService } from './auth/password-auth.service';
import { BusinessDateService } from './business-date/business-date.service';
import { ContextService } from './context/context.service';
import { HealthController } from './controllers/health.controller';
import { MeController } from './controllers/me.controller';
import { RealtimeController } from './controllers/realtime.controller';
import { DbService } from './db/db.service';
import { UnitOfWork } from './db/unit-of-work';
import { ProblemFilter } from './errors/problem.filter';
import { PermissionGuard } from './permissions/permission.guard';
import { PermissionService } from './permissions/permission.service';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';

/**
 * The platform kernel: auth, tenancy, permissions, events/outbox, audit, business dates.
 * Global so every module can inject these without re-importing. The PermissionGuard and ProblemFilter
 * are registered app-wide here.
 */
@Global()
@Module({
  controllers: [
    HealthController,
    MeController,
    AuthController,
    RealtimeController,
    WebhooksController,
  ],
  providers: [
    DbService,
    UnitOfWork,
    AuthService,
    PasswordAuthService,
    PermissionService,
    ContextService,
    BusinessDateService,
    RealtimeGateway,
    WebhooksService,
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: ProblemFilter },
  ],
  exports: [
    DbService,
    UnitOfWork,
    AuthService,
    PasswordAuthService,
    PermissionService,
    ContextService,
    BusinessDateService,
    WebhooksService,
  ],
})
export class KernelModule {}
