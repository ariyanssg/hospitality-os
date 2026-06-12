import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  accounts,
  businessDates,
  chargeCodes,
  glAccounts,
  paymentMethods,
  properties,
  roleAssignments,
  rolePermissions,
  roles,
  taxRules,
  tenantMemberships,
  tenants,
  users,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import { SYSTEM_ROLES, expandWildcards, getSystemRole } from '@vela/permissions';
import type { CreateHotelInput, HotelRoleKey } from '@vela/contracts';
import { DomainError, NotFoundError, ValidationError, hashPassword } from '../kernel';

export interface ProvisionedHotel {
  tenantId: string;
  propertyId: string;
  adminUserId?: string;
}

export interface ProvisionedUser {
  userId: string;
  membershipId: string;
  created: boolean;
}

const CHART_OF_ACCOUNTS: Array<[string, string, string, string]> = [
  ['1000', 'Cash & Bank', 'asset', 'debit'],
  ['1100', 'Guest Ledger', 'asset', 'debit'],
  ['1200', 'City Ledger (AR)', 'asset', 'debit'],
  ['2000', 'Advance Deposits', 'liability', 'credit'],
  ['2100', 'Tax Payable', 'liability', 'credit'],
  ['4000', 'Room Revenue', 'revenue', 'credit'],
  ['4100', 'Food & Beverage Revenue', 'revenue', 'credit'],
  ['4200', 'Miscellaneous Revenue', 'revenue', 'credit'],
];

const CHARGE_CODES: Array<[string, string, string, string]> = [
  ['ROOM', 'Room Charge', 'room', '4000'],
  ['PAYMENT', 'Payment', 'payment', '1000'],
  ['MINIBAR', 'Minibar', 'fnb', '4100'],
  ['FNB', 'Food & Beverage', 'fnb', '4100'],
  ['MISC', 'Miscellaneous', 'misc', '4200'],
];

const PAYMENT_METHODS: Array<[string, string, number]> = [
  ['card', 'Card', 10],
  ['cash', 'Cash', 20],
  ['bank_transfer', 'Bank transfer', 30],
  ['ar_transfer', 'AR transfer', 40],
  ['voucher', 'Voucher', 50],
];

/**
 * Provisions hotels (tenant + default property + a working financial/role baseline) and hotel
 * users. Pure tx-level functions — the platform service wraps them in PlatformUnitOfWork.run so
 * audit + outbox commit atomically. Mirrors what tooling/seed does for the demo tenant, minus the
 * demo inventory: rooms/rates are the Hotel Admin's job via /settings.
 */
