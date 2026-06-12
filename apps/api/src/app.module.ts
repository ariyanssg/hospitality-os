import { Module } from '@nestjs/common';
import { AvailabilityModule } from './modules/availability';
import { BookingModule } from './modules/booking';
import { FolioModule } from './modules/folio';
import { GlModule } from './modules/gl';
import { GuestsModule } from './modules/guests';
import { HousekeepingModule } from './modules/housekeeping';
import { KernelModule } from './modules/kernel';
import { MessagingModule } from './modules/messaging';
import { PosModule } from './modules/pos';
import { RatesModule } from './modules/rates';
import { ReportsModule } from './modules/reports';
import { ReservationsModule } from './modules/reservations';

@Module({
  imports: [
    KernelModule,
    AvailabilityModule,
    RatesModule,
    GlModule,
    FolioModule,
    HousekeepingModule,
    ReservationsModule,
    PosModule,
    BookingModule,
    MessagingModule,
    ReportsModule,
    GuestsModule,
  ],
})
export class AppModule {}
