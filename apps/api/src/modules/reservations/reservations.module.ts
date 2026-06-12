import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability';
import { RatesModule } from '../rates';
import { FolioModule } from '../folio';
import { GlModule } from '../gl';
import { HousekeepingModule } from '../housekeeping';
import {
  AvailabilityController,
  FrontDeskController,
  NightAuditController,
  ReservationsController,
  WalkInController,
} from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [AvailabilityModule, RatesModule, FolioModule, GlModule, HousekeepingModule],
  controllers: [
    ReservationsController,
    WalkInController,
    AvailabilityController,
    FrontDeskController,
    NightAuditController,
  ],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
