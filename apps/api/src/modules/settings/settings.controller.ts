import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateChargeTypeSchema,
  CreateFloorSchema,
  CreatePaymentMethodSchema,
  CreateRoomAmenitySchema,
  CreateRoomSchema,
  CreateRoomTypeSettingSchema,
  UpdateChargeTypeSchema,
  UpdateFloorSchema,
  UpdatePaymentMethodSchema,
  UpdateRoomAmenitySchema,
  UpdateRoomSchema,
  UpdateRoomTypeSettingSchema,
  type ChargeType,
  type Floor,
  type PaymentMethod,
  type RoomAmenity,
  type RoomSetting,
  type RoomTypeSetting,
  type SettingsDeleteResult,
  type SettingsCatalog,
} from '@vela/contracts';
import {
  Ctx,
  RequirePermission,
  UnitOfWork,
  ValidationError,
  ZodValidationPipe,
  type RequestContext,
} from '../kernel';
import { SettingsService } from './settings.service';

function requireProperty(ctx: RequestContext): string {
  const propertyId = ctx.propertyIds[0];
  if (!propertyId) {
    throw new ValidationError('A property is required', [
      { field: 'X-Property-Id', code: 'REQUIRED' },
    ]);
  }
  return propertyId;
}

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly settings: SettingsService,
  ) {}

  @Get('catalog')
  @RequirePermission('reservation.view')
  async catalog(@Ctx() ctx: RequestContext): Promise<SettingsCatalog> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.settings.catalog(tx, propertyId));
  }

  @Get('floors')
  @RequirePermission('reservation.view')
  async floors(@Ctx() ctx: RequestContext): Promise<Floor[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.settings.listFloors(tx, propertyId));
  }

  @Post('floors')
  @HttpCode(201)
  @RequirePermission('property.settings.manage')
  async createFloor(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateFloorSchema)) body: typeof CreateFloorSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Floor> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, (tx, helpers) =>
      this.settings.createFloor(tx, helpers, propertyId, body),
    );
  }

  @Patch('floors/:id')
  @RequirePermission('property.settings.manage')
  async updateFloor(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFloorSchema)) body: typeof UpdateFloorSchema._output,
  ): Promise<Floor> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.updateFloor(tx, helpers, propertyId, id, body),
    );
  }

  @Delete('floors/:id')
  @RequirePermission('property.settings.manage')
  async removeFloor(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
  ): Promise<SettingsDeleteResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) => this.settings.removeFloor(tx, helpers, propertyId, id));
  }

  @Get('room-types')
  @RequirePermission('reservation.view')
  async roomTypes(@Ctx() ctx: RequestContext): Promise<RoomTypeSetting[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.settings.listRoomTypes(tx, propertyId));
  }

  @Post('room-types')
  @HttpCode(201)
  @RequirePermission('property.settings.manage')
  async createRoomType(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateRoomTypeSettingSchema))
    body: typeof CreateRoomTypeSettingSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<RoomTypeSetting> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, (tx, helpers) =>
      this.settings.createRoomType(tx, helpers, propertyId, body),
    );
  }

  @Patch('room-types/:id')
  @RequirePermission('property.settings.manage')
  async updateRoomType(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoomTypeSettingSchema))
    body: typeof UpdateRoomTypeSettingSchema._output,
  ): Promise<RoomTypeSetting> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.updateRoomType(tx, helpers, propertyId, id, body),
    );
  }

  @Delete('room-types/:id')
  @RequirePermission('property.settings.manage')
  async removeRoomType(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
  ): Promise<SettingsDeleteResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) => this.settings.removeRoomType(tx, helpers, propertyId, id));
  }

  @Get('amenities')
  @RequirePermission('reservation.view')
  async amenities(@Ctx() ctx: RequestContext): Promise<RoomAmenity[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.settings.listAmenities(tx, propertyId));
  }

  @Post('amenities')
  @HttpCode(201)
  @RequirePermission('property.settings.manage')
  async createAmenity(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateRoomAmenitySchema))
    body: typeof CreateRoomAmenitySchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<RoomAmenity> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, (tx, helpers) =>
      this.settings.createAmenity(tx, helpers, propertyId, body),
    );
  }

  @Patch('amenities/:id')
  @RequirePermission('property.settings.manage')
  async updateAmenity(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoomAmenitySchema))
    body: typeof UpdateRoomAmenitySchema._output,
  ): Promise<RoomAmenity> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.updateAmenity(tx, helpers, propertyId, id, body),
    );
  }

  @Delete('amenities/:id')
  @RequirePermission('property.settings.manage')
  async removeAmenity(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
  ): Promise<SettingsDeleteResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) => this.settings.removeAmenity(tx, helpers, propertyId, id));
  }

  @Get('rooms')
  @RequirePermission('reservation.view')
  async rooms(@Ctx() ctx: RequestContext): Promise<RoomSetting[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.settings.listRooms(tx, propertyId));
  }

  @Post('rooms')
  @HttpCode(201)
  @RequirePermission('property.settings.manage')
  async createRoom(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateRoomSchema)) body: typeof CreateRoomSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<RoomSetting> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, (tx, helpers) =>
      this.settings.createRoom(tx, helpers, propertyId, body),
    );
  }

  @Patch('rooms/:id')
  @RequirePermission('property.settings.manage')
  async updateRoom(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoomSchema)) body: typeof UpdateRoomSchema._output,
  ): Promise<RoomSetting> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.updateRoom(tx, helpers, propertyId, id, body),
    );
  }

  @Delete('rooms/:id')
  @RequirePermission('property.settings.manage')
  async removeRoom(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
  ): Promise<SettingsDeleteResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) => this.settings.removeRoom(tx, helpers, propertyId, id));
  }

  @Get('charge-types')
  @RequirePermission('reservation.view')
  async chargeTypes(@Ctx() ctx: RequestContext): Promise<ChargeType[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.settings.listChargeTypes(tx, propertyId));
  }

  @Post('charge-types')
  @HttpCode(201)
  @RequirePermission('property.settings.manage')
  async createChargeType(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreateChargeTypeSchema))
    body: typeof CreateChargeTypeSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ChargeType> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, (tx, helpers) =>
      this.settings.createChargeType(tx, helpers, propertyId, body),
    );
  }

  @Patch('charge-types/:id')
  @RequirePermission('property.settings.manage')
  async updateChargeType(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateChargeTypeSchema))
    body: typeof UpdateChargeTypeSchema._output,
  ): Promise<ChargeType> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.updateChargeType(tx, helpers, propertyId, id, body),
    );
  }

  @Delete('charge-types/:id')
  @RequirePermission('property.settings.manage')
  async removeChargeType(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
  ): Promise<SettingsDeleteResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.removeChargeType(tx, helpers, propertyId, id),
    );
  }

  @Get('payment-methods')
  @RequirePermission('reservation.view')
  async paymentMethods(@Ctx() ctx: RequestContext): Promise<PaymentMethod[]> {
    const propertyId = requireProperty(ctx);
    return this.uow.read((tx) => this.settings.listPaymentMethods(tx, propertyId));
  }

  @Post('payment-methods')
  @HttpCode(201)
  @RequirePermission('property.settings.manage')
  async createPaymentMethod(
    @Ctx() ctx: RequestContext,
    @Body(new ZodValidationPipe(CreatePaymentMethodSchema))
    body: typeof CreatePaymentMethodSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentMethod> {
    const propertyId = requireProperty(ctx);
    return this.uow.runIdempotent(idempotencyKey, { propertyId, ...body }, (tx, helpers) =>
      this.settings.createPaymentMethod(tx, helpers, propertyId, body),
    );
  }

  @Patch('payment-methods/:id')
  @RequirePermission('property.settings.manage')
  async updatePaymentMethod(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePaymentMethodSchema))
    body: typeof UpdatePaymentMethodSchema._output,
  ): Promise<PaymentMethod> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.updatePaymentMethod(tx, helpers, propertyId, id, body),
    );
  }

  @Delete('payment-methods/:id')
  @RequirePermission('property.settings.manage')
  async removePaymentMethod(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
  ): Promise<SettingsDeleteResult> {
    const propertyId = requireProperty(ctx);
    return this.uow.run((tx, helpers) =>
      this.settings.removePaymentMethod(tx, helpers, propertyId, id),
    );
  }
}
