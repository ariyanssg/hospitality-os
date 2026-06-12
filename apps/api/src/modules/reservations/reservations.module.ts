import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability';
import { RatesModule } from '../rates';
import { FolioModule } from '../folio';
import { GlModule } from '../gl';
import { HousekeepingModule } from '../housekeeping';
import {
  AvailabilityController,
  FrontDeskController,
  GroupBlocksController,
  NightAuditController,
  ReservationsController,
  WalkInController,
} from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { GroupBlocksService } from './group-blocks.service';

@Module({
  imports: [AvailabilityModule, RatesModule, FolioModule, GlModule, HousekeepingModule],
  controllers: [
    ReservationsController,
    WalkInController,
    GroupBlocksController,
    AvailabilityController,
    FrontDeskController,
    NightAuditController,
  ],
  providers: [ReservationsService, GroupBlocksService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
