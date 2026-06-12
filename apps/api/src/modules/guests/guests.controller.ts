import { Body, Controller, Get, Headers, Param, Patch, Query } from '@nestjs/common';
import {
  GuestSearchQuerySchema,
  UpdateGuestSchema,
  type GuestSearchPage,
  type GuestProfile,
} from '@vela/contracts';
import { RequirePermission, UnitOfWork, ZodValidationPipe } from '../kernel';
import { GuestsService } from './guests.service';

@Controller('guests')
export class GuestsController {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly guests: GuestsService,
  ) {}

  @Get()
  @RequirePermission('guest.view')
  async search(
    @Query(new ZodValidationPipe(GuestSearchQuerySchema))
    query: typeof GuestSearchQuerySchema._output,
  ): Promise<GuestSearchPage> {
    return this.uow.read((tx) => this.guests.search(tx, query));
  }

  @Get(':id')
  @RequirePermission('guest.view')
  async get(@Param('id') id: string): Promise<GuestProfile> {
    return this.uow.read((tx) => this.guests.profile(tx, id));
  }

  @Patch(':id')
  @RequirePermission('guest.edit')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGuestSchema)) body: typeof UpdateGuestSchema._output,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<GuestProfile> {
    return this.uow.runIdempotent(idempotencyKey, { id, ...body }, async (tx, helpers) => {
      await this.guests.update(tx, helpers, id, body);
      return this.guests.profile(tx, id);
    });
  }
}
