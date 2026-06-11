import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createDbClient, type Database, type DbClient } from '@vela/db';
import { env } from '../../../config/env';

/**
 * Owns the database connections. `app` is the request-path connection: a NON-superuser,
 * NON-BYPASSRLS role — every query needs an active tenant context or returns zero rows (doc 05 §2).
 * `admin` is for global, non-tenant tables only (users/sessions during auth resolution) and is
 * never used to read tenant tables from the request path.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly appClient: DbClient;
  private readonly adminClient: DbClient;

  constructor() {
    const e = env();
    this.appClient = createDbClient(e.DATABASE_URL);
    this.adminClient = createDbClient(e.DATABASE_ADMIN_URL ?? e.DATABASE_URL);
  }

  get app(): Database {
    return this.appClient.db;
  }

  get admin(): Database {
    return this.adminClient.db;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.appClient.close(), this.adminClient.close()]);
  }
}