@Injectable()
export class ProvisioningService {
  async createHotel(tx: DbTransaction, input: CreateHotelInput): Promise<ProvisionedHotel> {
    const [existing] = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, input.slug))
      .limit(1);
    if (existing) {
      throw new DomainError(409, 'SLUG_TAKEN', 'A hotel with that slug already exists');
    }

    const tenantId = uuidv7();
    const propertyId = uuidv7();

    await tx.insert(tenants).values({ id: tenantId, name: input.name, slug: input.slug });
    await tx.insert(properties).values({
      id: propertyId,
      tenantId,
      name: input.property.name,
      code: input.property.code,
      currency: input.property.currency,
      timezone: input.property.timezone,
      businessDayRollover: input.property.businessDayRollover,
    });
    await tx.insert(businessDates).values({
      tenantId,
      propertyId,
      businessDate: new Date().toISOString().slice(0, 10),
      status: 'open',
    });

    // Instantiate every system role template so users can be provisioned with any of them.
    for (const tmpl of SYSTEM_ROLES) {
      const roleId = uuidv7();
      await tx.insert(roles).values({
        id: roleId,
        tenantId,
        key: tmpl.key,
        name: tmpl.name,
        description: tmpl.description,
        isSystem: true,
      });
      const keys = expandWildcards(tmpl.permissions);
      if (keys.length > 0) {
        await tx
          .insert(rolePermissions)
          .values(keys.map((permissionKey) => ({ roleId, permissionKey })));
      }
    }

    // Financial baseline: chart of accounts, charge codes (folio payments need PAYMENT), a default
    // room tax, and the standard payment methods. All editable later via /settings.
    await tx.insert(glAccounts).values(
      CHART_OF_ACCOUNTS.map(([code, name, type, normal]) => ({
        id: uuidv7(),
        tenantId,
        propertyId,
        code,
        name,
        type: type as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
        normalBalance: normal as 'debit' | 'credit',
      })),
    );
    await tx.insert(chargeCodes).values(
      CHARGE_CODES.map(([code, name, category, glAccountCode]) => ({
        id: uuidv7(),
        tenantId,
        propertyId,
        code,
        name,
        category,
        glAccountCode,
      })),
    );
    await tx.insert(taxRules).values({
      id: uuidv7(),
      tenantId,
      propertyId,
      code: 'VAT',
      name: 'Occupancy Tax',
      ratePct: '10.0000',
      inclusive: false,
      appliesToCategory: 'room',
      glAccountCode: '2100',
    });
    await tx.insert(paymentMethods).values(
      PAYMENT_METHODS.map(([code, name, sortOrder]) => ({
        id: uuidv7(),
        tenantId,
        propertyId,
        code,
        name,
        category: 'payment',
        sortOrder,
        isActive: true,
      })),
    );

    let adminUserId: string | undefined;
    if (input.admin) {
      const admin = await this.createHotelUser(tx, {
        tenantId,
        name: input.admin.name,
        email: input.admin.email,
        password: input.admin.password,
        roleKey: 'owner',
        propertyId,
      });
      adminUserId = admin.userId;
    }

    return { tenantId, propertyId, adminUserId };
  }

  /**
   * Creates (or attaches, if the email already exists globally) a user in a hotel with one of the
   * system role templates. Role rows were instantiated per tenant at provisioning.
   */
  async createHotelUser(
    tx: DbTransaction,
    input: {
      tenantId: string;
      name: string;
      email: string;
      password: string;
      roleKey: HotelRoleKey;
      propertyId?: string;
    },
  ): Promise<ProvisionedUser> {
    const tmpl = getSystemRole(input.roleKey);
    if (!tmpl) throw new NotFoundError('Role template');

    const [role] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.tenantId, input.tenantId), eq(roles.key, input.roleKey)))
      .limit(1);
    if (!role) throw new NotFoundError('Role');

    let propertyId = input.propertyId ?? null;
    if (tmpl.defaultScope !== 'tenant' && !propertyId) {
      const [prop] = await tx
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.tenantId, input.tenantId))
        .limit(1);
      if (!prop) {
        throw new ValidationError('A property is required for this role', [
          { field: 'propertyId', code: 'REQUIRED' },
        ]);
      }
      propertyId = prop.id;
    }

    // Users are global — reuse an existing identity for the same email, otherwise create one.
    let created = false;
    let userId: string;
    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existingUser) {
      userId = existingUser.id;
    } else {
      created = true;
      userId = uuidv7();
      await tx.insert(users).values({
        id: userId,
        name: input.name,
        email: input.email,
        emailVerified: true,
      });
      await tx.insert(accounts).values({
        id: uuidv7(),
        userId,
        accountId: userId,
        providerId: 'credential',
        password: await hashPassword(input.password),
      });
    }

    const [existingMembership] = await tx
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .where(
        and(eq(tenantMemberships.tenantId, input.tenantId), eq(tenantMemberships.userId, userId)),
      )
      .limit(1);
    if (existingMembership && !created) {
      throw new DomainError(409, 'ALREADY_MEMBER', 'That user already belongs to this hotel');
    }

    const membershipId = existingMembership?.id ?? uuidv7();
    if (!existingMembership) {
      await tx.insert(tenantMemberships).values({
        id: membershipId,
        tenantId: input.tenantId,
        userId,
        status: 'active',
      });
    }

    await tx.insert(roleAssignments).values({
      id: uuidv7(),
      tenantId: input.tenantId,
      membershipId,
      roleId: role.id,
      scope: tmpl.defaultScope,
      propertyId: tmpl.defaultScope === 'tenant' ? null : propertyId,
      department: null,
    });

    return { userId, membershipId, created };
  }
}
