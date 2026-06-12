import { Module } from '@nestjs/common';
import { RatesModule } from '../rates';
import { ReservationsModule } from '../reservations';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [RatesModule, ReservationsModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
