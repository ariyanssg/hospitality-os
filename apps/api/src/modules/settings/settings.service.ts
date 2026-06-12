import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  chargeCodes,
  floors,
  paymentMethods,
  reservationRoomStays,
  roomAmenityAssignments,
  roomAmenities,
  roomTypes,
  rooms,
  uuidv7,
  type DbTransaction,
} from '@vela/db';
import type {
  ChargeType,
  CreateChargeTypeInput,
  CreateFloorInput,
  CreatePaymentMethodInput,
  CreateRoomAmenityInput,
  CreateRoomInput,
  CreateRoomTypeSettingInput,
  Floor,
  PaymentMethod,
  RoomAmenity,
  RoomAmenityTag,
  RoomSetting,
  RoomTypeSetting,
  SettingsCatalog,
  UpdateChargeTypeInput,
  UpdateFloorInput,
  UpdatePaymentMethodInput,
  UpdateRoomAmenityInput,
  UpdateRoomInput,
  UpdateRoomTypeSettingInput,
} from '@vela/contracts';
import {
  BusinessDateService,
  getRequestContext,
  NotFoundError,
  StateConflictError,
  ValidationError,
  type UowHelpers,
} from '../kernel';

function upperCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_');
}

function lowerCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, '_');
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class SettingsService {
  constructor(private readonly businessDate: BusinessDateService) {}

  async catalog(tx: DbTransaction, propertyId: string): Promise<SettingsCatalog> {
    const floorRows = await this.listFloors(tx, propertyId);
    const amenities = await this.listAmenities(tx, propertyId);
    const roomTypesRows = await this.listRoomTypes(tx, propertyId);
    const roomRows = await this.listRooms(tx, propertyId);
    const chargeTypes = await this.listChargeTypes(tx, propertyId);
    const methods = await this.listPaymentMethods(tx, propertyId);

    return {
      floors: floorRows,
      amenities,
      roomTypes: roomTypesRows,
      rooms: roomRows,
      chargeTypes,
      paymentMethods: methods,
    };
  }

  async listFloors(tx: DbTransaction, propertyId: string): Promise<Floor[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({
        id: floors.id,
        code: floors.code,
        name: floors.name,
        sortOrder: floors.sortOrder,
        isActive: floors.isActive,
      })
      .from(floors)
      .where(and(eq(floors.tenantId, ctx.tenantId), eq(floors.propertyId, propertyId)))
      .orderBy(asc(floors.sortOrder), asc(floors.code));
    return rows;
  }

  async createFloor(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateFloorInput,
  ): Promise<Floor> {
    const ctx = getRequestContext();
    const code = upperCode(input.code);
    const [row] = await tx
      .insert(floors)
      .values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId,
        code,
        name: input.name.trim(),
        sortOrder: input.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [floors.tenantId, floors.propertyId, floors.code],
        set: {
          name: input.name.trim(),
          sortOrder: input.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: floors.id });

    helpers.emit({
      type: 'settings.floor_saved',
      aggregateType: 'floor',
      aggregateId: row!.id,
      propertyId,
      data: { floorId: row!.id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'floor',
      entityId: row!.id,
      after: { code, name: input.name },
      propertyId,
    });
    return this.floorById(tx, propertyId, row!.id);
  }

  async updateFloor(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
    input: UpdateFloorInput,
  ): Promise<Floor> {
    const current = await this.floorById(tx, propertyId, id);
    const code = input.code ? upperCode(input.code) : current.code;
    await tx
      .update(floors)
      .set({
        code,
        name: input.name?.trim() ?? current.name,
        sortOrder: input.sortOrder ?? current.sortOrder,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(floors.id, id));
    await tx.update(rooms).set({ floor: code, updatedAt: new Date() }).where(eq(rooms.floorId, id));
    helpers.emit({
      type: 'settings.floor_saved',
      aggregateType: 'floor',
      aggregateId: id,
      propertyId,
      data: { floorId: id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'floor',
      entityId: id,
      before: current,
      after: { ...current, ...input, code },
      propertyId,
    });
    return this.floorById(tx, propertyId, id);
  }

  async removeFloor(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
  ): Promise<{ id: string; removed: boolean }> {
    const current = await this.floorById(tx, propertyId, id);
    await tx
      .update(floors)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(floors.id, id));
    helpers.emit({
      type: 'settings.floor_saved',
      aggregateType: 'floor',
      aggregateId: id,
      propertyId,
      data: { floorId: id, code: current.code, removed: true },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'floor',
      entityId: id,
      before: current,
      after: { ...current, isActive: false },
      propertyId,
    });
    return { id, removed: true };
  }

  async listAmenities(tx: DbTransaction, propertyId: string): Promise<RoomAmenity[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({
        id: roomAmenities.id,
        code: roomAmenities.code,
        name: roomAmenities.name,
        category: roomAmenities.category,
        isActive: roomAmenities.isActive,
      })
      .from(roomAmenities)
      .where(
        and(eq(roomAmenities.tenantId, ctx.tenantId), eq(roomAmenities.propertyId, propertyId)),
      )
      .orderBy(asc(roomAmenities.category), asc(roomAmenities.code));
    return rows;
  }

  async createAmenity(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateRoomAmenityInput,
  ): Promise<RoomAmenity> {
    const ctx = getRequestContext();
    const code = upperCode(input.code);
    const [row] = await tx
      .insert(roomAmenities)
      .values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId,
        code,
        name: input.name.trim(),
        category: input.category?.trim() || null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [roomAmenities.tenantId, roomAmenities.propertyId, roomAmenities.code],
        set: {
          name: input.name.trim(),
          category: input.category?.trim() || null,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: roomAmenities.id });

    helpers.emit({
      type: 'settings.room_amenity_saved',
      aggregateType: 'room_amenity',
      aggregateId: row!.id,
      propertyId,
      data: { amenityId: row!.id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room_amenity',
      entityId: row!.id,
      after: { code, name: input.name },
      propertyId,
    });
    return this.amenityById(tx, propertyId, row!.id);
  }

  async updateAmenity(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
    input: UpdateRoomAmenityInput,
  ): Promise<RoomAmenity> {
    const current = await this.amenityById(tx, propertyId, id);
    const code = input.code ? upperCode(input.code) : current.code;
    await tx
      .update(roomAmenities)
      .set({
        code,
        name: input.name?.trim() ?? current.name,
        category: input.category !== undefined ? input.category.trim() || null : current.category,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(roomAmenities.id, id));
    helpers.emit({
      type: 'settings.room_amenity_saved',
      aggregateType: 'room_amenity',
      aggregateId: id,
      propertyId,
      data: { amenityId: id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room_amenity',
      entityId: id,
      before: current,
      after: { ...current, ...input, code },
      propertyId,
    });
    return this.amenityById(tx, propertyId, id);
  }

  async removeAmenity(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
  ): Promise<{ id: string; removed: boolean }> {
    const current = await this.amenityById(tx, propertyId, id);
    await tx
      .update(roomAmenities)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(roomAmenities.id, id));
    helpers.emit({
      type: 'settings.room_amenity_saved',
      aggregateType: 'room_amenity',
      aggregateId: id,
      propertyId,
      data: { amenityId: id, code: current.code, removed: true },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room_amenity',
      entityId: id,
      before: current,
      after: { ...current, isActive: false },
      propertyId,
    });
    return { id, removed: true };
  }

  async listRoomTypes(tx: DbTransaction, propertyId: string): Promise<RoomTypeSetting[]> {
    const ctx = getRequestContext();
    const typeRows = await tx
      .select({
        id: roomTypes.id,
        code: roomTypes.code,
        name: roomTypes.name,
        description: roomTypes.description,
        maxOccupancy: roomTypes.maxOccupancy,
        defaultOccupancy: roomTypes.defaultOccupancy,
        sortOrder: roomTypes.sortOrder,
      })
      .from(roomTypes)
      .where(and(eq(roomTypes.tenantId, ctx.tenantId), eq(roomTypes.propertyId, propertyId)))
      .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.code));
    const roomRows = await tx
      .select({ roomTypeId: rooms.roomTypeId })
      .from(rooms)
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.propertyId, propertyId)));

    const counts = new Map<string, number>();
    for (const room of roomRows)
      counts.set(room.roomTypeId, (counts.get(room.roomTypeId) ?? 0) + 1);

    return typeRows.map((row) => ({
      ...row,
      roomCount: counts.get(row.id) ?? 0,
    }));
  }

  async createRoomType(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateRoomTypeSettingInput,
  ): Promise<RoomTypeSetting> {
    if (input.defaultOccupancy > input.maxOccupancy) {
      throw new ValidationError('Default occupancy cannot exceed max occupancy', [
        { field: 'defaultOccupancy', code: 'TOO_HIGH' },
      ]);
    }

    const ctx = getRequestContext();
    const code = upperCode(input.code);
    const [row] = await tx
      .insert(roomTypes)
      .values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId,
        code,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        maxOccupancy: input.maxOccupancy,
        defaultOccupancy: input.defaultOccupancy,
        sortOrder: input.sortOrder,
      })
      .onConflictDoUpdate({
        target: [roomTypes.tenantId, roomTypes.propertyId, roomTypes.code],
        set: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          maxOccupancy: input.maxOccupancy,
          defaultOccupancy: input.defaultOccupancy,
          sortOrder: input.sortOrder,
          updatedAt: new Date(),
        },
      })
      .returning({ id: roomTypes.id });

    helpers.emit({
      type: 'settings.room_type_saved',
      aggregateType: 'room_type',
      aggregateId: row!.id,
      propertyId,
      data: { roomTypeId: row!.id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room_type',
      entityId: row!.id,
      after: { code, name: input.name },
      propertyId,
    });
    return this.roomTypeById(tx, propertyId, row!.id);
  }

  async updateRoomType(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
    input: UpdateRoomTypeSettingInput,
  ): Promise<RoomTypeSetting> {
    const current = await this.roomTypeById(tx, propertyId, id);
    const maxOccupancy = input.maxOccupancy ?? current.maxOccupancy;
    const defaultOccupancy = input.defaultOccupancy ?? current.defaultOccupancy;
    if (defaultOccupancy > maxOccupancy) {
      throw new ValidationError('Default occupancy cannot exceed max occupancy', [
        { field: 'defaultOccupancy', code: 'TOO_HIGH' },
      ]);
    }
    const code = input.code ? upperCode(input.code) : current.code;
    await tx
      .update(roomTypes)
      .set({
        code,
        name: input.name?.trim() ?? current.name,
        description:
          input.description !== undefined ? input.description.trim() || null : current.description,
        maxOccupancy,
        defaultOccupancy,
        sortOrder: input.sortOrder ?? current.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(roomTypes.id, id));
    helpers.emit({
      type: 'settings.room_type_saved',
      aggregateType: 'room_type',
      aggregateId: id,
      propertyId,
      data: { roomTypeId: id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room_type',
      entityId: id,
      before: current,
      after: { ...current, ...input, code, maxOccupancy, defaultOccupancy },
      propertyId,
    });
    return this.roomTypeById(tx, propertyId, id);
  }

  async removeRoomType(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
  ): Promise<{ id: string; removed: boolean }> {
    const current = await this.roomTypeById(tx, propertyId, id);
    if (current.roomCount > 0) {
      throw new StateConflictError('Room type still has rooms assigned');
    }
    await tx.delete(roomTypes).where(eq(roomTypes.id, id));
    helpers.emit({
      type: 'settings.room_type_saved',
      aggregateType: 'room_type',
      aggregateId: id,
      propertyId,
      data: { roomTypeId: id, code: current.code, removed: true },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room_type',
      entityId: id,
      before: current,
      after: null,
      propertyId,
    });
    return { id, removed: true };
  }

  async listRooms(tx: DbTransaction, propertyId: string): Promise<RoomSetting[]> {
    const ctx = getRequestContext();
    const roomRows = await tx
      .select({
        id: rooms.id,
        number: rooms.number,
        floor: rooms.floor,
        floorId: rooms.floorId,
        floorCode: floors.code,
        floorName: floors.name,
        roomTypeId: rooms.roomTypeId,
        roomTypeCode: roomTypes.code,
        roomTypeName: roomTypes.name,
        hkStatus: rooms.hkStatus,
        occupancy: rooms.occupancy,
      })
      .from(rooms)
      .innerJoin(roomTypes, eq(roomTypes.id, rooms.roomTypeId))
      .leftJoin(floors, eq(floors.id, rooms.floorId))
      .where(and(eq(rooms.tenantId, ctx.tenantId), eq(rooms.propertyId, propertyId)))
      .orderBy(asc(floors.sortOrder), asc(rooms.number));

    const amenities = await this.amenitiesForRooms(
      tx,
      propertyId,
      roomRows.map((room) => room.id),
    );

    return roomRows.map((room) => ({
      ...room,
      amenities: amenities.get(room.id) ?? [],
    }));
  }

  async createRoom(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateRoomInput,
  ): Promise<RoomSetting> {
    const ctx = getRequestContext();
    const number = input.number.trim();
    const [existing] = await tx
      .select({ id: rooms.id })
      .from(rooms)
      .where(
        and(
          eq(rooms.tenantId, ctx.tenantId),
          eq(rooms.propertyId, propertyId),
          eq(rooms.number, number),
        ),
      )
      .limit(1);
    if (existing) throw new StateConflictError(`Room ${number} already exists`);

    const [roomType] = await tx
      .select({ id: roomTypes.id })
      .from(roomTypes)
      .where(
        and(
          eq(roomTypes.tenantId, ctx.tenantId),
          eq(roomTypes.propertyId, propertyId),
          eq(roomTypes.id, input.roomTypeId),
        ),
      )
      .limit(1);
    if (!roomType) throw new NotFoundError('Room type');

    const floor = input.floorId ? await this.floorById(tx, propertyId, input.floorId) : null;
    const amenityIds = [...new Set(input.amenityIds)];
    if (amenityIds.length > 0) {
      const selected = await tx
        .select({ id: roomAmenities.id })
        .from(roomAmenities)
        .where(
          and(
            eq(roomAmenities.tenantId, ctx.tenantId),
            eq(roomAmenities.propertyId, propertyId),
            eq(roomAmenities.isActive, true),
            inArray(roomAmenities.id, amenityIds),
          ),
        );
      if (selected.length !== amenityIds.length) throw new NotFoundError('Room amenity');
    }

    const id = uuidv7();
    await tx.insert(rooms).values({
      id,
      tenantId: ctx.tenantId,
      propertyId,
      roomTypeId: input.roomTypeId,
      number,
      floorId: floor?.id ?? null,
      floor: floor?.code ?? null,
      hkStatus: 'clean',
      occupancy: 'vacant',
      attributes: {},
    });

    for (const amenityId of amenityIds) {
      await tx.insert(roomAmenityAssignments).values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId,
        roomId: id,
        amenityId,
      });
    }

    await this.addPhysicalInventory(tx, propertyId, input.roomTypeId, 1);

    helpers.emit({
      type: 'settings.room_created',
      aggregateType: 'room',
      aggregateId: id,
      propertyId,
      data: { roomId: id, number, roomTypeId: input.roomTypeId, floorId: floor?.id ?? null },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room',
      entityId: id,
      after: { number, roomTypeId: input.roomTypeId, floorId: floor?.id ?? null, amenityIds },
      propertyId,
    });
    return this.roomById(tx, propertyId, id);
  }

  async updateRoom(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
    input: UpdateRoomInput,
  ): Promise<RoomSetting> {
    const current = await this.roomById(tx, propertyId, id);
    const number = input.number?.trim() ?? current.number;
    if (number !== current.number) {
      const [existing] = await tx
        .select({ id: rooms.id })
        .from(rooms)
        .where(and(eq(rooms.propertyId, propertyId), eq(rooms.number, number)))
        .limit(1);
      if (existing && existing.id !== id)
        throw new StateConflictError(`Room ${number} already exists`);
    }
    const roomTypeId = input.roomTypeId ?? current.roomTypeId;
    if (input.roomTypeId) {
      const [roomType] = await tx
        .select({ id: roomTypes.id })
        .from(roomTypes)
        .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.id, input.roomTypeId)))
        .limit(1);
      if (!roomType) throw new NotFoundError('Room type');
    }
    const floor =
      input.floorId !== undefined
        ? input.floorId
          ? await this.floorById(tx, propertyId, input.floorId)
          : null
        : current.floorId
          ? await this.floorById(tx, propertyId, current.floorId)
          : null;

    if (roomTypeId !== current.roomTypeId) {
      await this.addPhysicalInventory(tx, propertyId, current.roomTypeId, -1);
      await this.addPhysicalInventory(tx, propertyId, roomTypeId, 1);
    }

    await tx
      .update(rooms)
      .set({
        number,
        roomTypeId,
        floorId: floor?.id ?? null,
        floor: floor?.code ?? null,
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, id));

    if (input.amenityIds !== undefined) {
      const amenityIds: string[] = [...new Set(input.amenityIds)];
      if (amenityIds.length > 0) {
        const selected = await tx
          .select({ id: roomAmenities.id })
          .from(roomAmenities)
          .where(
            and(
              eq(roomAmenities.propertyId, propertyId),
              eq(roomAmenities.isActive, true),
              inArray(roomAmenities.id, amenityIds),
            ),
          );
        if (selected.length !== amenityIds.length) throw new NotFoundError('Room amenity');
      }
      await tx.delete(roomAmenityAssignments).where(eq(roomAmenityAssignments.roomId, id));
      for (const amenityId of amenityIds) {
        await tx.insert(roomAmenityAssignments).values({
          id: uuidv7(),
          tenantId: getRequestContext().tenantId,
          propertyId,
          roomId: id,
          amenityId,
        });
      }
    }

    helpers.emit({
      type: 'settings.room_created',
      aggregateType: 'room',
      aggregateId: id,
      propertyId,
      data: { roomId: id, number, roomTypeId, floorId: floor?.id ?? null },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room',
      entityId: id,
      before: current,
      after: { ...current, ...input, number, roomTypeId, floorId: floor?.id ?? null },
      propertyId,
    });
    return this.roomById(tx, propertyId, id);
  }

  async removeRoom(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
  ): Promise<{ id: string; removed: boolean }> {
    const current = await this.roomById(tx, propertyId, id);
    const [stay] = await tx
      .select({ id: reservationRoomStays.id })
      .from(reservationRoomStays)
      .where(eq(reservationRoomStays.roomId, id))
      .limit(1);
    if (stay) throw new StateConflictError('Room has reservation history and cannot be removed');
    await tx.delete(roomAmenityAssignments).where(eq(roomAmenityAssignments.roomId, id));
    await tx.delete(rooms).where(eq(rooms.id, id));
    await this.addPhysicalInventory(tx, propertyId, current.roomTypeId, -1);
    helpers.emit({
      type: 'settings.room_created',
      aggregateType: 'room',
      aggregateId: id,
      propertyId,
      data: { roomId: id, number: current.number, removed: true },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'room',
      entityId: id,
      before: current,
      after: null,
      propertyId,
    });
    return { id, removed: true };
  }

  async listChargeTypes(tx: DbTransaction, propertyId: string): Promise<ChargeType[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({
        id: chargeCodes.id,
        code: chargeCodes.code,
        name: chargeCodes.name,
        category: chargeCodes.category,
        glAccountCode: chargeCodes.glAccountCode,
        isActive: chargeCodes.isActive,
      })
      .from(chargeCodes)
      .where(
        and(
          eq(chargeCodes.tenantId, ctx.tenantId),
          or(isNull(chargeCodes.propertyId), eq(chargeCodes.propertyId, propertyId)),
        ),
      )
      .orderBy(asc(chargeCodes.category), asc(chargeCodes.code));
    return rows;
  }

  async createChargeType(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreateChargeTypeInput,
  ): Promise<ChargeType> {
    const ctx = getRequestContext();
    const code = upperCode(input.code);
    const [row] = await tx
      .insert(chargeCodes)
      .values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId,
        code,
        name: input.name.trim(),
        category: input.category.trim().toLowerCase(),
        glAccountCode: input.glAccountCode?.trim() || null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [chargeCodes.tenantId, chargeCodes.code],
        set: {
          propertyId,
          name: input.name.trim(),
          category: input.category.trim().toLowerCase(),
          glAccountCode: input.glAccountCode?.trim() || null,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: chargeCodes.id });

    helpers.emit({
      type: 'settings.charge_type_saved',
      aggregateType: 'charge_type',
      aggregateId: row!.id,
      propertyId,
      data: { chargeTypeId: row!.id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'charge_type',
      entityId: row!.id,
      after: { code, name: input.name, category: input.category },
      propertyId,
    });
    return this.chargeTypeById(tx, propertyId, row!.id);
  }

  async updateChargeType(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
    input: UpdateChargeTypeInput,
  ): Promise<ChargeType> {
    const current = await this.chargeTypeById(tx, propertyId, id);
    const code = input.code ? upperCode(input.code) : current.code;
    await tx
      .update(chargeCodes)
      .set({
        code,
        name: input.name?.trim() ?? current.name,
        category: input.category?.trim().toLowerCase() ?? current.category,
        glAccountCode:
          input.glAccountCode !== undefined
            ? input.glAccountCode.trim() || null
            : current.glAccountCode,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(chargeCodes.id, id));
    helpers.emit({
      type: 'settings.charge_type_saved',
      aggregateType: 'charge_type',
      aggregateId: id,
      propertyId,
      data: { chargeTypeId: id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'charge_type',
      entityId: id,
      before: current,
      after: { ...current, ...input, code },
      propertyId,
    });
    return this.chargeTypeById(tx, propertyId, id);
  }

  async removeChargeType(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
  ): Promise<{ id: string; removed: boolean }> {
    const current = await this.chargeTypeById(tx, propertyId, id);
    await tx
      .update(chargeCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(chargeCodes.id, id));
    helpers.emit({
      type: 'settings.charge_type_saved',
      aggregateType: 'charge_type',
      aggregateId: id,
      propertyId,
      data: { chargeTypeId: id, code: current.code, removed: true },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'charge_type',
      entityId: id,
      before: current,
      after: { ...current, isActive: false },
      propertyId,
    });
    return { id, removed: true };
  }

  async listPaymentMethods(tx: DbTransaction, propertyId: string): Promise<PaymentMethod[]> {
    const ctx = getRequestContext();
    const rows = await tx
      .select({
        id: paymentMethods.id,
        code: paymentMethods.code,
        name: paymentMethods.name,
        category: paymentMethods.category,
        sortOrder: paymentMethods.sortOrder,
        isActive: paymentMethods.isActive,
      })
      .from(paymentMethods)
      .where(
        and(eq(paymentMethods.tenantId, ctx.tenantId), eq(paymentMethods.propertyId, propertyId)),
      )
      .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.code));
    return rows;
  }

  async createPaymentMethod(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    input: CreatePaymentMethodInput,
  ): Promise<PaymentMethod> {
    const ctx = getRequestContext();
    const code = lowerCode(input.code);
    const [row] = await tx
      .insert(paymentMethods)
      .values({
        id: uuidv7(),
        tenantId: ctx.tenantId,
        propertyId,
        code,
        name: input.name.trim(),
        category: input.category.trim().toLowerCase(),
        sortOrder: input.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [paymentMethods.tenantId, paymentMethods.propertyId, paymentMethods.code],
        set: {
          name: input.name.trim(),
          category: input.category.trim().toLowerCase(),
          sortOrder: input.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: paymentMethods.id });

    helpers.emit({
      type: 'settings.payment_method_saved',
      aggregateType: 'payment_method',
      aggregateId: row!.id,
      propertyId,
      data: { paymentMethodId: row!.id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'payment_method',
      entityId: row!.id,
      after: { code, name: input.name },
      propertyId,
    });
    return this.paymentMethodById(tx, propertyId, row!.id);
  }

  async updatePaymentMethod(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
    input: UpdatePaymentMethodInput,
  ): Promise<PaymentMethod> {
    const current = await this.paymentMethodById(tx, propertyId, id);
    const code = input.code ? lowerCode(input.code) : current.code;
    await tx
      .update(paymentMethods)
      .set({
        code,
        name: input.name?.trim() ?? current.name,
        category: input.category?.trim().toLowerCase() ?? current.category,
        sortOrder: input.sortOrder ?? current.sortOrder,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, id));
    helpers.emit({
      type: 'settings.payment_method_saved',
      aggregateType: 'payment_method',
      aggregateId: id,
      propertyId,
      data: { paymentMethodId: id, code },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'payment_method',
      entityId: id,
      before: current,
      after: { ...current, ...input, code },
      propertyId,
    });
    return this.paymentMethodById(tx, propertyId, id);
  }

  async removePaymentMethod(
    tx: DbTransaction,
    helpers: UowHelpers,
    propertyId: string,
    id: string,
  ): Promise<{ id: string; removed: boolean }> {
    const current = await this.paymentMethodById(tx, propertyId, id);
    await tx
      .update(paymentMethods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id));
    helpers.emit({
      type: 'settings.payment_method_saved',
      aggregateType: 'payment_method',
      aggregateId: id,
      propertyId,
      data: { paymentMethodId: id, code: current.code, removed: true },
    });
    helpers.audit({
      action: 'property.settings.manage',
      entityType: 'payment_method',
      entityId: id,
      before: current,
      after: { ...current, isActive: false },
      propertyId,
    });
    return { id, removed: true };
  }

  private async floorById(tx: DbTransaction, propertyId: string, id: string): Promise<Floor> {
    const row = (await this.listFloors(tx, propertyId)).find((floor) => floor.id === id);
    if (!row) throw new NotFoundError('Floor');
    return row;
  }

  private async amenityById(
    tx: DbTransaction,
    propertyId: string,
    id: string,
  ): Promise<RoomAmenity> {
    const row = (await this.listAmenities(tx, propertyId)).find((amenity) => amenity.id === id);
    if (!row) throw new NotFoundError('Room amenity');
    return row;
  }

  private async roomTypeById(
    tx: DbTransaction,
    propertyId: string,
    id: string,
  ): Promise<RoomTypeSetting> {
    const row = (await this.listRoomTypes(tx, propertyId)).find((roomType) => roomType.id === id);
    if (!row) throw new NotFoundError('Room type');
    return row;
  }

  private async roomById(tx: DbTransaction, propertyId: string, id: string): Promise<RoomSetting> {
    const row = (await this.listRooms(tx, propertyId)).find((room) => room.id === id);
    if (!row) throw new NotFoundError('Room');
    return row;
  }

  private async chargeTypeById(
    tx: DbTransaction,
    propertyId: string,
    id: string,
  ): Promise<ChargeType> {
    const row = (await this.listChargeTypes(tx, propertyId)).find((charge) => charge.id === id);
    if (!row) throw new NotFoundError('Charge type');
    return row;
  }

  private async paymentMethodById(
    tx: DbTransaction,
    propertyId: string,
    id: string,
  ): Promise<PaymentMethod> {
    const row = (await this.listPaymentMethods(tx, propertyId)).find((method) => method.id === id);
    if (!row) throw new NotFoundError('Payment method');
    return row;
  }

  private async amenitiesForRooms(
    tx: DbTransaction,
    propertyId: string,
    roomIds: string[],
  ): Promise<Map<string, RoomAmenityTag[]>> {
    if (roomIds.length === 0) return new Map();
    const ctx = getRequestContext();
    const rows = await tx
      .select({
        roomId: roomAmenityAssignments.roomId,
        id: roomAmenities.id,
        code: roomAmenities.code,
        name: roomAmenities.name,
        category: roomAmenities.category,
      })
      .from(roomAmenityAssignments)
      .innerJoin(roomAmenities, eq(roomAmenities.id, roomAmenityAssignments.amenityId))
      .where(
        and(
          eq(roomAmenityAssignments.tenantId, ctx.tenantId),
          eq(roomAmenityAssignments.propertyId, propertyId),
          eq(roomAmenities.isActive, true),
          inArray(roomAmenityAssignments.roomId, roomIds),
        ),
      )
      .orderBy(asc(roomAmenities.code));

    const byRoom = new Map<string, RoomAmenityTag[]>();
    for (const row of rows) {
      const list = byRoom.get(row.roomId) ?? [];
      list.push({ id: row.id, code: row.code, name: row.name, category: row.category });
      byRoom.set(row.roomId, list);
    }
    return byRoom;
  }

  private async addPhysicalInventory(
    tx: DbTransaction,
    propertyId: string,
    roomTypeId: string,
    units: number,
  ): Promise<void> {
    const ctx = getRequestContext();
    const from = await this.businessDate.current(tx, propertyId);
    const to = addDays(from, 365);
    await tx.execute(sql`
      INSERT INTO availability_days (
        tenant_id,
        property_id,
        room_type_id,
        stay_date,
        physical,
        out_of_order,
        sold,
        blocked,
        overbook_limit
      )
      SELECT
        ${ctx.tenantId}::uuid,
        ${propertyId}::uuid,
        ${roomTypeId}::uuid,
        days.stay_date::date,
        ${units},
        0,
        0,
        0,
        0
      FROM generate_series(${from}::date, (${to}::date - interval '1 day'), interval '1 day') AS days(stay_date)
      ON CONFLICT (tenant_id, property_id, room_type_id, stay_date)
      DO UPDATE SET physical = availability_days.physical + ${units}
    `);
  }
}
