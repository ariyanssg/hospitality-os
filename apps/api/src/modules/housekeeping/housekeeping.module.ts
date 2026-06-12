import { Module } from '@nestjs/common';
import {
  HousekeepingController,
  MaintenanceController,
  RoomStatusController,
} from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';

@Module({
  controllers: [HousekeepingController, RoomStatusController, MaintenanceController],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
