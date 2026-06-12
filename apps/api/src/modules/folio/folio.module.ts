import { Module } from '@nestjs/common';
import { GlModule } from '../gl';
import {
  CashierController,
  DepositsController,
  FolioController,
  PaymentController,
} from './folio.controller';
import { FolioService } from './folio.service';
import { CashierService } from './cashier.service';

@Module({
  imports: [GlModule],
  controllers: [FolioController, CashierController, DepositsController, PaymentController],
  providers: [FolioService, CashierService],
  exports: [FolioService, CashierService],
})
export class FolioModule {}
