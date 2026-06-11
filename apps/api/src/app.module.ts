import { Module } from '@nestjs/common';
import { AvailabilityModule } from './modules/availability';
import { FolioModule } from './modules/folio';
import { GlModule } from './modules/gl';
import { KernelModule } from './modules/kernel';
import { RatesModule } from './modules/rates';
import { ReservationsModule } from './modules/reservations';

@Module({
  imports: [
    KernelModule,
    AvailabilityModule,
    RatesModule,
    GlModule,
    FolioModule,
    ReservationsModule,
  ],
})
export class AppModule {}
