import { Controller, Get } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { properties, tenants, users } from '@vela/db';
import type { Me } from '@vela/contracts';
import { AnyCtx } from '../context/context.decorator';
import type { AnyRequestContext } from '../context/request-context';
import { AuthenticatedOnly } from '../permissions/decorators';
import { DbService } from '../db/db.service';
import { NotFoundError } from '../errors/domain-errors';

/** Session bootstrap (doc 06 §6): identity, tenancy, the flattened permission decision set. */
@Controller('me')
export class MeController {
  constructor(private readonly db: DbService) {}

  @Get()
  @AuthenticatedOnly()
  async me(@AnyCtx() ctx: AnyRequestContext): Promise<Me> {
    const [user] = await this.db.admin
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);
    if (!user) throw new NotFoundError('User');

    // Platform admins can be signed in with no active hotel — tenant fields are null then.
    if (ctx.tenantId === null) {
      return {
        userId: ctx.userId,
        name: user.name,
        email: user.email,
        tenantId: null,
        tenantName: null,
        properties: [],
        permissions: ctx.permissions.toArray(),
        isPlatformAdmin: ctx.isPlatformAdmin,
        platformPermissions: [...ctx.platformPermissions],
      };
    }

    const [tenant] = await this.db.admin
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    const props = await this.db.admin
      .select({
        id: properties.id,
        name: properties.name,
        code: properties.code,
        currency: properties.currency,
        timezone: properties.timezone,
      })
      .from(properties)
      .where(eq(properties.tenantId, ctx.tenantId));

    return {
      userId: ctx.userId,
      name: user.name,
      email: user.email,
      tenantId: ctx.tenantId,
      tenantName: tenant?.name ?? '',
      properties: props,
      permissions: ctx.permissions.toArray(),
      isPlatformAdmin: ctx.isPlatformAdmin,
      platformPermissions: [...ctx.platformPermissions],
    };
  }
}
