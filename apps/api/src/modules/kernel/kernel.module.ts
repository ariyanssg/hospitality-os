import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PasswordAuthService } from './auth/password-auth.service';
import { BusinessDateService } from './business-date/business-date.service';
import { ContextService } from './context/context.service';
import { HealthController } from './controllers/health.controller';
import { MeController } from './controllers/me.controller';
import { DbService } from './db/db.service';
import { UnitOfWork } from './db/unit-of-work';
import { ProblemFilter } from './errors/problem.filter';
import { PermissionGuard } from './permissions/permission.guard';
import { PermissionService } from './permissions/permission.service';

/**
 * The platform kernel: auth, tenancy, permissions, events/outbox, audit, business dates.
 * Global so every module can inject these without re-importing. The PermissionGuard and ProblemFilter
 * are registered app-wide here.
 */
@Global()
@Module({
  controllers: [HealthController, MeController, AuthController],
  providers: [
    DbService,
    UnitOfWork,
    AuthService,
    PasswordAuthService,
    PermissionService,
    ContextService,
    BusinessDateService,
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
  ],
})
export class KernelModule {}
