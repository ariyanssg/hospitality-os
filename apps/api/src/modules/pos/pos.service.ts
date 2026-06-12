import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql, sum } from 'drizzle-orm';
import {
  offlineOps,
  posCheckItems,
  posChecks,
  posOutlets,
  posPayments,
  posShifts,
  posTables,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type {
  AddPosItemInput,
  OfflineOp,
  PosCheck,
  PosOutlet,
  PosShift,
  PosTable,
  QueueOfflineOpInput,
} from '@vela/contracts';
import {
  getRequestContext,
  Money,
  NotFoundError,
  StateConflictError,
  ValidationError,
  type UowHelpers,
} from '../kernel';
import { FolioService } from '../folio';

function checkNumberFrom(id: string): string {
  return `P${id.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

@Injectable()
export class PosService {
  constructor(private readonly folio: FolioService) {}

  async outlets(tx: DbTransaction, propertyId: string): Promise<PosOutlet[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select()
      .from(posOutlets)
      .where(and(eq(posOutlets.tenantId, ctx.tenantId), eq(posOutlets.propertyId, propertyId)))
      .orderBy(asc(posOutlets.name));
    return rows.map((o) => ({ id: o.id, code: o.code, name: o.name, currency: o.currency.trim() }));
  }

  async tables(tx: DbTransaction, outletId: string): Promise<PosTable[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select()
      .from(posTables)
      .where(and(eq(posTables.tenantId, ctx.tenantId), eq(posTables.outletId, outletId)))
      .orderBy(asc(posTables.section), asc(posTables.label));
    return rows.map((t) => ({
      id: t.id,
      outletId: t.outletId,
      label: t.label,
      section: t.section,
      seats: t.seats,
      x: t.x,
      y: t.y,
    }));
  }

  async openCheck(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: { outletId: string; tableId?: string; covers: number },
  ): Promise<string> {
    const ctx = getRequestContext();
    const [outlet] = await tx
      .select({ id: posOutlets.id, currency: posOutlets.currency })
      .from(posOutlets)
      .where(
        and(
          eq(posOutlets.tenantId, ctx.tenantId),
          eq(posOutlets.id, input.outletId),
          eq(posOutlets.propertyId, propertyId),
        ),
      )
      .limit(1);
    if (!outlet) throw new NotFoundError('POS outlet');

    const id = uuidv7();
    await tx.insert(posChecks).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      outletId: input.outletId,
      tableId: input.tableId ?? null,
      checkNumber: checkNumberFrom(id),
      covers: input.covers,
      currency: outlet.currency.trim(),
      openedBy: ctx.userId,
    });
    helpers.emit({
      type: 'pos.check_opened',
      aggregateType: 'pos_check',
      aggregateId: id,
      propertyId,
      data: { checkId: id, outletId: input.outletId, tableId: input.tableId ?? null },
    });
    helpers.audit({
      action: 'pos.check.create',
      entityType: 'pos_check',
      entityId: id,
      after: { outletId: input.outletId, covers: input.covers },
      propertyId,
    });
    return id;
  }

  async addItem(
    tx: DbTransaction,
    helpers: UowHelpers,
    checkId: string,
    input: AddPosItemInput,
  ): Promise<void> {
    const check = await this.loadOpenCheck(tx, checkId);
    const unit = Money.fromJSON(input.unitPrice);
    if (unit.currency !== check.currency.trim())
      throw new StateConflictError('Item currency does not match check');
    const line = unit.times(input.quantity);
    await tx.insert(posCheckItems).values({
      id: uuidv7(),
      tenantId: check.tenantId,
      propertyId: check.propertyId,
      checkId,
      name: input.name,
      course: input.course ?? null,
      quantity: input.quantity,
      unitPrice: unit.amount,
      lineTotal: line.amount,
    });
    await this.retotal(tx, checkId);
    helpers.emit({
      type: 'pos.item_added',
      aggregateType: 'pos_check',
      aggregateId: checkId,
      propertyId: check.propertyId,
      data: { checkId, itemName: input.name, amount: line.toJSON() },
    });
  }

  async fire(tx: DbTransaction, helpers: UowHelpers, checkId: string): Promise<void> {
    const check = await this.loadOpenCheck(tx, checkId);
    await tx
      .update(posCheckItems)
      .set({ status: 'fired', firedAt: new Date() })
      .where(and(eq(posCheckItems.checkId, checkId), eq(posCheckItems.status, 'new')));
    await tx
      .update(posChecks)
      .set({ status: 'fired', updatedAt: new Date() })
      .where(eq(posChecks.id, checkId));
    helpers.emit({
      type: 'pos.check_fired',
      aggregateType: 'pos_check',
      aggregateId: checkId,
      propertyId: check.propertyId,
      data: { checkId },
    });
  }

  async markItemReady(tx: DbTransaction, helpers: UowHelpers, itemId: string): Promise<string> {
    const ctx = getRequestContext();
    const [item] = await tx
      .select({
        id: posCheckItems.id,
        checkId: posCheckItems.checkId,
        propertyId: posCheckItems.propertyId,
      })
      .from(posCheckItems)
      .where(and(eq(posCheckItems.tenantId, ctx.tenantId), eq(posCheckItems.id, itemId)))
      .limit(1);
    if (!item) throw new NotFoundError('POS item');
    await tx
      .update(posCheckItems)
      .set({ status: 'ready', readyAt: new Date() })
      .where(eq(posCheckItems.id, itemId));
    helpers.emit({
      type: 'pos.item_ready',
      aggregateType: 'pos_check_item',
      aggregateId: itemId,
      propertyId: item.propertyId,
      data: { itemId, checkId: item.checkId },
    });
    return item.checkId;
  }

  async close(
    tx: DbTransaction,
    helpers: UowHelpers,
    checkId: string,
    input: {
      payments: Array<{
        method: string;
        amount: { amount: string; currency: string };
        reference?: string;
      }>;
      roomFolioId?: string;
    },
  ): Promise<void> {
    const check = await this.loadCheck(tx, checkId);
    if (check.status === 'closed') throw new StateConflictError('Check is already closed');
    if (check.status === 'voided') throw new StateConflictError('Check is voided');

    if (input.roomFolioId) {
      await this.folio.assertOpenFolio(tx, input.roomFolioId);
      await this.folio.postCharge(tx, helpers, {
        folioId: input.roomFolioId,
        chargeCode: 'FNB',
        description: `POS check ${check.checkNumber}`,
        amount: Money.of(check.total, check.currency.trim()),
        quantity: 1,
      });
      await tx
        .update(posChecks)
        .set({ roomFolioId: input.roomFolioId })
        .where(eq(posChecks.id, checkId));
    } else {
      const paid = input.payments.reduce(
        (acc, p) => acc.add(Money.fromJSON(p.amount)),
        Money.zero(check.currency.trim()),
      );
      if (paid.compare(Money.of(check.total, check.currency.trim())) !== 0) {
        throw new StateConflictError('POS payments must equal the check total');
      }
      for (const p of input.payments) {
        const amount = Money.fromJSON(p.amount);
        await tx.insert(posPayments).values({
          id: uuidv7(),
          tenantId: check.tenantId,
          propertyId: check.propertyId,
          checkId,
          method: p.method as 'card' | 'cash' | 'bank_transfer' | 'ar_transfer' | 'voucher',
          amount: amount.amount,
          currency: amount.currency,
          reference: p.reference ?? null,
        });
      }
    }

    await tx
      .update(posChecks)
      .set({
        status: 'closed',
        closedBy: getRequestContext().userId,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(posChecks.id, checkId));
    helpers.emit({
      type: 'pos.check_closed',
      aggregateType: 'pos_check',
      aggregateId: checkId,
      propertyId: check.propertyId,
      data: {
        checkId,
        total: Money.of(check.total, check.currency.trim()).toJSON(),
        roomFolioId: input.roomFolioId ?? null,
      },
    });
    helpers.audit({
      action: input.roomFolioId ? 'pos.roomcharge.post' : 'pos.check.close',
      entityType: 'pos_check',
      entityId: checkId,
      after: { total: check.total, roomFolioId: input.roomFolioId ?? null },
      propertyId: check.propertyId,
    });
  }

  async getDto(tx: DbTransaction, checkId: string): Promise<PosCheck> {
    const check = await this.loadCheck(tx, checkId);
    const items = await tx
      .select()
      .from(posCheckItems)
      .where(eq(posCheckItems.checkId, checkId))
      .orderBy(asc(posCheckItems.createdAt));
    const currency = check.currency.trim();
    return {
      id: check.id,
      outletId: check.outletId,
      tableId: check.tableId,
      checkNumber: check.checkNumber,
      status: check.status,
      covers: check.covers,
      subtotal: Money.of(check.subtotal, currency).toJSON(),
      discountTotal: Money.of(check.discountTotal, currency).toJSON(),
      taxTotal: Money.of(check.taxTotal, currency).toJSON(),
      total: Money.of(check.total, currency).toJSON(),
      roomFolioId: check.roomFolioId,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        course: i.course,
        quantity: i.quantity,
        unitPrice: Money.of(i.unitPrice, currency).toJSON(),
        lineTotal: Money.of(i.lineTotal, currency).toJSON(),
        status: i.status,
        firedAt: i.firedAt?.toISOString() ?? null,
        readyAt: i.readyAt?.toISOString() ?? null,
      })),
    };
  }

  async kds(tx: DbTransaction, propertyId: string): Promise<PosCheck['items']> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({ item: posCheckItems, currency: posChecks.currency })
      .from(posCheckItems)
      .innerJoin(posChecks, eq(posChecks.id, posCheckItems.checkId))
      .where(
        and(
          eq(posCheckItems.tenantId, ctx.tenantId),
          eq(posCheckItems.propertyId, propertyId),
          inArray(posCheckItems.status, ['fired', 'ready']),
        ),
      )
      .orderBy(asc(posCheckItems.firedAt), asc(posCheckItems.createdAt));
    return rows.map((r) => ({
      id: r.item.id,
      name: r.item.name,
      course: r.item.course,
      quantity: r.item.quantity,
      unitPrice: Money.of(r.item.unitPrice, r.currency.trim()).toJSON(),
      lineTotal: Money.of(r.item.lineTotal, r.currency.trim()).toJSON(),
      status: r.item.status,
      firedAt: r.item.firedAt?.toISOString() ?? null,
      readyAt: r.item.readyAt?.toISOString() ?? null,
    }));
  }

  async openShift(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    outletId: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    if (!ctx.userId)
      throw new ValidationError('A user is required', [{ field: 'user', code: 'REQUIRED' }]);
    const existing = await tx
      .select({ id: posShifts.id })
      .from(posShifts)
      .where(
        and(
          eq(posShifts.tenantId, ctx.tenantId),
          eq(posShifts.propertyId, propertyId),
          eq(posShifts.outletId, outletId),
          eq(posShifts.userId, ctx.userId),
          eq(posShifts.status, 'open'),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0].id;
    const id = uuidv7();
    await tx
      .insert(posShifts)
      .values({ id, tenantId: ctx.tenantId, propertyId, outletId, userId: ctx.userId });
    helpers.audit({ action: 'pos.cash.manage', entityType: 'pos_shift', entityId: id, propertyId });
    return id;
  }

  async closeShift(
    tx: DbTransaction,
    helpers: UowHelpers,
    shiftId: string,
    countedTotal: Money,
  ): Promise<void> {
    const ctx = getRequestContext();
    const [shift] = await tx
      .select()
      .from(posShifts)
      .where(and(eq(posShifts.tenantId, ctx.tenantId), eq(posShifts.id, shiftId)))
      .limit(1);
    if (!shift) throw new NotFoundError('POS shift');
    if (shift.status !== 'open') throw new StateConflictError('Shift already closed');
    const [paid] = await tx
      .select({ total: sum(posPayments.amount) })
      .from(posPayments)
      .innerJoin(posChecks, eq(posChecks.id, posPayments.checkId))
      .where(
        and(
          eq(posChecks.tenantId, ctx.tenantId),
          eq(posChecks.outletId, shift.outletId),
          eq(posChecks.closedBy, shift.userId),
        ),
      );
    const expected = Money.of(paid?.total ?? '0', countedTotal.currency);
    await tx
      .update(posShifts)
      .set({
        status: 'closed',
        expectedTotal: expected.amount,
        countedTotal: countedTotal.amount,
        variance: countedTotal.subtract(expected).amount,
        closedAt: new Date(),
      })
      .where(eq(posShifts.id, shiftId));
    helpers.emit({
      type: 'pos.shift_closed',
      aggregateType: 'pos_shift',
      aggregateId: shiftId,
      propertyId: shift.propertyId,
      data: { shiftId, expectedTotal: expected.toJSON(), countedTotal: countedTotal.toJSON() },
    });
    helpers.audit({
      action: 'pos.shift.close',
      entityType: 'pos_shift',
      entityId: shiftId,
      propertyId: shift.propertyId,
    });
  }

  async shiftDto(tx: DbTransaction, shiftId: string): Promise<PosShift> {
    const ctx = getRequestContext();
    const [s] = await tx
      .select()
      .from(posShifts)
      .where(and(eq(posShifts.tenantId, ctx.tenantId), eq(posShifts.id, shiftId)))
      .limit(1);
    if (!s) throw new NotFoundError('POS shift');
    const currency = 'USD';
    return {
      id: s.id,
      outletId: s.outletId,
      status: s.status,
      expectedTotal: s.expectedTotal ? Money.of(s.expectedTotal, currency).toJSON() : null,
      countedTotal: s.countedTotal ? Money.of(s.countedTotal, currency).toJSON() : null,
      variance: s.variance ? Money.of(s.variance, currency).toJSON() : null,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
    };
  }

  async queueOfflineOp(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: QueueOfflineOpInput,
  ): Promise<OfflineOp> {
    const ctx = getRequestContext();
    const id = uuidv7();
    await tx.insert(offlineOps).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      deviceId: input.deviceId,
      opKey: input.opKey,
      payload: input.payload,
    });
    helpers.emit({
      type: 'offline.op_queued',
      aggregateType: 'offline_op',
      aggregateId: id,
      propertyId,
      data: { opId: id, deviceId: input.deviceId, opKey: input.opKey },
    });
    return {
      id,
      deviceId: input.deviceId,
      opKey: input.opKey,
      status: 'queued',
      rejectionReason: null,
    };
  }

  private async retotal(tx: DbTransaction, checkId: string): Promise<void> {
    const [row] = await tx
      .select({ subtotal: sum(posCheckItems.lineTotal) })
      .from(posCheckItems)
      .where(and(eq(posCheckItems.checkId, checkId), sql`${posCheckItems.status} <> 'voided'`));
    const [check] = await tx
      .select({ currency: posChecks.currency })
      .from(posChecks)
      .where(eq(posChecks.id, checkId))
      .limit(1);
    const currency = check?.currency.trim() ?? 'USD';
    const subtotal = Money.of(row?.subtotal ?? '0', currency);
    await tx
      .update(posChecks)
      .set({ subtotal: subtotal.amount, total: subtotal.amount, updatedAt: new Date() })
      .where(eq(posChecks.id, checkId));
  }

  private async loadOpenCheck(tx: DbTransaction, checkId: string) {
    const check = await this.loadCheck(tx, checkId);
    if (check.status !== 'open' && check.status !== 'fired')
      throw new StateConflictError(`Check is ${check.status}`);
    return check;
  }

  private async loadCheck(tx: DbTransaction, checkId: string) {
    const ctx = getRequestContext();
    const [check] = await tx
      .select()
      .from(posChecks)
      .where(and(eq(posChecks.tenantId, ctx.tenantId), eq(posChecks.id, checkId)))
      .limit(1);
    if (!check) throw new NotFoundError('POS check');
    return check;
  }
}
