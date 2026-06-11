import { Module } from '@nestjs/common';
import { GlModule } from '../gl';
import { FolioController, PaymentController } from './folio.controller';
import { FolioService } from './folio.service';

@Module({
  imports: [GlModule],
  controllers: [FolioController, PaymentController],
  providers: [FolioService],
  exports: [FolioService],
})
export class FolioModule {}
