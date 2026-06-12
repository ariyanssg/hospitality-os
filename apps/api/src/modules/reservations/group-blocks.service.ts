import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { and, asc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import { groupBlockInventory, groupBlocks, roomTypes, uuidv7, type DbTransaction } from '@vela/db';
import type {
  CreateGroupBlockInput,
  GroupBlock,
  GroupBlockInventoryRow,
  GroupBlockListPage,
  GroupBlockListQuery,
  ImportRoomingListInput,
  PickupGroupBlockInput,
} from '@vela/contracts';
import { env } from '../../config/env';
import {
  AvailabilityConflictError,
  getRequestContext,
  Money,
  NotFoundError,
  StateConflictError,
  ValidationError,
  type UowHelpers,
} from '../kernel';
import { AvailabilityService } from '../availability';
import { FolioService } from '../folio';
import { ReservationsService } from './reservations.service';
import { nightsBetween } from './domain/dates';

@Injectable()
export class GroupBlocksService {
  constructor(
    private readonly availability: AvailabilityService,
    private readonly folio: FolioService,
    private readonly reservations: ReservationsService,
  ) {}

  private cursorSecret(): string {
    return env().BETTER_AUTH_SECRET;
  }

  private invalidCursor(): never {
    throw new ValidationError('Invalid cursor', [{ field: 'cursor', code: 'INVALID' }]);
  }

  private encodeListCursor(arrivalDate: string, code: string, id: string): string {
    const payload = Buffer.from(JSON.stringify({ arrivalDate, code, id })).toString('base64url');
    const sig = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeListCursor(cursor: string): { arrivalDate: string; code: string; id: string } {
    const [payload, sig] = cursor.split('.');
    if (!payload || !sig) this.invalidCursor();
    const expected = createHmac('sha256', this.cursorSecret()).update(payload).digest('base64url');
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      this.invalidCursor();
    }
    let parsed: { arrivalDate?: unknown; code?: unknown; id?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        arrivalDate?: unknown;
        code?: unknown;
        id?: unknown;
      };
    } catch {
      this.invalidCursor();
    }
    if (
      typeof parsed.arrivalDate !== 'string' ||
      typeof parsed.code !== 'string' ||
      typeof parsed.id !== 'string'
    ) {
      this.invalidCursor();
    }
    return { arrivalDate: parsed.arrivalDate, code: parsed.code, id: parsed.id };
  }

  async create(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateGroupBlockInput,
  ): Promise<string> {
    const ctx = getRequestContext();
    const dates = nightsBetween(input.arrivalDate, input.departureDate);
    if (dates.length === 0) {
      throw new ValidationError('Departure must be after arrival', [
        { field: 'departureDate', code: 'INVALID_RANGE' },
      ]);
    }

    const id = uuidv7();
    const masterFolioId = input.billingInstructions.roomAndTaxToMaster
      ? await this.folio.createFolio(tx, {
          propertyId,
          reservationId: null,
          guestId: null,
          currency: input.inventory.find((i) => i.rate)?.rate?.currency ?? 'USD',
          type: 'master',
        })
      : null;

    await tx.insert(groupBlocks).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      code: input.code,
      name: input.name,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      cutoffDate: input.cutoffDate ?? null,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      billingInstructions: input.billingInstructions,
      masterFolioId,
      notes: input.notes ?? null,
    });

    for (const item of input.inventory) {
      await this.availability.block(tx, helpers, {
        propertyId,
        roomTypeId: item.roomTypeId,
        dates,
        units: item.blocked,
      });
      for (const stayDate of dates) {
        await tx.insert(groupBlockInventory).values({
          id: uuidv7(),
          tenantId: ctx.tenantId,
          propertyId,
          groupBlockId: id,
          roomTypeId: item.roomTypeId,
          stayDate,
          blocked: item.blocked,
          rateAmount: item.rate?.amount ?? null,
          currency: item.rate?.currency ?? 'USD',
        });
      }
    }

    helpers.emit({
      type: 'group.block_created',
      aggregateType: 'group_block',
      aggregateId: id,
      propertyId,
      data: {
        code: input.code,
        masterFolioId,
        arrivalDate: input.arrivalDate,
        departureDate: input.departureDate,
        inventory: input.inventory.map((i) => ({ roomTypeId: i.roomTypeId, blocked: i.blocked })),
      },
    });
    helpers.audit({
      action: 'group_block.create',
      entityType: 'group_block',
      entityId: id,
      after: { code: input.code, name: input.name },
      propertyId,
    });

    return id;
  }

  async pickup(
    tx: DbTransaction,
    helpers: UowHelpers,
    blockId: string,
    input: PickupGroupBlockInput,
    propertyId?: string,
  ): Promise<string> {
    const ctx = getRequestContext();
    const block = await this.load(tx, blockId, propertyId);
    if (block.status === 'released') {
      throw new StateConflictError('Cannot pick up a released group block');
    }

    const arrivalDate = input.arrivalDate ?? block.arrivalDate;
    const departureDate = input.departureDate ?? block.departureDate;
    if (arrivalDate < block.arrivalDate || departureDate > block.departureDate) {
      throw new ValidationError('Pickup dates must stay inside the group block dates', [
        { field: 'arrivalDate', code: 'OUT_OF_RANGE' },
        { field: 'departureDate', code: 'OUT_OF_RANGE' },
      ]);
    }

    const dates = nightsBetween(arrivalDate, departureDate);
    if (dates.length === 0) {
      throw new ValidationError('Departure must be after arrival', [
        { field: 'departureDate', code: 'INVALID_RANGE' },
      ]);
    }

    for (const stayDate of dates) {
      const updated = await tx
        .update(groupBlockInventory)
        .set({ pickedUp: sql`${groupBlockInventory.pickedUp} + 1` })
        .where(
          and(
            eq(groupBlockInventory.tenantId, ctx.tenantId),
            eq(groupBlockInventory.propertyId, block.propertyId),
            eq(groupBlockInventory.groupBlockId, block.id),
            eq(groupBlockInventory.roomTypeId, input.roomTypeId),
            eq(groupBlockInventory.stayDate, stayDate),
            lt(groupBlockInventory.pickedUp, groupBlockInventory.blocked),
          ),
        )
        .returning({ stayDate: groupBlockInventory.stayDate });
      if (updated.length === 0) {
        throw new AvailabilityConflictError(`No group pickup allocation remains on ${stayDate}.`, [
          { field: 'roomTypeId', code: 'GROUP_BLOCK_FULL', stayDate },
        ]);
      }
    }

    const reservationId = await this.reservations.createBooking(tx, helpers, {
      guest: input.guest,
      arrivalDate,
      departureDate,
      roomTypeId: input.roomTypeId,
      ratePlanId: input.ratePlanId,
      adults: input.adults,
      children: input.children,
      guarantee: input.guarantee,
      groupBlockId: block.id,
      source: { channel: 'group', promoCode: block.code },
      notes: input.notes,
    });

    await this.availability.releaseBlock(tx, helpers, {
      propertyId: block.propertyId,
      roomTypeId: input.roomTypeId,
      dates,
    });

    helpers.emit({
      type: 'group.pickup',
      aggregateType: 'group_block',
      aggregateId: block.id,
      propertyId: block.propertyId,
      data: { groupBlockId: block.id, reservationId, roomTypeId: input.roomTypeId, dates },
    });
    helpers.audit({
      action: 'group_block.pickup',
      entityType: 'group_block',
      entityId: block.id,
      after: { reservationId, roomTypeId: input.roomTypeId, dates },
      propertyId: block.propertyId,
    });

    return reservationId;
  }

  async importRoomingList(
    tx: DbTransaction,
    helpers: UowHelpers,
    blockId: string,
    input: ImportRoomingListInput,
    propertyId?: string,
  ): Promise<Array<{ rowNumber: number; externalRef: string | null; reservationId: string }>> {
    const block = await this.load(tx, blockId, propertyId);
    const created: Array<{ rowNumber: number; externalRef: string | null; reservationId: string }> =
      [];

    for (const [index, row] of input.rows.entries()) {
      const reservationId = await this.pickup(tx, helpers, blockId, row, propertyId);
      created.push({
        rowNumber: index + 1,
        externalRef: row.externalRef ?? null,
        reservationId,
      });
    }

    helpers.audit({
      action: 'group_block.rooming_list_import',
      entityType: 'group_block',
      entityId: blockId,
      after: { count: created.length, reservationIds: created.map((r) => r.reservationId) },
      propertyId: block.propertyId,
    });

    return created;
  }

  async list(
    tx: DbTransaction,
    propertyId: string,
    query: GroupBlockListQuery,
  ): Promise<GroupBlockListPage> {
    const ctx = getRequestContext();
    const cursor = query.cursor ? this.decodeListCursor(query.cursor) : undefined;
    const blocks = await tx
      .select({
        id: groupBlocks.id,
        code: groupBlocks.code,
        name: groupBlocks.name,
        status: groupBlocks.status,
        arrivalDate: groupBlocks.arrivalDate,
        departureDate: groupBlocks.departureDate,
        cutoffDate: groupBlocks.cutoffDate,
      })
      .from(groupBlocks)
      .where(
        and(
          eq(groupBlocks.tenantId, ctx.tenantId),
          eq(groupBlocks.propertyId, propertyId),
          cursor
            ? or(
                gt(groupBlocks.arrivalDate, cursor.arrivalDate),
                and(
                  eq(groupBlocks.arrivalDate, cursor.arrivalDate),
                  gt(groupBlocks.code, cursor.code),
                ),
                and(
                  eq(groupBlocks.arrivalDate, cursor.arrivalDate),
                  eq(groupBlocks.code, cursor.code),
                  gt(groupBlocks.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(groupBlocks.arrivalDate), asc(groupBlocks.code), asc(groupBlocks.id))
      .limit(query.limit + 1);

    const pageBlocks = blocks.slice(0, query.limit);
    const next = blocks.length > query.limit ? pageBlocks[pageBlocks.length - 1] : undefined;
    if (pageBlocks.length === 0) return { data: [], meta: { nextCursor: null } };
    const inventory = await tx
      .select({
        groupBlockId: groupBlockInventory.groupBlockId,
        blocked: groupBlockInventory.blocked,
        pickedUp: groupBlockInventory.pickedUp,
      })
      .from(groupBlockInventory)
      .where(
        and(
          eq(groupBlockInventory.tenantId, ctx.tenantId),
          inArray(
            groupBlockInventory.groupBlockId,
            pageBlocks.map((b) => b.id),
          ),
        ),
      );

    const totals = new Map<string, { blocked: number; pickedUp: number }>();
    for (const row of inventory) {
      const current = totals.get(row.groupBlockId) ?? { blocked: 0, pickedUp: 0 };
      current.blocked += row.blocked;
      current.pickedUp += row.pickedUp;
      totals.set(row.groupBlockId, current);
    }

    return {
      data: pageBlocks.map((b) => ({
        ...b,
        roomsBlocked: totals.get(b.id)?.blocked ?? 0,
        roomsPickedUp: totals.get(b.id)?.pickedUp ?? 0,
      })),
      meta: {
        nextCursor: next ? this.encodeListCursor(next.arrivalDate, next.code, next.id) : null,
      },
    };
  }

  async getDto(tx: DbTransaction, id: string, propertyId?: string): Promise<GroupBlock> {
    const block = await this.load(tx, id, propertyId);
    const inventory = await this.inventoryRows(tx, id, propertyId);

    return {
      id: block.id,
      code: block.code,
      name: block.name,
      status: block.status,
      arrivalDate: block.arrivalDate,
      departureDate: block.departureDate,
      cutoffDate: block.cutoffDate,
      contactName: block.contactName,
      contactEmail: block.contactEmail,
      billingInstructions: normalizeBilling(block.billingInstructions),
      masterFolioId: block.masterFolioId,
      notes: block.notes,
      inventory: inventory.map(toInventoryRow),
    };
  }

  private async load(tx: DbTransaction, id: string, propertyId?: string) {
    const ctx = getRequestContext();
    const [block] = await tx
      .select()
      .from(groupBlocks)
      .where(
        and(
          eq(groupBlocks.tenantId, ctx.tenantId),
          eq(groupBlocks.id, id),
          propertyId ? eq(groupBlocks.propertyId, propertyId) : undefined,
        ),
      )
      .limit(1);
    if (!block) throw new NotFoundError('Group block');
    return block;
  }

  private async inventoryRows(tx: DbTransaction, id: string, propertyId?: string) {
    const ctx = getRequestContext();
    return tx
      .select({
        roomTypeId: groupBlockInventory.roomTypeId,
        roomTypeCode: roomTypes.code,
        stayDate: groupBlockInventory.stayDate,
        blocked: groupBlockInventory.blocked,
        pickedUp: groupBlockInventory.pickedUp,
        rateAmount: groupBlockInventory.rateAmount,
        currency: groupBlockInventory.currency,
      })
      .from(groupBlockInventory)
      .innerJoin(roomTypes, eq(roomTypes.id, groupBlockInventory.roomTypeId))
      .where(
        and(
          eq(groupBlockInventory.tenantId, ctx.tenantId),
          eq(groupBlockInventory.groupBlockId, id),
          propertyId ? eq(groupBlockInventory.propertyId, propertyId) : undefined,
        ),
      )
      .orderBy(asc(groupBlockInventory.stayDate), asc(roomTypes.code));
  }
}

function normalizeBilling(value: unknown): GroupBlock['billingInstructions'] {
  const data = value as Partial<GroupBlock['billingInstructions']> | null;
  return {
    roomAndTaxToMaster: data?.roomAndTaxToMaster ?? false,
    incidentalsToGuest: data?.incidentalsToGuest ?? true,
  };
}

function toInventoryRow(row: {
  roomTypeId: string;
  roomTypeCode: string;
  stayDate: string;
  blocked: number;
  pickedUp: number;
  rateAmount: string | null;
  currency: string;
}): GroupBlockInventoryRow {
  return {
    roomTypeId: row.roomTypeId,
    roomTypeCode: row.roomTypeCode,
    stayDate: row.stayDate,
    blocked: row.blocked,
    pickedUp: row.pickedUp,
    rate: row.rateAmount ? Money.of(row.rateAmount, row.currency).toJSON() : null,
  };
}
