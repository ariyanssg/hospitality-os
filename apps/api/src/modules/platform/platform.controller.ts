import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  CreateHotelSchema,
  CreateHotelUserSchema,
  CreateSuperadminSchema,
  ResetPasswordSchema,
  SwitchContextSchema,
  UpdateHotelSchema,
  UpdatePlatformUserSchema,
  UpdateSuperadminSchema,
  type Hotel,
  type HotelDetail,
  type HotelUser,
  type PlatformDeleteResult,
  type PlatformRole,
  type Superadmin,
  type SwitchContextResult,
} from '@vela/contracts';
import { RequirePermission, UnauthenticatedError, ZodValidationPipe } from '../kernel';
import { PlatformService } from './platform.service';

/** Superadmin surface: hotel CRUD, hotel-user provisioning, platform-admin management, switching. */
@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  /* ─── Hotels ─── */

  @Get('hotels')
  @RequirePermission('platform.hotel.view')
  async listHotels(): Promise<Hotel[]> {
    return this.platform.listHotels();
  }

  @Post('hotels')
  @HttpCode(201)
  @RequirePermission('platform.hotel.create')
  async createHotel(
    @Body(new ZodValidationPipe(CreateHotelSchema)) body: typeof CreateHotelSchema._output,
  ): Promise<HotelDetail> {
    // Idempotency: the unique tenants.slug makes a replayed create a 409, not a duplicate hotel.
    return this.platform.createHotel(body);
  }

  @Get('hotels/:id')
  @RequirePermission('platform.hotel.view')
  async getHotel(@Param('id') id: string): Promise<HotelDetail> {
    return this.platform.getHotel(id);
  }

  @Patch('hotels/:id')
  @RequirePermission('platform.hotel.update')
  async updateHotel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateHotelSchema)) body: typeof UpdateHotelSchema._output,
  ): Promise<HotelDetail> {
    return this.platform.updateHotel(id, body);
  }

  @Post('hotels/:id/suspend')
  @RequirePermission('platform.hotel.suspend')
  async suspendHotel(@Param('id') id: string): Promise<HotelDetail> {
    return this.platform.setHotelStatus(id, 'suspended');
  }

  @Post('hotels/:id/reactivate')
  @RequirePermission('platform.hotel.suspend')
  async reactivateHotel(@Param('id') id: string): Promise<HotelDetail> {
    return this.platform.setHotelStatus(id, 'active');
  }

  /* ─── Hotel users ─── */

  @Get('hotels/:id/users')
  @RequirePermission('platform.user.view')
  async listHotelUsers(@Param('id') id: string): Promise<HotelUser[]> {
    return this.platform.listHotelUsers(id);
  }

  @Post('hotels/:id/users')
  @HttpCode(201)
  @RequirePermission('platform.user.create')
  async createHotelUser(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateHotelUserSchema)) body: typeof CreateHotelUserSchema._output,
  ): Promise<HotelUser> {
    return this.platform.createHotelUser(id, body);
  }

  @Patch('users/:userId')
  @RequirePermission('platform.user.update')
  async updateUser(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdatePlatformUserSchema))
    body: typeof UpdatePlatformUserSchema._output,
  ): Promise<{ userId: string }> {
    return this.platform.updateUser(userId, body);
  }

  @Post('users/:userId/password')
  @RequirePermission('platform.user.password.reset')
  async resetPassword(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(ResetPasswordSchema)) body: typeof ResetPasswordSchema._output,
  ): Promise<{ userId: string }> {
    return this.platform.resetPassword(userId, body.password);
  }

  /* ─── Superadmins ─── */

  @Get('roles')
  @RequirePermission('platform.role.manage')
  async listPlatformRoles(): Promise<PlatformRole[]> {
    return this.platform.listPlatformRoles();
  }

  @Get('superadmins')
  @RequirePermission('platform.superadmin.view')
  async listSuperadmins(): Promise<Superadmin[]> {
    return this.platform.listSuperadmins();
  }

  @Post('superadmins')
  @HttpCode(201)
  @RequirePermission('platform.superadmin.manage')
  async createSuperadmin(
    @Body(new ZodValidationPipe(CreateSuperadminSchema)) body: typeof CreateSuperadminSchema._output,
  ): Promise<Superadmin> {
    return this.platform.createSuperadmin(body);
  }

  @Patch('superadmins/:userId')
  @RequirePermission('platform.superadmin.manage')
  async updateSuperadmin(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateSuperadminSchema)) body: typeof UpdateSuperadminSchema._output,
  ): Promise<Superadmin> {
    return this.platform.updateSuperadmin(userId, body);
  }

  @Delete('superadmins/:userId')
  @RequirePermission('platform.superadmin.manage')
  async removeSuperadmin(@Param('userId') userId: string): Promise<PlatformDeleteResult> {
    return this.platform.removeSuperadmin(userId);
  }

  /* ─── Context switching (the Hotel Selector) ─── */

  @Post('context')
  @RequirePermission('platform.hotel.switch')
  async switchContext(
    @Headers('authorization') authorization: string | undefined,
    @Body(new ZodValidationPipe(SwitchContextSchema)) body: typeof SwitchContextSchema._output,
  ): Promise<SwitchContextResult> {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
    if (!token) throw new UnauthenticatedError();
    return this.platform.switchContext(token, body.tenantId);
  }
}
