import { describe, expect, it } from 'vitest';
import { PermissionSet } from '@vela/permissions';
import {
  getAnyRequestContext,
  getRequestContext,
  runWithContext,
  type AnyRequestContext,
} from '../src/modules/kernel/context/request-context';
import { PlatformUnitOfWork } from '../src/modules/kernel/db/platform-unit-of-work';
import { PermissionDeniedError } from '../src/modules/kernel/errors/domain-errors';
import type { DbService } from '../src/modules/kernel/db/db.service';

function ctx(overrides: Partial<AnyRequestContext>): AnyRequestContext {
  return {
    tenantId: 'a3a04e3f-4d9f-7c80-b3c5-000000000001',
    propertyIds: [],
    userId: 'user-1',
    roleIds: [],
    permissions: new PermissionSet([]),
    correlationId: 'corr-1',
    isPlatformAdmin: false,
    platformPermissions: [],
    ...overrides,
  };
}

describe('request context fail-closed semantics', () => {
  it('getRequestContext throws with no context bound', () => {
    expect(() => getRequestContext()).toThrow(/fail closed/);
  });

  it('getRequestContext throws for a platform-only session (null tenant)', () => {
    runWithContext(ctx({ tenantId: null, isPlatformAdmin: true }), () => {
      expect(() => getRequestContext()).toThrow(/No active tenant/);
      // The tenant-less context is still reachable for platform routes and /me.
      expect(getAnyRequestContext().isPlatformAdmin).toBe(true);
    });
  });

  it('getRequestContext returns the context when a tenant is active', () => {
    runWithContext(ctx({}), () => {
      expect(getRequestContext().tenantId).toBe('a3a04e3f-4d9f-7c80-b3c5-000000000001');
    });
  });
});

describe('PlatformUnitOfWork', () => {
  const fakeDb = {
    admin: {
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    },
  } as unknown as DbService;

  it('rejects a tenant user (not a platform admin) even before any query runs', async () => {
    const puow = new PlatformUnitOfWork(fakeDb);
    await expect(
      runWithContext(ctx({ isPlatformAdmin: false }), () => puow.read(async () => 'nope')),
    ).rejects.toThrow(PermissionDeniedError);
    await expect(
      runWithContext(ctx({ isPlatformAdmin: false }), () => puow.run(async () => 'nope')),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it('runs reads for a platform admin (with or without an active tenant)', async () => {
    const puow = new PlatformUnitOfWork(fakeDb);
    const result = await runWithContext(
      ctx({ tenantId: null, isPlatformAdmin: true, platformPermissions: ['platform.hotel.view'] }),
      () => puow.read(async () => 42),
    );
    expect(result).toBe(42);
  });
});
